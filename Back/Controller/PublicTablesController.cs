using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Hubs;
using Back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Back.Controller
{
    [ApiController]
    [AllowAnonymous]
    public class PublicTablesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PublicTablesController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<AdminOrdersHub> _hubContext;
        private readonly PushNotificationService _pushService;

        public PublicTablesController(
            AppDbContext context,
            ILogger<PublicTablesController> logger,
            IConfiguration configuration,
            IHubContext<AdminOrdersHub> hubContext,
            PushNotificationService pushService)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _hubContext = hubContext;
            _pushService = pushService;
        }

        // GET /api/public/tables/{id} - Get table info with active session (no auth)
        [HttpGet("api/public/tables/{id}")]
        public async Task<ActionResult> GetPublicTableInfo(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                {
                    return NotFound(new { message = "Dine-in feature not enabled" });
                }

                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                    .FirstOrDefaultAsync(t => t.Id == id && t.IsActive);

                if (table == null)
                {
                    return NotFound(new { message = "Table not found" });
                }

                var session = table.Sessions.FirstOrDefault();

                return Ok(new
                {
                    tableId = table.Id,
                    tableName = table.Name,
                    capacity = table.Capacity,
                    status = table.Status.ToString(),
                    activeSessionId = session?.Id,
                    guestCount = session?.GuestCount,
                    customerName = session?.CustomerName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public table info for table {TableId}", id);
                return StatusCode(500, new { message = "Error getting table info" });
            }
        }

        // POST /api/public/tables/{tableId}/orders - Create order for active session (no auth)
        [HttpPost("api/public/tables/{tableId}/orders")]
        public async Task<ActionResult<OrderDto>> CreatePublicTableOrder(
            int tableId,
            [FromBody] CreateTableOrderDto dto)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                {
                    return NotFound(new { message = "Dine-in feature not enabled" });
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (dto.Items == null || !dto.Items.Any())
                {
                    return BadRequest(new { message = "Order must contain at least one item" });
                }

                // Look up the active session for this table
                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                    .FirstOrDefaultAsync(t => t.Id == tableId && t.IsActive);

                if (table == null)
                {
                    return NotFound(new { message = "Table not found" });
                }

                var session = table.Sessions.FirstOrDefault();
                if (session == null)
                {
                    return BadRequest(new { message = "No active session for this table. Ask a waiter to open the table." });
                }

                if (session.Status != TableSessionStatus.ACTIVE)
                {
                    return BadRequest(new { message = "Cannot create order in closed session" });
                }

                _logger.LogInformation("Creating public order for table {TableId} session {SessionId}", tableId, session.Id);

                // Validate and compute totals
                int subtotal = 0;
                var orderItems = new List<OrderItem>();

                foreach (var itemDto in dto.Items)
                {
                    var product = await _context.Products.FindAsync(itemDto.ProductId);
                    if (product == null)
                    {
                        return BadRequest(new { message = $"Product {itemDto.ProductId} not found" });
                    }

                    var itemTotal = product.PriceCents * itemDto.Qty;
                    subtotal += itemTotal;

                    orderItems.Add(new OrderItem
                    {
                        ProductId = itemDto.ProductId,
                        NameSnapshot = product.Name,
                        Qty = itemDto.Qty,
                        UnitPriceCents = product.PriceCents,
                        ModifiersTotalCents = 0,
                        LineTotalCents = itemTotal,
                        ModifiersSnapshot = itemDto.ModifiersSnapshot
                    });
                }

                var discountCents = Math.Min(dto.DiscountCents, subtotal);

                var order = new Order
                {
                    TableSessionId = session.Id,
                    BranchId = table.BranchId,
                    CustomerName = session.CustomerName ?? "Mesa " + table.Name,
                    Phone = "0000000000",
                    Channel = OrderChannel.DINE_IN,
                    TakeMode = "DINE_IN",
                    Note = dto.Note,
                    SubtotalCents = subtotal,
                    DiscountCents = discountCents,
                    TipCents = 0,
                    TotalCents = subtotal - discountCents,
                    Status = OrderStatus.CREATED,
                    CreatedBy = null,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    Items = orderItems
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Generate kitchen tickets grouped by station
                var kitchenTickets = await GenerateKitchenTickets(order, orderItems);

                _logger.LogInformation(
                    "Public order {OrderId} created for table {TableId} session {SessionId} with {TicketCount} kitchen tickets",
                    order.Id, tableId, session.Id, kitchenTickets.Count);

                // Notify via SignalR — TableOrderCreated para cocina/mesas
                await _hubContext.Clients.All.SendAsync("TableOrderCreated", new
                {
                    orderId = order.Id,
                    sessionId = session.Id,
                    tableId = table.Id,
                    tableName = table.Name
                });

                // OrderCreated al grupo de admins para que aparezca la alerta de pedido nuevo
                var adminEvent = new AdminOrderCreatedEventDto
                {
                    Id = order.Id,
                    BranchId = order.BranchId,
                    CustomerName = order.CustomerName,
                    Phone = order.Phone,
                    TakeMode = order.TakeMode,
                    TotalCents = order.TotalCents,
                    Status = order.Status.ToString(),
                    CreatedAt = order.CreatedAt
                };
                await _hubContext.Clients.Group(AdminOrdersHub.AdminsGroup).SendAsync("OrderCreated", adminEvent);

                var orderDto = new OrderDto
                {
                    Id = order.Id,
                    TableSessionId = order.TableSessionId,
                    BranchId = order.BranchId,
                    CustomerName = order.CustomerName,
                    Phone = order.Phone,
                    Channel = order.Channel,
                    TakeMode = order.TakeMode,
                    Note = order.Note,
                    SubtotalCents = order.SubtotalCents,
                    DiscountCents = order.DiscountCents,
                    TipCents = order.TipCents,
                    TotalCents = order.TotalCents,
                    Status = order.Status.ToString(),
                    CreatedAt = order.CreatedAt,
                    UpdatedAt = order.UpdatedAt,
                    Items = order.Items.Select(i => new OrderItemDto
                    {
                        Id = i.Id,
                        OrderId = i.OrderId,
                        ProductId = i.ProductId,
                        NameSnapshot = i.NameSnapshot,
                        Qty = i.Qty,
                        UnitPriceCents = i.UnitPriceCents,
                        ModifiersTotalCents = i.ModifiersTotalCents,
                        LineTotalCents = i.LineTotalCents,
                        ModifiersSnapshot = i.ModifiersSnapshot
                    }).ToList()
                };

                return Ok(orderDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating public order for table {TableId}", tableId);
                return StatusCode(500, new { message = "Error creating order" });
            }
        }

        private bool IsFeatureEnabled(string featureName)
        {
            var value = _configuration[$"Features:{featureName}"];
            if (string.IsNullOrWhiteSpace(value)) return true;
            return value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1";
        }

        private async Task<List<KitchenTicket>> GenerateKitchenTickets(Order order, List<OrderItem> orderItems)
        {
            var tickets = new List<KitchenTicket>();

            var productIds = orderItems.Select(oi => oi.ProductId).ToList();
            var products = await _context.Products
                .Include(p => p.Category)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            var itemsByStation = orderItems
                .Join(products, oi => oi.ProductId, p => p.Id, (oi, p) => new { OrderItem = oi, Product = p })
                .GroupBy(x => x.Product.Category?.DefaultStation ?? KitchenStation.KITCHEN)
                .ToList();

            foreach (var group in itemsByStation)
            {
                var station = group.Key;
                var ticketNumber = await GenerateTicketNumber(station);

                var itemsForTicket = group.Select(x => new
                {
                    x.OrderItem.ProductId,
                    x.OrderItem.NameSnapshot,
                    x.OrderItem.Qty,
                    x.OrderItem.ModifiersSnapshot
                }).ToList();

                var ticket = new KitchenTicket
                {
                    OrderId = order.Id,
                    Station = station,
                    Status = KitchenTicketStatus.PENDING,
                    TicketNumber = ticketNumber,
                    ItemsSnapshot = JsonSerializer.Serialize(itemsForTicket),
                    CreatedAt = DateTimeOffset.UtcNow
                };

                _context.KitchenTickets.Add(ticket);
                tickets.Add(ticket);
            }

            await _context.SaveChangesAsync();

            foreach (var ticket in tickets)
            {
                var ticketDto = new KitchenTicketDto
                {
                    Id = ticket.Id,
                    OrderId = ticket.OrderId,
                    Station = ticket.Station.ToString(),
                    Status = ticket.Status.ToString(),
                    TicketNumber = ticket.TicketNumber,
                    CreatedAt = ticket.CreatedAt,
                    ItemsSnapshot = ticket.ItemsSnapshot
                };

                await _hubContext.Clients.Group($"Kitchen_{ticket.Station}")
                    .SendAsync("NewKitchenTicket", ticketDto);

                var itemCount = JsonSerializer.Deserialize<List<object>>(ticket.ItemsSnapshot)?.Count ?? 0;
                _ = _pushService.SendToKitchenAsync(
                    ticket.Station.ToString(),
                    "Nueva comanda",
                    $"Mesa {order.CustomerName}: {itemCount} item(s)",
                    "/admin/kitchen");
            }

            return tickets;
        }

        private async Task<string> GenerateTicketNumber(KitchenStation station)
        {
            var prefix = station switch
            {
                KitchenStation.KITCHEN => "K",
                KitchenStation.BAR => "B",
                KitchenStation.GRILL => "G",
                KitchenStation.DESSERTS => "D",
                _ => "X"
            };

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var count = await _context.KitchenTickets
                .Where(t => t.Station == station && t.CreatedAt.Date == today.ToDateTime(TimeOnly.MinValue))
                .CountAsync();

            return $"{prefix}{(count + 1):D3}";
        }
    }
}
