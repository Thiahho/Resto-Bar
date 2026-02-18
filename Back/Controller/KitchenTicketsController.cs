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
    public class KitchenTicketsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<KitchenTicketsController> _logger;
        private readonly IHubContext<AdminOrdersHub> _hubContext;

        public KitchenTicketsController(
            AppDbContext context,
            ILogger<KitchenTicketsController> logger,
            IHubContext<AdminOrdersHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _hubContext = hubContext;
        }

        // GET /api/admin/kitchen-tickets - Get kitchen tickets with optional filters
        [HttpGet("api/admin/kitchen-tickets")]
        public async Task<ActionResult<List<KitchenTicketDto>>> GetKitchenTickets(
            [FromQuery] string? station,
            [FromQuery] string? status)
        {
            try
            {
                _logger.LogInformation("Getting kitchen tickets - Station: {Station}, Status: {Status}",
                    station ?? "all", status ?? "active");

                var query = _context.KitchenTickets
                    .Include(t => t.Order)
                        .ThenInclude(o => o.TableSession)
                            .ThenInclude(s => s!.Table)
                    .Include(t => t.AssignedToUser)
                    .AsQueryable();

                // Filter by station if provided
                if (!string.IsNullOrWhiteSpace(station) && Enum.TryParse<KitchenStation>(station, out var stationEnum))
                {
                    query = query.Where(t => t.Station == stationEnum);
                }

                // Filter by status if provided, otherwise exclude delivered
                if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<KitchenTicketStatus>(status, out var statusEnum))
                {
                    query = query.Where(t => t.Status == statusEnum);
                }
                else
                {
                    // Default: show all except delivered
                    query = query.Where(t => t.Status != KitchenTicketStatus.DELIVERED);
                }

                var tickets = await query
                    .OrderBy(t => t.CreatedAt)
                    .ToListAsync();

                var ticketDtos = tickets.Select(t => MapToDto(t)).ToList();

                return Ok(ticketDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting kitchen tickets");
                return StatusCode(500, new { message = "Error getting kitchen tickets" });
            }
        }

        // GET /api/admin/kitchen-tickets/{id} - Get specific ticket
        [HttpGet("api/admin/kitchen-tickets/{id}")]
        public async Task<ActionResult<KitchenTicketDto>> GetKitchenTicket(int id)
        {
            try
            {
                var ticket = await _context.KitchenTickets
                    .Include(t => t.Order)
                        .ThenInclude(o => o.TableSession)
                            .ThenInclude(s => s!.Table)
                    .Include(t => t.AssignedToUser)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (ticket == null)
                {
                    return NotFound(new { message = "Kitchen ticket not found" });
                }

                return Ok(MapToDto(ticket));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting kitchen ticket {TicketId}", id);
                return StatusCode(500, new { message = "Error getting kitchen ticket" });
            }
        }

        // PUT /api/admin/kitchen-tickets/{id}/status - Update ticket status
        [HttpPut("api/admin/kitchen-tickets/{id}/status")]
        public async Task<ActionResult> UpdateTicketStatus(int id, [FromBody] UpdateKitchenTicketStatusDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                _logger.LogInformation("Updating ticket {TicketId} to status {Status}", id, dto.Status);

                if (!Enum.TryParse<KitchenTicketStatus>(dto.Status, ignoreCase: true, out var newStatus))
                {
                    return BadRequest(new { message = $"Estado inválido: {dto.Status}. Valores válidos: PENDING, IN_PROGRESS, READY, DELIVERED" });
                }

                var ticket = await _context.KitchenTickets
                    .Include(t => t.Order)
                        .ThenInclude(o => o.TableSession)
                            .ThenInclude(s => s!.Table)
                    .Include(t => t.AssignedToUser)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (ticket == null)
                {
                    return NotFound(new { message = "Kitchen ticket not found" });
                }

                // Update status
                ticket.Status = newStatus;

                // Update timestamps based on new status
                if (newStatus == KitchenTicketStatus.IN_PROGRESS && !ticket.StartedAt.HasValue)
                {
                    ticket.StartedAt = DateTimeOffset.UtcNow;
                }

                if (newStatus == KitchenTicketStatus.READY && !ticket.ReadyAt.HasValue)
                {
                    ticket.ReadyAt = DateTimeOffset.UtcNow;
                }

                if (newStatus == KitchenTicketStatus.DELIVERED && !ticket.DeliveredAt.HasValue)
                {
                    ticket.DeliveredAt = DateTimeOffset.UtcNow;
                }

                // Update notes if provided
                if (!string.IsNullOrWhiteSpace(dto.Notes))
                {
                    ticket.Notes = dto.Notes;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Ticket {TicketId} updated to status {Status}", id, dto.Status);

                // Emit SignalR event
                var ticketDto = MapToDto(ticket);
                await _hubContext.Clients.Group($"Kitchen_{ticket.Station}")
                    .SendAsync("KitchenTicketUpdated", ticketDto);

                return Ok(ticketDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating kitchen ticket {TicketId}", id);
                return StatusCode(500, new { message = "Error updating kitchen ticket" });
            }
        }

        private KitchenTicketDto MapToDto(KitchenTicket ticket)
        {
            return new KitchenTicketDto
            {
                Id = ticket.Id,
                OrderId = ticket.OrderId,
                Station = ticket.Station.ToString(),
                Status = ticket.Status.ToString(),
                TicketNumber = ticket.TicketNumber,
                CreatedAt = ticket.CreatedAt,
                StartedAt = ticket.StartedAt,
                ReadyAt = ticket.ReadyAt,
                DeliveredAt = ticket.DeliveredAt,
                AssignedToUserId = ticket.AssignedToUserId,
                AssignedToUserName = ticket.AssignedToUser?.Usuario,
                ItemsSnapshot = ticket.ItemsSnapshot,
                Notes = ticket.Notes,
                TableName = ticket.Order?.TableSession?.Table?.Name,
                CustomerName = ticket.Order?.TableSession?.CustomerName
            };
        }
    }
}
