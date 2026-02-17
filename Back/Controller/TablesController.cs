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
                        TotalCents = t.Sessions.First().TotalCents
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
                var session = new TableSession
                {
                    TableId = id,
                    CustomerName = dto.CustomerName,
                    GuestCount = dto.GuestCount,
                    Notes = dto.Notes,
                    OpenedByUserId = userId,
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
