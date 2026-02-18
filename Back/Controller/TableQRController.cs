using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Back.Controller
{
    [ApiController]
    [Authorize]
    public class TableQRController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TableQRController> _logger;
        private readonly IConfiguration _configuration;

        public TableQRController(
            AppDbContext context,
            ILogger<TableQRController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        // POST /api/admin/tables/{id}/generate-qr
        [HttpPost("api/admin/tables/{id}/generate-qr")]
        public async Task<ActionResult<TableQRDto>> GenerateTableQR(int id)
        {
            try
            {
                _logger.LogInformation("Generating QR for table {TableId}", id);

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

                // Find active session (if any)
                var activeSession = table.Sessions.FirstOrDefault(s => s.ClosedAt == null);

                // Generate JWT token
                var token = GenerateTableToken(table, activeSession);
                var expiresAt = DateTimeOffset.UtcNow.AddHours(24);

                // Build QR URL
                var frontendUrl = _configuration["Frontend:BaseUrl"];
                if (string.IsNullOrWhiteSpace(frontendUrl))
                {
                    frontendUrl = $"{Request.Scheme}://{Request.Host}";
                }
                frontendUrl = frontendUrl.TrimEnd('/');

                var qrUrl = $"{frontendUrl}/#/mesa/{table.Id}?t={token}";

                var qrDto = new TableQRDto
                {
                    TableId = table.Id,
                    TableName = table.Name,
                    SessionId = activeSession?.Id,
                    Token = token,
                    QrCodeUrl = qrUrl,
                    ExpiresAt = expiresAt
                };

                _logger.LogInformation("QR generated for table {TableId}", id);

                return Ok(qrDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating QR for table {TableId}", id);
                return StatusCode(500, new { message = "Error generating QR code" });
            }
        }

        private string GenerateTableToken(Table table, TableSession? session)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var issuer = _configuration["Jwt:Issuer"];

            var claims = new List<Claim>
            {
                new Claim("tableId", table.Id.ToString()),
                new Claim("branchId", table.BranchId.ToString()),
                new Claim("scope", "table_order")
            };

            if (session != null)
            {
                claims.Add(new Claim("sessionId", session.Id.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: "TableOrder",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24), // 24 hour expiration
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
