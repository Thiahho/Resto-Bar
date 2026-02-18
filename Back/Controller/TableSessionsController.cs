using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Back.Controller
{
    [ApiController]
    [Authorize]
    public class TableSessionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TableSessionsController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<AdminOrdersHub> _hubContext;

        public TableSessionsController(
            AppDbContext context,
            ILogger<TableSessionsController> logger,
            IConfiguration configuration,
            IHubContext<AdminOrdersHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _hubContext = hubContext;
        }

        // GET /api/admin/table-sessions - List sessions with daily summary
        [HttpGet("api/admin/table-sessions")]
        public async Task<ActionResult<SessionsDailySummaryDto>> GetTableSessions(
            [FromQuery] string? date,
            [FromQuery] string? status)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                // Resolve date — default to today (local time)
                DateOnly targetDate;
                if (!DateOnly.TryParse(date, out targetDate))
                    targetDate = DateOnly.FromDateTime(DateTime.Now);

                // Build UTC range from local midnight boundaries
                // DateTime(Local) → ToUniversalTime() = UTC, which Npgsql accepts for timestamptz
                var localMidnight = new DateTime(targetDate.Year, targetDate.Month, targetDate.Day,
                    0, 0, 0, DateTimeKind.Local);
                var dayStartUtc = localMidnight.ToUniversalTime();  // Kind=Utc
                var dayEndUtc   = dayStartUtc.AddDays(1);

                // Filter by ClosedAt (when payment was collected) — more relevant for Caja view
                var sessions = await _context.TableSessions
                    .Include(s => s.Table)
                    .Include(s => s.OpenedByUser)
                    .Include(s => s.ClosedByUser)
                    .Include(s => s.Orders)
                    .Where(s => s.Status == TableSessionStatus.CLOSED
                                && s.ClosedAt != null
                                && s.ClosedAt >= dayStartUtc
                                && s.ClosedAt < dayEndUtc)
                    .OrderByDescending(s => s.ClosedAt)
                    .ToListAsync();

                var items = sessions.Select(s => new TableSessionListItemDto
                {
                    Id = s.Id,
                    TableId = s.TableId,
                    TableName = s.Table?.Name,
                    CustomerName = s.CustomerName,
                    GuestCount = s.GuestCount,
                    OpenedAt = s.OpenedAt,
                    ClosedAt = s.ClosedAt,
                    Status = s.Status.ToString(),
                    OpenedByUserName = s.OpenedByUser?.Usuario,
                    ClosedByUserName = s.ClosedByUser?.Usuario,
                    SubtotalCents = s.SubtotalCents,
                    TipCents = s.TipCents,
                    TotalCents = s.TotalCents,
                    PaymentMethod = s.PaymentMethod,
                    PaidAt = s.PaidAt,
                    Notes = s.Notes,
                    OrderCount = s.Orders.Count
                }).ToList();

                var result = new SessionsDailySummaryDto
                {
                    Date = targetDate.ToString("yyyy-MM-dd"),
                    Sessions = items,
                    SessionCount = items.Count,
                    TotalByCash = items.Where(s => s.PaymentMethod == "CASH").Sum(s => s.TotalCents),
                    TotalByCard = items.Where(s => s.PaymentMethod == "CARD").Sum(s => s.TotalCents),
                    TotalByTransfer = items.Where(s => s.PaymentMethod == "TRANSFER").Sum(s => s.TotalCents),
                    TotalTips = items.Sum(s => s.TipCents),
                    GrandTotal = items.Sum(s => s.TotalCents)
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing table sessions");
                return StatusCode(500, new { message = "Error listing sessions" });
            }
        }

        // GET /api/admin/table-sessions/{id} - Get session details
        [HttpGet("api/admin/table-sessions/{id}")]
        public async Task<ActionResult<TableSessionDto>> GetTableSession(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                {
                    return NotFound(new { message = "Dine-in feature not enabled" });
                }

                _logger.LogInformation("Getting session {SessionId}", id);

                var session = await _context.TableSessions
                    .Include(s => s.Table)
                    .Include(s => s.Orders)
                    .ThenInclude(o => o.Items)
                    .Include(s => s.OpenedByUser)
                    .Include(s => s.ClosedByUser)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (session == null)
                {
                    return NotFound(new { message = "Session not found" });
                }

                var sessionDto = new TableSessionDto
                {
                    Id = session.Id,
                    TableId = session.TableId,
                    TableName = session.Table.Name,
                    CustomerName = session.CustomerName,
                    GuestCount = session.GuestCount,
                    OpenedAt = session.OpenedAt,
                    ClosedAt = session.ClosedAt,
                    Status = session.Status.ToString(),
                    OpenedByUserId = session.OpenedByUserId,
                    OpenedByUserName = session.OpenedByUser?.Usuario,
                    ClosedByUserId = session.ClosedByUserId,
                    ClosedByUserName = session.ClosedByUser?.Usuario,
                    SubtotalCents = session.SubtotalCents,
                    TotalCents = session.TotalCents,
                    TipCents = session.TipCents,
                    PaymentMethod = session.PaymentMethod,
                    PaidAt = session.PaidAt,
                    Notes = session.Notes,
                    Orders = session.Orders.Select(o => new OrderDto
                    {
                        Id = o.Id,
                        TableSessionId = o.TableSessionId,
                        CustomerName = o.CustomerName,
                        Phone = o.Phone,
                        Channel = o.Channel,
                        TakeMode = o.TakeMode,
                        Note = o.Note,
                        SubtotalCents = o.SubtotalCents,
                        DiscountCents = o.DiscountCents,
                        TipCents = o.TipCents,
                        TotalCents = o.TotalCents,
                        Status = o.Status.ToString(),
                        CreatedAt = o.CreatedAt,
                        UpdatedAt = o.UpdatedAt,
                        Items = o.Items.Select(i => new OrderItemDto
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
                    }).ToList()
                };

                return Ok(sessionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting session");
                return StatusCode(500, new { message = "Error getting session" });
            }
        }

        // POST /api/admin/table-sessions/{id}/orders - Create order in session
        // Acepta tokens de admin o tokens QR de mesa (scope: table_order)
        [HttpPost("api/admin/table-sessions/{id}/orders")]
        [Authorize(Policy = "AdminOrTableOrder")]
        public async Task<ActionResult<OrderDto>> CreateTableOrder(int id, [FromBody] CreateTableOrderDto dto)
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

                // Si el token es de mesa (scope: table_order), validar que el sessionId del claim coincida
                var scope = User.FindFirst("scope")?.Value;
                if (scope == "table_order")
                {
                    var tokenSessionId = User.FindFirst("sessionId")?.Value;
                    if (tokenSessionId == null || tokenSessionId != id.ToString())
                    {
                        return Forbid();
                    }
                }

                _logger.LogInformation("Creating order for session {SessionId}", id);

                var session = await _context.TableSessions
                    .Include(s => s.Table)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (session == null)
                {
                    return NotFound(new { message = "Session not found" });
                }

                if (session.Status != TableSessionStatus.ACTIVE)
                {
                    return BadRequest(new { message = "Cannot create order in closed session" });
                }

                var userId = GetUserId();

                // Calculate totals
                int subtotal = 0;
                var orderItems = new List<OrderItem>();

                foreach (var itemDto in dto.Items)
                {
                    var product = await _context.Products.FindAsync(itemDto.ProductId);
                    if (product == null)
                    {
                        return BadRequest(new { message = $"Product {itemDto.ProductId} not found" });
                    }

                    // Admin endpoint trusts unitPriceCents/lineTotalCents from the client
                    // (allows double price, modifier surcharges). Falls back to DB price.
                    var unitPrice = itemDto.UnitPriceCents > 0 ? itemDto.UnitPriceCents : product.PriceCents;
                    var itemTotal = itemDto.LineTotalCents > 0 ? itemDto.LineTotalCents : unitPrice * itemDto.Qty;
                    subtotal += itemTotal;

                    orderItems.Add(new OrderItem
                    {
                        ProductId = itemDto.ProductId,
                        NameSnapshot = itemDto.NameSnapshot ?? product.Name,
                        Qty = itemDto.Qty,
                        UnitPriceCents = unitPrice,
                        ModifiersTotalCents = itemDto.ModifiersTotalCents,
                        LineTotalCents = itemTotal,
                        ModifiersSnapshot = itemDto.ModifiersSnapshot
                    });
                }

                // Clamp discount so it never exceeds the subtotal
                var discountCents = Math.Min(dto.DiscountCents, subtotal);

                var order = new Order
                {
                    TableSessionId = id,
                    BranchId = session.Table.BranchId,
                    CustomerName = session.CustomerName ?? "Mesa " + session.Table.Name,
                    Phone = "0000000000", // Not required for dine-in
                    Channel = OrderChannel.DINE_IN,
                    TakeMode = "DINE_IN",
                    Note = dto.Note,
                    SubtotalCents = subtotal,
                    DiscountCents = discountCents,
                    TipCents = 0,
                    TotalCents = subtotal - discountCents,
                    Status = OrderStatus.CREATED,
                    CreatedBy = userId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    Items = orderItems
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Generate KitchenTickets grouped by station
                var kitchenTickets = await GenerateKitchenTickets(order, orderItems);

                _logger.LogInformation("Order {OrderId} created for session {SessionId} with {TicketCount} kitchen tickets",
                    order.Id, id, kitchenTickets.Count);

                // Notify via SignalR
                await _hubContext.Clients.All.SendAsync("TableOrderCreated", new
                {
                    orderId = order.Id,
                    sessionId = id,
                    tableId = session.TableId,
                    tableName = session.Table.Name
                });

                // OrderCreated al grupo de admins para la alerta de pedido nuevo
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

                return CreatedAtAction("GetOrder", "Orders", new { id = order.Id }, orderDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating order for session");
                return StatusCode(500, new { message = "Error creating order" });
            }
        }

        // POST /api/admin/table-sessions/{id}/close - Close session by session ID
        [HttpPost("api/admin/table-sessions/{id}/close")]
        public async Task<ActionResult<TableSessionDto>> CloseSession(int id, [FromBody] CloseTableSessionDto dto)
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

                _logger.LogInformation("Closing session {SessionId} with payment method {PaymentMethod}", id, dto.PaymentMethod);

                var session = await _context.TableSessions
                    .Include(s => s.Table)
                    .Include(s => s.Orders)
                    .ThenInclude(o => o.Items)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (session == null)
                {
                    return NotFound(new { message = "Session not found" });
                }

                if (session.Status == TableSessionStatus.CLOSED)
                {
                    return BadRequest(new { message = "Session is already closed" });
                }

                var userId = GetUserId();

                // Calculate totals from all orders in the session, add tip
                var subtotal = session.Orders.Sum(o => o.SubtotalCents);
                var ordersTotal = session.Orders.Sum(o => o.TotalCents);
                var tipCents = dto.TipCents;
                var total = ordersTotal + tipCents;

                session.SubtotalCents = subtotal;
                session.TotalCents = total;
                session.TipCents = tipCents;
                session.PaymentMethod = dto.PaymentMethod;
                session.PaidAt = DateTimeOffset.UtcNow;
                session.ClosedAt = DateTimeOffset.UtcNow;
                session.ClosedByUserId = userId;
                session.Status = TableSessionStatus.CLOSED;
                if (dto.Notes != null)
                {
                    session.Notes = dto.Notes;
                }

                // Update table status
                session.Table.Status = TableStatus.AVAILABLE;
                session.Table.UpdatedAt = DateTimeOffset.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Session {SessionId} closed. Total: {Total}, PaymentMethod: {PaymentMethod}, Tip: {Tip}",
                    id, total, dto.PaymentMethod, tipCents);

                // Notify via SignalR
                await _hubContext.Clients.All.SendAsync("TableSessionClosed", new
                {
                    sessionId = session.Id,
                    tableId = session.TableId,
                    tableName = session.Table.Name,
                    totalCents = total,
                    paymentMethod = dto.PaymentMethod
                });

                var sessionDto = new TableSessionDto
                {
                    Id = session.Id,
                    TableId = session.TableId,
                    TableName = session.Table.Name,
                    CustomerName = session.CustomerName,
                    GuestCount = session.GuestCount,
                    OpenedAt = session.OpenedAt,
                    ClosedAt = session.ClosedAt,
                    Status = session.Status.ToString(),
                    OpenedByUserId = session.OpenedByUserId,
                    ClosedByUserId = session.ClosedByUserId,
                    SubtotalCents = session.SubtotalCents,
                    TotalCents = session.TotalCents,
                    TipCents = session.TipCents,
                    PaymentMethod = session.PaymentMethod,
                    PaidAt = session.PaidAt,
                    Notes = session.Notes
                };

                return Ok(sessionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing session {SessionId}", id);
                return StatusCode(500, new { message = "Error closing session" });
            }
        }

        private bool IsFeatureEnabled(string featureName)
        {
            var value = _configuration[$"Features:{featureName}"];
            if (string.IsNullOrWhiteSpace(value)) return true;
            return value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1";
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private async Task<List<KitchenTicket>> GenerateKitchenTickets(Order order, List<OrderItem> orderItems)
        {
            var tickets = new List<KitchenTicket>();

            // Get all product IDs from order items
            var productIds = orderItems.Select(oi => oi.ProductId).ToList();

            // Load products with their categories
            var products = await _context.Products
                .Include(p => p.Category)
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            // Group items by station (based on Category.DefaultStation)
            var itemsByStation = orderItems
                .Join(products, oi => oi.ProductId, p => p.Id, (oi, p) => new { OrderItem = oi, Product = p })
                .GroupBy(x => x.Product.Category?.DefaultStation ?? KitchenStation.KITCHEN)
                .ToList();

            // Create a KitchenTicket for each station
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

            // Emit SignalR events for each station
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
            }

            return tickets;
        }

        private async Task<string> GenerateTicketNumber(KitchenStation station)
        {
            // Prefix mapping for each station
            var prefix = station switch
            {
                KitchenStation.KITCHEN => "K",
                KitchenStation.BAR => "B",
                KitchenStation.GRILL => "G",
                KitchenStation.DESSERTS => "D",
                _ => "X"
            };

            // Count tickets for today at this station
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var count = await _context.KitchenTickets
                .Where(t => t.Station == station && t.CreatedAt.Date == today.ToDateTime(TimeOnly.MinValue))
                .CountAsync();

            // Format: {PREFIX}{SEQUENTIAL} - Example: K001, B002, G003
            return $"{prefix}{(count + 1):D3}";
        }
    }
}
