using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Back.Controller
{
    [ApiController]
    [Route("api/admin/settings")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Back.Services.ImageService _imageService;

        public SettingsController(AppDbContext context, Back.Services.ImageService imageService)
        {
            _context = context;
            _imageService = imageService;
        }

        [HttpGet]
        public async Task<ActionResult<BusinessInfoDto>> GetSettings()
        {
            var settings = await _context.BusinessSettings.FindAsync((short)1);
            if (settings == null)
            {
                return NotFound();
            }

            return new BusinessInfoDto
            {
                Name = settings.Name,
                Banner = new BannerDto { Title = settings.BannerTitle ?? "", Subtitle = settings.BannerSubtitle ?? "", ImageUrl = "" },
                Hours = JsonSerializer.Deserialize<string[]>(settings.OpeningHours ?? "[]") ?? Array.Empty<string>(),
                Contact = new ContactDto
                {
                    Phone = settings.PhoneWa ?? "",
                    Address = settings.Address ?? "",
                    Social = new SocialDto { Instagram = settings.Instagram ?? "", Facebook = settings.Facebook ?? "" }
                }
            };
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromForm] UpdateBusinessInfoDto settingsDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { error = "Invalid model state", details = ModelState });
                }

                var settings = await _context.BusinessSettings.FindAsync((short)1);
                if (settings == null)
                {
                    // Si no existe, crear uno nuevo
                    settings = new BusinessSettings
                    {
                        Id = 1
                    };
                    _context.BusinessSettings.Add(settings);
                }

                settings.Name = settingsDto.Name ?? "Mi Negocio";
                settings.BannerTitle = settingsDto.BannerTitle ?? "";
                settings.BannerSubtitle = settingsDto.BannerSubtitle ?? "";
                settings.OpeningHours = JsonSerializer.Serialize(settingsDto.Hours ?? Array.Empty<string>());
                settings.PhoneWa = settingsDto.ContactPhone ?? "";
                settings.Address = settingsDto.ContactAddress ?? "";
                settings.Instagram = settingsDto.SocialInstagram ?? "";
                settings.Facebook = settingsDto.SocialFacebook ?? "";

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                // El middleware global se encargará de manejar excepciones no controladas
                // Solo devolvemos un mensaje genérico sin exponer detalles internos
                return StatusCode(500, new { error = "Error al actualizar la configuración" });
            }
        }
    }
}
