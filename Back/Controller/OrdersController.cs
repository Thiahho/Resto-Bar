using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.SignalR;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Back.Hubs;

namespace Back.Controller
{
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<OrdersController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<AdminOrdersHub> _hubContext;

        public OrdersController(AppDbContext context, ILogger<OrdersController> logger, IConfiguration configuration, IHubContext<AdminOrdersHub> adminOrdersHub)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _hubContext= adminOrdersHub;
        }

        // POST /api/orders - Crear nueva orden (público)
        [HttpPost("api/orders")]
        public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] OrderDto orderDto)
        {
            try
            {
                _logger.LogInformation("Recibiendo orden de {CustomerName}", orderDto?.CustomerName);

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("ModelState inválido");
                    return BadRequest(ModelState);
                }

                // Validar que tenga items
                if (orderDto.Items == null || !orderDto.Items.Any())
                {
                    _logger.LogWarning("Orden sin items");
                    return BadRequest("Order must contain at least one item");
                }

                // Validar horario programado
                if (orderDto.ScheduledAt.HasValue)
                {
                    // Usar la hora tal como la envió el cliente (con su offset original)
                    // NO usar ToLocalTime() porque convertiría a la zona horaria del servidor (UTC en Render)
                    var scheduledValue = orderDto.ScheduledAt.Value;

                    _logger.LogInformation("ScheduledAt recibido: {Value}, Offset: {Offset}, DateTime: {DateTime}",
                        scheduledValue,
                        scheduledValue.Offset,
                        scheduledValue.DateTime);

                    // Extraer la hora del cliente (DateTime tiene la hora en la zona del cliente)
                    var scheduledTime = scheduledValue.DateTime.TimeOfDay;
                    var openTime = new TimeSpan(10, 0, 0);
                    var closeTime = new TimeSpan(23, 0, 0);

                    _logger.LogInformation("Hora del cliente: {Time}, Rango: {Open} - {Close}",
                        scheduledTime, openTime, closeTime);

                    if (scheduledTime < openTime || scheduledTime >= closeTime)
                    {
                        _logger.LogWarning("Hora fuera del rango permitido: {Time}", scheduledTime);
                        return BadRequest(new { message = "El horario de entrega es de 10:00 a 23:00" });
                    }

                    // Validar que sea en el futuro (comparar en UTC para ser consistente)
                    var nowUtc = DateTimeOffset.UtcNow;
                    if (scheduledValue.ToUniversalTime() <= nowUtc)
                    {
                        _logger.LogWarning("ScheduledAt debe ser en el futuro");
                        return BadRequest(new { message = "La hora programada debe ser posterior a la hora actual" });
                    }

                    _logger.LogInformation("Orden programada para: {ScheduledAt}", scheduledValue);
                }

                _logger.LogInformation("Creando orden con {ItemCount} items", orderDto.Items.Count);

                var publicCode = await GeneratePublicCodeAsync();

                // Crear la orden
                var order = new Order
                {
                    BranchId = orderDto.BranchId,
                    CustomerName = orderDto.CustomerName,
                    Phone = orderDto.Phone,
                    Channel = orderDto.Channel,
                    TakeMode = orderDto.TakeMode,
                    Address = orderDto.Address,
                    Reference = orderDto.Reference,
                    ScheduledAt = orderDto.ScheduledAt?.ToUniversalTime(),
                    Note = orderDto.Note,
                    PublicCode = publicCode,
                    SubtotalCents = orderDto.SubtotalCents,
                    DiscountCents = orderDto.DiscountCents,
                    TipCents = orderDto.TipCents,
                    TotalCents = orderDto.TotalCents,
                    Status = OrderStatus.CREATED,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = OrderStatus.CREATED,
                    ChangedAt = DateTimeOffset.UtcNow
                });

                // Agregar los items
                foreach (var itemDto in orderDto.Items)
                {
                    _logger.LogInformation("Item: {Name}, ModifiersSnapshot: {Snapshot}",
                        itemDto.NameSnapshot,
                        itemDto.ModifiersSnapshot ?? "NULL");

                    order.Items.Add(new OrderItem
                    {
                        ProductId = itemDto.ProductId,
                        NameSnapshot = itemDto.NameSnapshot,
                        Qty = itemDto.Qty,
                        UnitPriceCents = itemDto.UnitPriceCents,
                        ModifiersTotalCents = itemDto.ModifiersTotalCents,
                        LineTotalCents = itemDto.LineTotalCents,
                        ModifiersSnapshot = itemDto.ModifiersSnapshot
                    });
                }

                _context.Orders.Add(order);
                _logger.LogInformation("Guardando orden...");
                var affectedRows = await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChanges completado. Filas afectadas: {AffectedRows}, Orden ID: {OrderId}", affectedRows, order.Id);

                // Verificar inmediatamente que se guardó
                var verificacion = await _context.Orders.CountAsync();
                _logger.LogInformation("Total de órdenes en BD: {TotalOrders}", verificacion);

                // Recargar con los items para devolver
                var createdOrder = await _context.Orders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.Id == order.Id);

                if (createdOrder == null)
                {
                    _logger.LogError("ADVERTENCIA: No se pudo recargar la orden con ID {OrderId}", order.Id);
                }

                var responseDto = MapOrderToDto(createdOrder!, BuildTrackingUrl(createdOrder!));

                var orderCreatedEvent = new AdminOrderCreatedEventDto
                {
                    Id = responseDto.Id,
                    BranchId = responseDto.BranchId,
                    CustomerName = responseDto.CustomerName,
                    Phone = responseDto.Phone,
                    TakeMode = responseDto.TakeMode,
                    TotalCents = responseDto.TotalCents,
                    Status = responseDto.Status,
                    CreatedAt = responseDto.CreatedAt
                };

                await _hubContext.Clients.Group(AdminOrdersHub.AdminsGroup).SendAsync("OrderCreated", orderCreatedEvent);
                if (orderCreatedEvent.BranchId.HasValue)
                {
                    await _hubContext.Clients.Group(AdminOrdersHub.BranchGroup(orderCreatedEvent.BranchId.Value)).SendAsync("OrderCreatedByBranch", orderCreatedEvent);
                }

                return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, responseDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear orden: {Message}", ex.Message);
                return StatusCode(500, new { error = "Error al crear la orden", details = ex.Message });
            }
        }

        // GET /api/admin/orders - Listar todas las órdenes (admin)
        [Authorize]
        [HttpGet("api/admin/orders")]
        public async Task<ActionResult<List<OrderDto>>> GetAllOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.StatusHistory)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            // Obtener cupones usados por orden
            var orderIds = orders.Select(o => o.Id).ToList();
            var redemptions = await _context.CouponRedemptions
                .Include(r => r.Coupon)
                .Where(r => orderIds.Contains(r.OrderId))
                .ToDictionaryAsync(r => r.OrderId, r => r.Coupon);

            var baseUrl = BuildTrackingBaseUrl();
            var ordersDto = orders.Select(order => {
                var dto = MapOrderToDto(order, BuildTrackingUrl(order, baseUrl));
                if (redemptions.TryGetValue(order.Id, out var coupon) && coupon != null)
                {
                    dto.CouponCode = coupon.Code;
                    dto.CouponType = coupon.Type;
                    dto.CouponValue = coupon.Value;
                }
                return dto;
            }).ToList();
            return Ok(ordersDto);
        }

        // GET /api/admin/orders/{id} - Ver detalle de orden (admin)
        [Authorize]
        [HttpGet("api/admin/orders/{id}")]
        public async Task<ActionResult<OrderDto>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.StatusHistory)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                return NotFound();
            }

            return Ok(MapOrderToDto(order, BuildTrackingUrl(order)));
        }

        // PUT /api/admin/orders/{id}/status - Cambiar estado de orden (admin)
        [Authorize]
        [HttpPut("api/admin/orders/{id}/status")]
        public async Task<ActionResult<OrderDto>> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            try
            {
                _logger.LogInformation("Actualizando estado de orden {OrderId} a {Status}", id, dto.Status);

                var order = await _context.Orders
                    .Include(o => o.Items)
                    .Include(o => o.StatusHistory)
                    .FirstOrDefaultAsync(o => o.Id == id);

                if (order == null)
                {
                    _logger.LogWarning("Orden {OrderId} no encontrada", id);
                    return NotFound();
                }

                // Validar que el estado sea válido
                if (!Enum.TryParse<OrderStatus>(dto.Status, out var newStatus))
                {
                    _logger.LogWarning("Estado inválido: {Status}", dto.Status);
                    return BadRequest("Invalid status");
                }

                // Validar reglas de transición de estados
                if (order.Status == OrderStatus.CANCELLED)
                {
                    _logger.LogWarning("No se puede modificar una orden cancelada");
                    return BadRequest(new { message = "No se puede modificar una orden cancelada" });
                }

                if (order.Status == OrderStatus.DELIVERED)
                {
                    _logger.LogWarning("No se puede modificar una orden entregada");
                    return BadRequest(new { message = "No se puede modificar una orden ya entregada" });
                }

                // Generar PublicCode si no existe (para órdenes antiguas)
                if (string.IsNullOrWhiteSpace(order.PublicCode))
                {
                    order.PublicCode = await GeneratePublicCodeAsync();
                    _logger.LogInformation("PublicCode generado para orden {OrderId}: {PublicCode}", id, order.PublicCode);
                }

                _logger.LogInformation("Estado parseado correctamente: {NewStatus}", newStatus);
                order.Status = newStatus;
                order.UpdatedAt = DateTimeOffset.UtcNow;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = newStatus,
                    ChangedAt = DateTimeOffset.UtcNow,
                    ChangedByUserId = GetUserId()
                });

                _logger.LogInformation("Guardando cambios...");
                await _context.SaveChangesAsync();
                _logger.LogInformation("Estado actualizado exitosamente");

                // Retornar la orden actualizada con trackingUrl
                return Ok(MapOrderToDto(order, BuildTrackingUrl(order)));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar estado de orden {OrderId}: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "Error al actualizar el estado", details = ex.Message });
            }
        }

        // DELETE /api/admin/orders/{id} - Eliminar orden (admin)
        [Authorize]
        [HttpDelete("api/admin/orders/{id}")]
        public async Task<ActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return NotFound();
            }

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/tracking/{publicCode}?t=... - Tracking público
        [HttpGet("api/tracking/{publicCode}")]
        public async Task<ActionResult<OrderTrackingDto>> GetTracking(string publicCode, [FromQuery] string t)
        {
            if (string.IsNullOrWhiteSpace(t))
            {
                return BadRequest(new { message = "Token requerido" });
            }

            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.StatusHistory)
                .FirstOrDefaultAsync(o => o.PublicCode == publicCode);

            if (order == null)
            {
                return NotFound();
            }

            if (!ValidateTrackingToken(t, order.Id, order.PublicCode))
            {
                return Unauthorized(new { message = "Token inválido o expirado" });
            }

            var trackingDto = new OrderTrackingDto
            {
                OrderId = order.Id,
                PublicCode = order.PublicCode,
                Status = order.Status.ToString(),
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                TakeMode = order.TakeMode,
                Address = order.Address,
                Reference = order.Reference,
                ScheduledAt = order.ScheduledAt,
                Note = order.Note,
                SubtotalCents = order.SubtotalCents,
                DiscountCents = order.DiscountCents,
                TipCents = order.TipCents,
                TotalCents = order.TotalCents,
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
                }).ToList(),
                History = order.StatusHistory
                    .OrderBy(h => h.ChangedAt)
                    .Select(h => new OrderTrackingHistoryDto
                    {
                        Status = h.Status.ToString(),
                        ChangedAt = h.ChangedAt
                    })
                    .ToList()
            };

            return Ok(trackingDto);
        }

        // Helper method para mapear Order a OrderDto
        private OrderDto MapOrderToDto(Order order, string? trackingUrl = null)
        {
            return new OrderDto
            {
                Id = order.Id,
                BranchId = order.BranchId,
                CustomerName = order.CustomerName,
                Phone = order.Phone,
                Channel = order.Channel,
                TakeMode = order.TakeMode,
                Address = order.Address,
                Reference = order.Reference,
                ScheduledAt = order.ScheduledAt,
                Note = order.Note,
                PublicCode = order.PublicCode,
                TrackingUrl = trackingUrl,
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
        }

        private string? BuildTrackingUrl(Order order, string? baseUrlOverride = null)
        {
            if (string.IsNullOrWhiteSpace(order.PublicCode))
            {
                return null;
            }
            var baseUrl = baseUrlOverride ?? BuildTrackingBaseUrl();
            var token = GenerateTrackingToken(order);
            return $"{baseUrl}/#/pedido/{order.PublicCode}?t={token}";
        }

        private string BuildTrackingBaseUrl()
        {
            // Usar la URL del frontend configurada, o fallback a Request.Host
            var frontendUrl = _configuration["Frontend:BaseUrl"];
            if (!string.IsNullOrWhiteSpace(frontendUrl))
            {
                return frontendUrl.TrimEnd('/');
            }
            return $"{Request.Scheme}://{Request.Host}";
        }

        private string GenerateTrackingToken(Order order)
        {
            if (string.IsNullOrWhiteSpace(order.PublicCode))
            {
                throw new InvalidOperationException("La orden no tiene código público para tracking.");
            }
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var issuer = _configuration["Jwt:Issuer"];

            var claims = new[]
            {
                new Claim("orderId", order.Id.ToString()),
                new Claim("publicCode", order.PublicCode),
                new Claim("scope", "tracking")
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: "OrderTracking",
                claims: claims,
                expires: DateTime.UtcNow.AddDays(3),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private bool ValidateTrackingToken(string token, int orderId, string publicCode)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));

            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = securityKey,
                    ValidateIssuer = false,
                    ValidateAudience = true,
                    ValidAudience = "OrderTracking",
                    ClockSkew = TimeSpan.FromMinutes(1)
                }, out _);

                var orderIdClaim = principal.FindFirst("orderId")?.Value;
                var publicCodeClaim = principal.FindFirst("publicCode")?.Value;
                var scopeClaim = principal.FindFirst("scope")?.Value;

                return scopeClaim == "tracking"
                       && orderIdClaim == orderId.ToString()
                       && publicCodeClaim == publicCode;
            }
            catch
            {
                return false;
            }
        }

        private async Task<string> GeneratePublicCodeAsync()
        {
            const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var length = 6;

            while (true)
            {
                var bytes = RandomNumberGenerator.GetBytes(length);
                var chars = bytes.Select(b => alphabet[b % alphabet.Length]).ToArray();
                var code = new string(chars);

                var exists = await _context.Orders.AnyAsync(o => o.PublicCode == code);
                if (!exists)
                {
                    return code;
                }
            }
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}
