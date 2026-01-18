using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

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
                Description = settings.Description,
                Banner = new BannerDto
                {
                    Title = settings.BannerTitle ?? "",
                    Subtitle = settings.BannerSubtitle ?? "",
                    ImageUrl = $"/api/admin/settings/banner-image?v={(settings.BannerImageUpdatedAt?.Ticks ?? 0)}"
                },
                Hours = JsonSerializer.Deserialize<string[]>(settings.OpeningHours ?? "[]") ?? Array.Empty<string>(),
                Contact = new ContactDto
                {
                    Phone = settings.PhoneWa ?? "",
                    Address = settings.Address ?? "",
                    TransferAlias = settings.TransferAlias,
                    Social = new SocialDto { Instagram = settings.Instagram ?? "", Facebook = settings.Facebook ?? "" }
                }
            };
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings(
            [FromForm] UpdateBusinessInfoDto settingsDto,
            IFormFile? bannerImage
        )
        {
            if (!ModelState.IsValid)
                return BadRequest(new { error = "Invalid model state", details = ModelState });

            var settings = await _context.BusinessSettings.FindAsync((short)1);
            if (settings == null)
            {
                settings = new BusinessSettings { Id = 1 };
                _context.BusinessSettings.Add(settings);
            }

            settings.Name = settingsDto.Name ?? "Mi Negocio";
            settings.Description = settingsDto.Description;
            settings.BannerTitle = settingsDto.BannerTitle ?? "";
            settings.BannerSubtitle = settingsDto.BannerSubtitle ?? "";
            settings.OpeningHours = JsonSerializer.Serialize(settingsDto.Hours ?? Array.Empty<string>());
            settings.PhoneWa = settingsDto.ContactPhone ?? "";
            settings.Address = settingsDto.ContactAddress ?? "";
            settings.TransferAlias = settingsDto.ContactTransferAlias;
            settings.Instagram = settingsDto.SocialInstagram ?? "";
            settings.Facebook = settingsDto.SocialFacebook ?? "";

            if (bannerImage != null && bannerImage.Length > 0)
            {
                if (!bannerImage.ContentType.StartsWith("image/"))
                    return BadRequest(new { error = "El archivo debe ser una imagen" });

                await using var inStream = bannerImage.OpenReadStream();
                using var image = await Image.LoadAsync(inStream);

                // Opcional para reducir tamaño: limitar ancho
                const int maxWidth = 1600;
                if (image.Width > maxWidth)
                {
                    var newHeight = (int)(image.Height * (maxWidth / (double)image.Width));
                    image.Mutate(x => x.Resize(maxWidth, newHeight));
                }

                var encoder = new WebpEncoder
                {
                    Quality = 80, // 70-85 suele ser buen balance
                    FileFormat = WebpFileFormatType.Lossy
                };

                using var outStream = new MemoryStream();
                await image.SaveAsWebpAsync(outStream, encoder);

                settings.BannerImageWebp = outStream.ToArray();
                settings.BannerImageUpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }



    }
}
