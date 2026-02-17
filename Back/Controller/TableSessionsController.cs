using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

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
        [HttpPost("api/admin/table-sessions/{id}/orders")]
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
                    DiscountCents = 0,
                    TipCents = 0,
                    TotalCents = subtotal,
                    Status = OrderStatus.CREATED,
                    CreatedBy = userId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    Items = orderItems
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Order {OrderId} created for session {SessionId}", order.Id, id);

                // Notify via SignalR
                await _hubContext.Clients.All.SendAsync("TableOrderCreated", new
                {
                    orderId = order.Id,
                    sessionId = id,
                    tableId = session.TableId,
                    tableName = session.Table.Name
                });

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

        private bool IsFeatureEnabled(string featureName)
        {
            var value = _configuration[$"Features:{featureName}"];
            return !string.IsNullOrWhiteSpace(value) &&
                   (value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1");
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}
