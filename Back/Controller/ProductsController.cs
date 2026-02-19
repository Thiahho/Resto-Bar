using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
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
     [OutputCache(PolicyName = "catalog")]
public async Task<ActionResult<CatalogDto>> GetFullCatalog()
{
    var growthSettings = await _context.GrowthSettings.FindAsync(1);
    var (discountPercent, promoType, promoMessage) = ResolveActivePromotion(growthSettings);
    var maxDiscountPercent = DiscountPricingService.GetMaxDiscountPercent(growthSettings);

    var productsData = await _context.Products
        .AsNoTracking()
        .Include(p => p.Category)
        .OrderBy(p => p.DisplayOrder)
        .Select(p => new
        {
            p.Id,
            p.Name,
            p.Description,
            p.PriceCents,
            p.DiscountPriceCents,
            p.DoublePriceCents,
            p.DiscountDoublePriceCents,
            HasImageData = p.ImageData != null,
            p.CategoryId,
            CategoryName = p.Category.Name,
            p.DisplayOrder
        })
        .ToListAsync();

    var products = productsData.Select(p => new ProductDto
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        PriceCents = ResolveDiscountedPrice(p.PriceCents, p.DiscountPriceCents, discountPercent, maxDiscountPercent),
        OriginalPriceCents = discountPercent > 0 && p.DiscountPriceCents.HasValue ? p.PriceCents : null,
        DoublePriceCents = p.DoublePriceCents.HasValue
            ? ResolveDiscountedPrice(p.DoublePriceCents.Value, p.DiscountDoublePriceCents, discountPercent, maxDiscountPercent)
            : null,
        OriginalDoublePriceCents = discountPercent > 0 && p.DiscountDoublePriceCents.HasValue ? p.DoublePriceCents : null,
        HasImage = p.HasImageData,
        CategoryId = p.CategoryId,
        CategoryName = p.CategoryName,
        DisplayOrder = p.DisplayOrder
    }).ToList();

    var categories = await _context.Categories
        .AsNoTracking()
        .OrderBy(c => c.SortOrder)
        .Select(c => new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            SortOrder = c.SortOrder,
            DefaultStation = c.DefaultStation.HasValue ? c.DefaultStation.ToString() : null
        })
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

    var twoForOneConfig = ResolveTwoForOneConfig(growthSettings);

    var catalog = new CatalogDto
    {
        Products = products,
        Categories = categories,
        BusinessInfo = businessInfo,
        ActivePromotion = discountPercent > 0 ? new ActivePromotionDto
        {
            Type = promoType,
            Message = promoMessage,
            DiscountPercent = discountPercent
        } : null,
        UpsellConfig = growthSettings != null && growthSettings.UpsellEnabled && growthSettings.UpsellDiscount > 0
            ? new UpsellConfigDto
            {
                Enabled = true,
                DiscountPercent = growthSettings.UpsellDiscount,
                Message = growthSettings.UpsellMessage,
                ProductIds = ParseProductIds(growthSettings.UpsellProductIdsJson)
            }
            : null,
        TwoForOneConfig = twoForOneConfig
    };

    return Ok(catalog);
}

private static int ResolveDiscountedPrice(int priceCents, int? discountPriceCents, int discountPercent, int maxDiscountPercent)
{
    if (discountPercent <= 0 || !discountPriceCents.HasValue)
    {
        return priceCents;
    }

    return discountPriceCents.Value;
}
private static (int discountPercent, string type, string message) ResolveActivePromotion(GrowthSettings? settings)
{
    if (settings == null)
    {
        return (0, "", "");
    }

    var now = DateTime.Now;
    var today = GetSpanishDay(now.DayOfWeek);

    // Happy Hour - solo si está habilitado, tiene descuento > 0, y horarios configurados
    if (settings.HappyHourEnabled &&
        settings.HappyHourDiscount > 0 &&
        !string.IsNullOrEmpty(settings.HappyHourStart) &&
        !string.IsNullOrEmpty(settings.HappyHourEnd))
    {
        var happyHourDays = ParseDays(settings.HappyHourDaysJson);
        // Si no hay días configurados, no aplica ningún día (debe configurarse explícitamente)
        var isHappyHourDay = happyHourDays.Count > 0 && happyHourDays.Contains(today);
        var isHappyHourTime = IsWithinTimeWindow(settings.HappyHourStart, settings.HappyHourEnd, now.TimeOfDay);

        if (isHappyHourDay && isHappyHourTime)
        {
            return (settings.HappyHourDiscount, "happy_hour", $"🔥 Happy Hour - {settings.HappyHourDiscount}% OFF");
        }
    }

    // Dynamic Pricing (Off-Peak) - solo si está habilitado, tiene descuento > 0, y horarios configurados
    if (settings.DynamicPricingEnabled &&
        settings.DynamicPricingOffPeakDiscount > 0 &&
        !string.IsNullOrEmpty(settings.DynamicPricingOffPeakStart) &&
        !string.IsNullOrEmpty(settings.DynamicPricingOffPeakEnd))
    {
        var isOffPeak = IsWithinTimeWindow(settings.DynamicPricingOffPeakStart, settings.DynamicPricingOffPeakEnd, now.TimeOfDay);

        if (isOffPeak)
        {
            var message = !string.IsNullOrEmpty(settings.DynamicPricingPeakMessage)
                ? settings.DynamicPricingPeakMessage
                : $"⚡ Descuento especial - {settings.DynamicPricingOffPeakDiscount}% OFF";
            return (settings.DynamicPricingOffPeakDiscount, "dynamic_pricing", message);
        }
    }

    return (0, "", "");
}

