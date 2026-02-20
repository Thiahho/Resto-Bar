using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Back.Controller
{
    [ApiController]
    [Authorize]
    public class TablesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TablesController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHubContext<AdminOrdersHub> _hubContext;

        public TablesController(
            AppDbContext context,
            ILogger<TablesController> logger,
            IConfiguration configuration,
            IHubContext<AdminOrdersHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _hubContext = hubContext;
        }

        // GET /api/admin/tables - List all tables with current session
        [HttpGet("api/admin/tables")]
        public async Task<ActionResult<List<TableDto>>> GetTables([FromQuery] int? branchId)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                {
                    return NotFound(new { message = "Dine-in feature not enabled" });
                }

                _logger.LogInformation("Listing tables for branchId: {BranchId}", branchId);

                var query = _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                        .ThenInclude(s => s.Orders)
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                        .ThenInclude(s => s.AssignedWaiter)
                    .AsQueryable();

                if (branchId.HasValue)
                {
                    query = query.Where(t => t.BranchId == branchId.Value);
                }

                var tables = await query
                    .OrderBy(t => t.SortOrder)
                    .ThenBy(t => t.Name)
                    .ToListAsync();

                var tableDtos = tables.Select(t => new TableDto
                {
                    Id = t.Id,
                    BranchId = t.BranchId,
                    Name = t.Name,
                    Capacity = t.Capacity,
                    Status = t.Status.ToString(),
                    SortOrder = t.SortOrder,
                    IsActive = t.IsActive,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    CurrentSession = t.Sessions.FirstOrDefault() != null ? new TableSessionSummaryDto
                    {
                        Id = t.Sessions.First().Id,
                        CustomerName = t.Sessions.First().CustomerName,
                        GuestCount = t.Sessions.First().GuestCount,
                        OpenedAt = t.Sessions.First().OpenedAt,
                        OrderCount = t.Sessions.First().Orders.Count,
                        TotalCents = t.Sessions.First().TotalCents,
                        AssignedWaiterId = t.Sessions.First().AssignedWaiterId,
                        AssignedWaiterName = t.Sessions.First().AssignedWaiter?.Usuario
                    } : null
                }).ToList();

                return Ok(tableDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing tables");
                return StatusCode(500, new { message = "Error listing tables" });
            }
        }

        // GET /api/admin/tables/{id}/active-session - Get active session for table
        [HttpGet("api/admin/tables/{id}/active-session")]
        public async Task<ActionResult<TableSessionDto>> GetActiveSession(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                {
                    return NotFound(new { message = "Dine-in feature not enabled" });
                }

                _logger.LogInformation("Getting active session for table {TableId}", id);

                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                        .ThenInclude(s => s.Orders)
                            .ThenInclude(o => o.Items)
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                        .ThenInclude(s => s.AssignedWaiter)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (table == null)
                {
                    return NotFound(new { message = "Table not found" });
                }

                var session = table.Sessions.FirstOrDefault();
                if (session == null)
                {
                    return NotFound(new { message = "No active session found for this table" });
                }

                var sessionDto = new TableSessionDto
                {
                    Id = session.Id,
                    TableId = session.TableId,
                    TableName = table.Name,
                    CustomerName = session.CustomerName,
                    GuestCount = session.GuestCount,
                    OpenedAt = session.OpenedAt,
                    ClosedAt = session.ClosedAt,
                    Status = session.Status.ToString(),
                    OpenedByUserId = session.OpenedByUserId,
                    AssignedWaiterId = session.AssignedWaiterId,
                    AssignedWaiterName = session.AssignedWaiter?.Usuario,
                    AssignedWaiterPhone = session.AssignedWaiter?.Phone,
                    SubtotalCents = session.SubtotalCents,
                    TotalCents = session.TotalCents,
                    Notes = session.Notes,
                    Orders = session.Orders.Select(o => new OrderDto
                    {
                        Id = o.Id,
                        TableSessionId = o.TableSessionId,
                        CustomerName = o.CustomerName,
                        SubtotalCents = o.SubtotalCents,
                        TotalCents = o.TotalCents,
                        Status = o.Status.ToString(),
                        CreatedAt = o.CreatedAt,
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
                _logger.LogError(ex, "Error getting active session for table {TableId}", id);
                return StatusCode(500, new { message = "Error getting active session" });
            }
        }

        // POST /api/admin/tables/{id}/open-session - Open table session
        [HttpPost("api/admin/tables/{id}/open-session")]
        public async Task<ActionResult<TableSessionDto>> OpenTableSession(int id, [FromBody] OpenTableSessionDto dto)
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

                _logger.LogInformation("Opening session for table {TableId}", id);

                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (table == null)
                {
                    return NotFound(new { message = "Table not found" });
                }

                if (!table.IsActive)
                {
                    return BadRequest(new { message = "Table is not active" });
                }

                // Check if table already has an active session
                if (table.Sessions.Any())
                {
                    return BadRequest(new { message = "Table already has an active session" });
                }

                var userId = GetUserId();

                // Si es un Mozo y no se especificó mozo asignado, auto-asignarse
                var assignedWaiterId = dto.WaiterId;
                if (assignedWaiterId == null && User.IsInRole("Mozo"))
                {
                    assignedWaiterId = userId;
                    _logger.LogInformation("Auto-asignando mozo {UserId} a la mesa {TableId}", userId, id);
                }

                var session = new TableSession
                {
                    TableId = id,
                    CustomerName = dto.CustomerName,
                    GuestCount = dto.GuestCount,
                    Notes = dto.Notes,
                    OpenedByUserId = userId,
                    AssignedWaiterId = assignedWaiterId,
                    OpenedAt = DateTimeOffset.UtcNow,
                    Status = TableSessionStatus.ACTIVE
                };

                _context.TableSessions.Add(session);

                // Update table status
                table.Status = TableStatus.OCCUPIED;
                table.UpdatedAt = DateTimeOffset.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Session {SessionId} opened for table {TableId}", session.Id, id);

                // Notify via SignalR
                await _hubContext.Clients.All.SendAsync("TableSessionOpened", new
                {
                    sessionId = session.Id,
                    tableId = table.Id,
                    tableName = table.Name
                });

                var sessionDto = new TableSessionDto
                {
                    Id = session.Id,
                    TableId = session.TableId,
                    TableName = table.Name,
                    CustomerName = session.CustomerName,
                    GuestCount = session.GuestCount,
                    OpenedAt = session.OpenedAt,
                    ClosedAt = session.ClosedAt,
                    Status = session.Status.ToString(),
                    OpenedByUserId = session.OpenedByUserId,
                    SubtotalCents = session.SubtotalCents,
                    TotalCents = session.TotalCents,
                    Notes = session.Notes,
                    Orders = new List<OrderDto>()
                };

                return Ok(sessionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening table session");
                return StatusCode(500, new { message = "Error opening table session" });
            }
        }

        // POST /api/admin/tables/{id}/close-session - Close table session
        [HttpPost("api/admin/tables/{id}/close-session")]
        public async Task<ActionResult<TableSessionDto>> CloseTableSession(int id, [FromBody] CloseTableSessionDto? dto)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                {
                    return NotFound(new { message = "Dine-in feature not enabled" });
                }

                _logger.LogInformation("Closing session for table {TableId}", id);

                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                    .ThenInclude(s => s.Orders)
                    .ThenInclude(o => o.Items)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (table == null)
                {
                    return NotFound(new { message = "Table not found" });
                }

                var session = table.Sessions.FirstOrDefault();
                if (session == null)
                {
                    return BadRequest(new { message = "No active session found for this table" });
                }

                var userId = GetUserId();

                // Calculate totals from all orders in the session
                var subtotal = session.Orders.Sum(o => o.SubtotalCents);
                var total = session.Orders.Sum(o => o.TotalCents);

                session.SubtotalCents = subtotal;
                session.TotalCents = total;
                session.ClosedAt = DateTimeOffset.UtcNow;
                session.ClosedByUserId = userId;
                session.Status = TableSessionStatus.CLOSED;
                if (dto?.Notes != null)
                {
                    session.Notes = dto.Notes;
                }

                // Update table status
                table.Status = TableStatus.AVAILABLE;
                table.UpdatedAt = DateTimeOffset.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Session {SessionId} closed for table {TableId}. Total: {Total}",
                    session.Id, id, total);

                // Notify via SignalR
                await _hubContext.Clients.All.SendAsync("TableSessionClosed", new
                {
                    sessionId = session.Id,
                    tableId = table.Id,
                    tableName = table.Name,
                    totalCents = total
                });

                var sessionDto = new TableSessionDto
                {
                    Id = session.Id,
                    TableId = session.TableId,
                    TableName = table.Name,
                    CustomerName = session.CustomerName,
                    GuestCount = session.GuestCount,
                    OpenedAt = session.OpenedAt,
                    ClosedAt = session.ClosedAt,
                    Status = session.Status.ToString(),
                    OpenedByUserId = session.OpenedByUserId,
                    ClosedByUserId = session.ClosedByUserId,
                    SubtotalCents = session.SubtotalCents,
                    TotalCents = session.TotalCents,
                    Notes = session.Notes,
                    Orders = new List<OrderDto>()
                };

                return Ok(sessionDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing table session");
                return StatusCode(500, new { message = "Error closing table session" });
            }
        }

        // POST /api/admin/tables - Create a new table
        [HttpPost("api/admin/tables")]
        public async Task<ActionResult<TableDto>> CreateTable([FromBody] CreateTableDto dto)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Check name uniqueness within branch
                var exists = await _context.Tables
                    .AnyAsync(t => t.BranchId == dto.BranchId && t.Name == dto.Name);
                if (exists)
                    return BadRequest(new { message = $"Ya existe una mesa llamada \"{dto.Name}\" en esta sucursal" });

                var table = new Table
                {
                    BranchId = dto.BranchId,
                    Name = dto.Name,
                    Capacity = dto.Capacity,
                    SortOrder = dto.SortOrder,
                    IsActive = dto.IsActive,
                    Status = TableStatus.AVAILABLE,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                };

                _context.Tables.Add(table);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Table {TableName} created with id {TableId}", table.Name, table.Id);

                return Ok(MapToDto(table, null));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating table");
                return StatusCode(500, new { message = "Error creating table" });
            }
        }

        // PUT /api/admin/tables/{id} - Update table details
        [HttpPut("api/admin/tables/{id}")]
        public async Task<ActionResult<TableDto>> UpdateTable(int id, [FromBody] UpdateTableDto dto)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var table = await _context.Tables.FindAsync(id);
                if (table == null)
                    return NotFound(new { message = "Table not found" });

                // Check name uniqueness (excluding this table)
                var exists = await _context.Tables
                    .AnyAsync(t => t.BranchId == table.BranchId && t.Name == dto.Name && t.Id != id);
                if (exists)
                    return BadRequest(new { message = $"Ya existe una mesa llamada \"{dto.Name}\" en esta sucursal" });

                table.Name = dto.Name;
                table.Capacity = dto.Capacity;
                table.SortOrder = dto.SortOrder;
                table.IsActive = dto.IsActive;
                table.UpdatedAt = DateTimeOffset.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Table {TableId} updated", id);

                return Ok(MapToDto(table, null));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating table {TableId}", id);
                return StatusCode(500, new { message = "Error updating table" });
            }
        }

        // DELETE /api/admin/tables/{id} - Delete table (only if no sessions)
        [HttpDelete("api/admin/tables/{id}")]
        public async Task<ActionResult> DeleteTable(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                var table = await _context.Tables
                    .Include(t => t.Sessions)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (table == null)
                    return NotFound(new { message = "Table not found" });

                if (table.Sessions.Any())
                    return BadRequest(new { message = "No se puede eliminar una mesa que tiene historial de sesiones. Desactivala en su lugar." });

                _context.Tables.Remove(table);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Table {TableId} deleted", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting table {TableId}", id);
                return StatusCode(500, new { message = "Error deleting table" });
            }
        }

        // POST /api/admin/tables/{id}/reserve - Reserve a table
        [HttpPost("api/admin/tables/{id}/reserve")]
        public async Task<ActionResult<TableDto>> ReserveTable(int id, [FromBody] ReserveTableDto dto)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (table == null)
                    return NotFound(new { message = "Table not found" });

                if (table.Status == TableStatus.OCCUPIED)
                    return BadRequest(new { message = "No se puede reservar una mesa que está ocupada" });

                table.Status = TableStatus.RESERVED;
                table.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Table {TableId} reserved", id);

                return Ok(MapToDto(table, null));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reserving table {TableId}", id);
                return StatusCode(500, new { message = "Error reserving table" });
            }
        }

        // POST /api/admin/tables/{id}/release - Release a reserved/out-of-service table
        [HttpPost("api/admin/tables/{id}/release")]
        public async Task<ActionResult<TableDto>> ReleaseTable(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                var table = await _context.Tables.FindAsync(id);
                if (table == null)
                    return NotFound(new { message = "Table not found" });

                if (table.Status == TableStatus.OCCUPIED)
                    return BadRequest(new { message = "No se puede liberar una mesa ocupada" });

                table.Status = TableStatus.AVAILABLE;
                table.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Table {TableId} released to AVAILABLE", id);

                return Ok(MapToDto(table, null));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error releasing table {TableId}", id);
                return StatusCode(500, new { message = "Error releasing table" });
            }
        }

        // POST /api/admin/tables/{id}/request-bill - Request bill for table (OCCUPIED → BILL_REQUESTED)
        [HttpPost("api/admin/tables/{id}/request-bill")]
        public async Task<ActionResult<TableDto>> RequestBill(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                var table = await _context.Tables
                    .Include(t => t.Sessions.Where(s => s.ClosedAt == null))
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (table == null)
                    return NotFound(new { message = "Table not found" });

                if (table.Status != TableStatus.OCCUPIED)
                    return BadRequest(new { message = "La mesa debe estar ocupada para solicitar la cuenta" });

                table.Status = TableStatus.BILL_REQUESTED;
                table.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Bill requested for table {TableId}", id);

                await _hubContext.Clients.All.SendAsync("TableStatusChanged", new
                {
                    tableId = table.Id,
                    tableName = table.Name,
                    status = table.Status.ToString()
                });

                var session = table.Sessions.FirstOrDefault();
                return Ok(MapToDto(table, session != null ? new TableSessionSummaryDto
                {
                    Id = session.Id,
                    CustomerName = session.CustomerName,
                    GuestCount = session.GuestCount,
                    OpenedAt = session.OpenedAt,
                    OrderCount = session.Orders.Count,
                    TotalCents = session.TotalCents
                } : null));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error requesting bill for table {TableId}", id);
                return StatusCode(500, new { message = "Error requesting bill" });
            }
        }

        // POST /api/admin/tables/{id}/out-of-service - Mark table as out of service
        [HttpPost("api/admin/tables/{id}/out-of-service")]
        public async Task<ActionResult<TableDto>> SetOutOfService(int id)
        {
            try
            {
                if (!IsFeatureEnabled("ENABLE_DINE_IN"))
                    return NotFound(new { message = "Dine-in feature not enabled" });

                var table = await _context.Tables.FindAsync(id);
                if (table == null)
                    return NotFound(new { message = "Table not found" });

                if (table.Status == TableStatus.OCCUPIED)
                    return BadRequest(new { message = "No se puede deshabilitar una mesa ocupada" });

                table.Status = TableStatus.OUT_OF_SERVICE;
                table.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(MapToDto(table, null));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting table {TableId} out of service", id);
                return StatusCode(500, new { message = "Error updating table" });
            }
        }

        private static TableDto MapToDto(Table table, TableSessionSummaryDto? session) => new()
        {
            Id = table.Id,
            BranchId = table.BranchId,
            Name = table.Name,
            Capacity = table.Capacity,
            Status = table.Status.ToString(),
            SortOrder = table.SortOrder,
            IsActive = table.IsActive,
            CreatedAt = table.CreatedAt,
            UpdatedAt = table.UpdatedAt,
            CurrentSession = session,
        };

        private bool IsFeatureEnabled(string featureName)
        {
            var value = _configuration[$"Features:{featureName}"];
            // Si no está configurada, habilitada por defecto; solo se deshabilita explícitamente con "false" o "0"
            if (string.IsNullOrWhiteSpace(value)) return true;
            return value.Equals("true", StringComparison.OrdinalIgnoreCase) || value == "1";
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
    }
}
