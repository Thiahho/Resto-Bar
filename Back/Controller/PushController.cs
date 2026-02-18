using Back.Data;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Back.Controller
{
    [ApiController]
    [Route("api/push")]
    public class PushController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PushController> _logger;

        public PushController(AppDbContext context, IConfiguration configuration, ILogger<PushController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        // GET /api/push/vapid-public-key — no auth required
        [HttpGet("vapid-public-key")]
        [AllowAnonymous]
        public IActionResult GetVapidPublicKey()
        {
            var publicKey = _configuration["Vapid:PublicKey"];
            if (string.IsNullOrEmpty(publicKey))
                return StatusCode(500, new { message = "VAPID not configured" });

            return Ok(new { publicKey });
        }

        // POST /api/push/subscribe — save/update subscription
        [HttpPost("subscribe")]
        [Authorize]
        public async Task<IActionResult> Subscribe([FromBody] PushSubscribeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Endpoint) || string.IsNullOrWhiteSpace(dto.P256dh) || string.IsNullOrWhiteSpace(dto.Auth))
                return BadRequest(new { message = "Invalid subscription data" });

            var userId = User.FindFirst("userId")?.Value;

            var existing = await _context.UserPushSubscriptions
                .FirstOrDefaultAsync(s => s.Endpoint == dto.Endpoint);

            if (existing != null)
            {
                existing.P256dh = dto.P256dh;
                existing.Auth = dto.Auth;
                existing.Station = dto.Station;
                existing.UserId = userId;
            }
            else
            {
                _context.UserPushSubscriptions.Add(new UserPushSubscription
                {
                    Endpoint = dto.Endpoint,
                    P256dh = dto.P256dh,
                    Auth = dto.Auth,
                    Station = dto.Station,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Push subscription saved for user {UserId}, station {Station}", userId, dto.Station ?? "ALL");

            return Ok(new { message = "Subscribed" });
        }

        // DELETE /api/push/subscribe — remove subscription by endpoint
        [HttpDelete("subscribe")]
        [Authorize]
        public async Task<IActionResult> Unsubscribe([FromBody] PushUnsubscribeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Endpoint))
                return BadRequest(new { message = "Endpoint required" });

            var sub = await _context.UserPushSubscriptions
                .FirstOrDefaultAsync(s => s.Endpoint == dto.Endpoint);

            if (sub != null)
            {
                _context.UserPushSubscriptions.Remove(sub);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Unsubscribed" });
        }
    }

    public record PushSubscribeDto(string Endpoint, string P256dh, string Auth, string? Station);
    public record PushUnsubscribeDto(string Endpoint);
}
