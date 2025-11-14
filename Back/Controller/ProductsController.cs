using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

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
                    s.BannerTitle,
                    s.BannerSubtitle,
                    s.OpeningHours,
                    s.PhoneWa,
                    s.Address,
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
                Banner = new BannerDto
                {
                    Title = settings.BannerTitle ?? "",
                    Subtitle = settings.BannerSubtitle ?? "",
                    ImageUrl = "/api/public/banner/image"
                },
                Hours = JsonSerializer.Deserialize<string[]>(settings.OpeningHours ?? "[]") ?? Array.Empty<string>(),
                Contact = new ContactDto
                {
                    Phone = settings.PhoneWa ?? "",
                    Address = settings.Address ?? "",
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
        public IActionResult GetBannerImage()
        {
            var bannerPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "banner.webp");

            if (!System.IO.File.Exists(bannerPath))
            {
                // Retornar una imagen por defecto o 404
                return NotFound("Banner image not found");
            }

            var imageBytes = System.IO.File.ReadAllBytes(bannerPath);
            return File(imageBytes, "image/webp");
        }

        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        }

    }
}
