using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Back.Controller
{
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(AppDbContext context, ILogger<OrdersController> logger)
        {
            _context = context;
            _logger = logger;
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
                    var openTime = new TimeSpan(19, 30, 0);
                    var closeTime = new TimeSpan(23, 0, 0);

                    _logger.LogInformation("Hora del cliente: {Time}, Rango: {Open} - {Close}",
                        scheduledTime, openTime, closeTime);

                    if (scheduledTime < openTime || scheduledTime >= closeTime)
                    {
                        _logger.LogWarning("Hora fuera del rango permitido: {Time}", scheduledTime);
                        return BadRequest(new { message = "El horario de entrega es de 19:30 a 23:00" });
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
                    SubtotalCents = orderDto.SubtotalCents,
                    DiscountCents = orderDto.DiscountCents,
                    TipCents = orderDto.TipCents,
                    TotalCents = orderDto.TotalCents,
                    Status = OrderStatus.CREATED,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

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

                var responseDto = MapOrderToDto(createdOrder!);
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
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            var ordersDto = orders.Select(MapOrderToDto).ToList();
            return Ok(ordersDto);
        }

        // GET /api/admin/orders/{id} - Ver detalle de orden (admin)
        [Authorize]
        [HttpGet("api/admin/orders/{id}")]
        public async Task<ActionResult<OrderDto>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                return NotFound();
            }

            return Ok(MapOrderToDto(order));
        }

        // PUT /api/admin/orders/{id}/status - Cambiar estado de orden (admin)
        [Authorize]
        [HttpPut("api/admin/orders/{id}/status")]
        public async Task<ActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            try
            {
                _logger.LogInformation("Actualizando estado de orden {OrderId} a {Status}", id, dto.Status);

                var order = await _context.Orders.FindAsync(id);
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

                _logger.LogInformation("Estado parseado correctamente: {NewStatus}", newStatus);
                order.Status = newStatus;
                order.UpdatedAt = DateTimeOffset.UtcNow;

                _logger.LogInformation("Guardando cambios...");
                await _context.SaveChangesAsync();
                _logger.LogInformation("Estado actualizado exitosamente");

                return NoContent();
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

        // Helper method para mapear Order a OrderDto
        private OrderDto MapOrderToDto(Order order)
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
    }
}