private static TwoForOneConfigDto? ResolveTwoForOneConfig(GrowthSettings? settings)
{
    if (settings == null || !settings.TwoForOneEnabled)
    {
        return null;
    }

    var now = DateTime.Now;
    var today = GetSpanishDay(now.DayOfWeek);
    var twoForOneDays = ParseDays(settings.TwoForOneDaysJson);

    // Si no hay días configurados o hoy no es uno de los días, no está activo
    if (twoForOneDays.Count == 0 || !twoForOneDays.Contains(today))
    {
        return null;
    }

    // Parsear los IDs de productos
    var productIds = new List<int>();
    if (!string.IsNullOrWhiteSpace(settings.TwoForOneProductIdsJson))
    {
        try
        {
            productIds = JsonSerializer.Deserialize<List<int>>(settings.TwoForOneProductIdsJson) ?? new List<int>();
        }
        catch
        {
            productIds = new List<int>();
        }
    }

    return new TwoForOneConfigDto
    {
        Active = true,
        ProductIds = productIds
    };
}

        [HttpGet("products/{id}/image")]
        public async Task<IActionResult> GetProductsImage(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null || product.ImageData == null || product.ImageData.Length == 0)
            {
                return NotFound("Product image not found");
            }

            Response.Headers["Cache-Control"] = "public, max-age=86400";
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

        [HttpGet("promo-status")]
        public async Task<IActionResult> GetPromoStatus()
        {
            var settings = await _context.GrowthSettings.FindAsync(1);
            var now = DateTime.Now;
            var today = GetSpanishDay(now.DayOfWeek);
            var happyHourDays = settings != null ? ParseDays(settings.HappyHourDaysJson) : new List<string>();
            var isHappyHourDay = happyHourDays.Count > 0 && happyHourDays.Contains(today);
            var hasHappyHourTimes = !string.IsNullOrEmpty(settings?.HappyHourStart) && !string.IsNullOrEmpty(settings?.HappyHourEnd);
            var isHappyHourTime = hasHappyHourTimes && IsWithinTimeWindow(settings!.HappyHourStart, settings.HappyHourEnd, now.TimeOfDay);

            var (discountPercent, promoType, promoMessage) = ResolveActivePromotion(settings);

            return Ok(new
            {
                currentTime = now.ToString("HH:mm:ss"),
                currentDay = today,
                happyHour = new
                {
                    enabled = settings?.HappyHourEnabled ?? false,
                    configuredDays = happyHourDays,
                    hasDaysConfigured = happyHourDays.Count > 0,
                    isTodayIncluded = isHappyHourDay,
                    startTime = settings?.HappyHourStart ?? "(no configurado)",
                    endTime = settings?.HappyHourEnd ?? "(no configurado)",
                    hasTimesConfigured = hasHappyHourTimes,
                    isWithinTime = isHappyHourTime,
                    discount = settings?.HappyHourDiscount ?? 0
                },
                dynamicPricing = new
                {
                    enabled = settings?.DynamicPricingEnabled ?? false,
                    startTime = settings?.DynamicPricingOffPeakStart ?? "(no configurado)",
                    endTime = settings?.DynamicPricingOffPeakEnd ?? "(no configurado)",
                    discount = settings?.DynamicPricingOffPeakDiscount ?? 0
                },
                activePromotion = new
                {
                    discountPercent,
                    type = promoType,
                    message = promoMessage
                }
            });
        }

        private static string GetSpanishDay(DayOfWeek day)
        {
            return day switch
            {
                DayOfWeek.Monday => "lunes",
                DayOfWeek.Tuesday => "martes",
                DayOfWeek.Wednesday => "miércoles",
                DayOfWeek.Thursday => "jueves",
                DayOfWeek.Friday => "viernes",
                DayOfWeek.Saturday => "sábado",
                DayOfWeek.Sunday => "domingo",
                _ => ""
            };
        }

        private static List<string> ParseDays(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<string>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private static List<int> ParseProductIds(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<int>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<int>>(json) ?? new List<int>();
            }
            catch
            {
                return new List<int>();
            }
        }

        private static bool IsWithinTimeWindow(string? start, string? end, TimeSpan currentTime)
        {
            if (string.IsNullOrWhiteSpace(start) || string.IsNullOrWhiteSpace(end))
            {
                return false;
            }

            if (!TimeSpan.TryParse(start, out var startTime) || !TimeSpan.TryParse(end, out var endTime))
            {
                return false;
            }

            if (startTime <= endTime)
            {
                return currentTime >= startTime && currentTime <= endTime;
            }

            // Maneja rangos que cruzan medianoche (ej: 22:00 - 02:00)
            return currentTime >= startTime || currentTime <= endTime;
        }

    }
}
