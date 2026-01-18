using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace Back.Controller
{
    [ApiController]
    [Route("api/public")]
    public class PublicController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PublicController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("catalog")]
        public async Task<ActionResult<CatalogDto>> GetFullCatalog()
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .OrderBy(p => p.DisplayOrder)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    PriceCents = p.PriceCents,
                    DoublePriceCents= p.DoublePriceCents,
                    HasImage = p.ImageData != null && p.ImageData.Length > 0,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    DisplayOrder = p.DisplayOrder
                })
                .ToListAsync();

            var categories = await _context.Categories
                .OrderBy(c => c.SortOrder)
                .Select(c => new CategoryDto { Id = c.Id, Name = c.Name, SortOrder = c.SortOrder })
                .ToListAsync();

            var settings = await _context.BusinessSettings
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Description,
                    s.BannerTitle,
                    s.BannerSubtitle,
                    s.BannerImageUpdatedAt,
                    s.OpeningHours,
                    s.PhoneWa,
                    s.Address,
                    s.TransferAlias,
                    s.Instagram,
                    s.Facebook
                })
                .FirstOrDefaultAsync(s => s.Id == 1);

            if (settings == null)
            {
                return NotFound("Site settings not configured.");
            }

            var businessInfo = new BusinessInfoDto
            {
                Name = settings.Name,
                Description = settings.Description,
                Banner = new BannerDto
                {
                    Title = settings.BannerTitle ?? "",
                    Subtitle = settings.BannerSubtitle ?? "",
                    ImageUrl = $"/api/public/banner/image?v={(settings.BannerImageUpdatedAt?.Ticks ?? 0)}"
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

            var catalog = new CatalogDto
            {
                Products = products,
                Categories = categories,
                BusinessInfo = businessInfo
            };

            return Ok(catalog);
        }
        [HttpGet("products/{id}/image")]
        public async Task<IActionResult> GetProductsImage(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null || product.ImageData == null || product.ImageData.Length == 0)
            {
                return NotFound("Product image not found");
            }

            return File(product.ImageData, "image/webp");
        }

        [HttpGet("banner/image")]
        [AllowAnonymous] // si querés que el público lo vea
        public async Task<IActionResult> GetBannerImage()
        {
            // 1) DB (bytea) -> BannerImageWebp
            var settings = await _context.BusinessSettings.FindAsync((short)1);

            if (settings?.BannerImageWebp != null && settings.BannerImageWebp.Length > 0)
            {
                Response.Headers["Cache-Control"] = "public,max-age=3600";
                return File(settings.BannerImageWebp, "image/webp");
            }

            // 2) Fallback al archivo (si todavía no cargaron nada a DB)
            var bannerPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "banner.webp");
            if (!System.IO.File.Exists(bannerPath))
                return NotFound("Banner image not found");

            var imageBytes = await System.IO.File.ReadAllBytesAsync(bannerPath);
            Response.Headers["Cache-Control"] = "public,max-age=3600";
            return File(imageBytes, "image/webp");
        }

        [HttpPut("banner/image")]
        public async Task<IActionResult> UpdateBannerImage(IFormFile bannerImage)
        {
            if (bannerImage == null || bannerImage.Length == 0)
                return BadRequest("Missing image");

            if (!bannerImage.ContentType.StartsWith("image/"))
                return BadRequest("Invalid file type");

            await using var inStream = bannerImage.OpenReadStream();
            using var image = await SixLabors.ImageSharp.Image.LoadAsync(inStream);

            const int maxWidth = 1600;
            if (image.Width > maxWidth)
            {
                var newHeight = (int)(image.Height * (maxWidth / (double)image.Width));
                image.Mutate(x => x.Resize(maxWidth, newHeight));
            }

            var encoder = new SixLabors.ImageSharp.Formats.Webp.WebpEncoder { Quality = 80 };
            using var outStream = new MemoryStream();
            await image.SaveAsWebpAsync(outStream, encoder);

            var settings = await _context.BusinessSettings.FindAsync((short)1) ?? new BusinessSettings { Id = 1 };
            settings.BannerImageWebp = outStream.ToArray();
            settings.BannerImageUpdatedAt = DateTime.UtcNow;

            if (_context.Entry(settings).State == EntityState.Detached)
                _context.BusinessSettings.Add(settings);

            await _context.SaveChangesAsync();
            return NoContent();
        }


        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        }

    }
}
