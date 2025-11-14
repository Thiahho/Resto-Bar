using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Back.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IConfiguration configuration, AppDbContext context, ILogger<AuthController> logger)
        {
            _configuration = configuration;
            _context = context;
            _logger = logger;
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth")] // Aplicar política restrictiva de rate limiting
        public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest)
        {
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

            // Buscar usuario en la base de datos
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Usuario == loginRequest.Usuario);

            if (user == null)
            {
                _logger.LogWarning(
                    "Intento de login fallido - Usuario no encontrado. Usuario: {Usuario}, IP: {IP}, Timestamp: {Timestamp}",
                    loginRequest.Usuario,
                    clientIp,
                    DateTime.UtcNow
                );
                return Unauthorized(new { message = "Invalid credentials" });
            }

            // Verificar password con BCrypt
            bool isPasswordValid =  BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.Password);

            if (!isPasswordValid)
            {
                _logger.LogWarning(
                    "Intento de login fallido - Contraseña incorrecta. Usuario: {Usuario}, IP: {IP}, Timestamp: {Timestamp}",
                    loginRequest.Usuario,
                    clientIp,
                    DateTime.UtcNow
                );
                return Unauthorized(new { message = "Invalid credentials" });
            }

            // Login exitoso
            _logger.LogInformation(
                "Login exitoso. Usuario: {Usuario}, IP: {IP}, Timestamp: {Timestamp}",
                loginRequest.Usuario,
                clientIp,
                DateTime.UtcNow
            );

            // Generar JWT token
            var token = GenerateJwtToken(user);

            return Ok(new LoginResponse
            {
                Token = token,
                Usuario = user.Usuario,
                Rol = user.Rol
            });
        }

        [HttpPost("register")]
        [Authorize(Roles = "Admin")] // Solo administradores pueden crear nuevos usuarios
        public async Task<IActionResult> Register([FromBody] RegisterRequest registerRequest)
        {
            // Validar política de contraseñas fuertes
            var (isPasswordValid, passwordErrors) = PasswordValidator.ValidatePassword(registerRequest.Password);
            if (!isPasswordValid)
            {
                return BadRequest(new
                {
                    message = "La contraseña no cumple con la política de seguridad",
                    errors = passwordErrors
                });
            }

            // Verificar si el usuario ya existe
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Usuario == registerRequest.Usuario);

            if (existingUser != null)
            {
                return BadRequest(new { message = "User already exists" });
            }

            // Validar que el rol sea válido (solo Admin o User)
            if (registerRequest.Rol != "Admin" && registerRequest.Rol != "User")
            {
                return BadRequest(new { message = "Invalid role. Allowed roles: Admin, User" });
            }

            // Hashear la contraseña con BCrypt
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(registerRequest.Password);

            // Crear nuevo usuario
            var newUser = new User
            {
                Usuario = registerRequest.Usuario,
                Password = hashedPassword,
                Rol = registerRequest.Rol
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Nuevo usuario registrado. Usuario: {Usuario}, Rol: {Rol}, Por: {Admin}",
                newUser.Usuario,
                newUser.Rol,
                User.Identity?.Name ?? "Unknown"
            );

            return Ok(new { message = "User registered successfully", userId = newUser.Id });
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Usuario),
                new Claim(ClaimTypes.Role, user.Rol),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("userId", user.Id.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(8),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    
    }
}
