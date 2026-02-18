using System.Text.Json;
using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Back.Services;
namespace Back.Controller
{
    [ApiController]
    [Route("api/admin/growth-settings")]
    [Authorize]
    public class GrowthSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GrowthSettingsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<GrowthSettingsDto>> GetSettings()
        {
            var settings = await _context.GrowthSettings.FindAsync(1);
            if (settings == null)
            {
                settings = new GrowthSettings();
                _context.GrowthSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return Ok(MapToDto(settings));
        }

        [HttpPut]
public async Task<ActionResult<GrowthSettingsDto>> UpdateSettings([FromBody] GrowthSettingsDto dto)
{
    var settings = await _context.GrowthSettings.FindAsync(1);
    if (settings == null)
    {
        settings = new GrowthSettings();
        _context.GrowthSettings.Add(settings);
    }

    settings.UpsellEnabled = dto.UpsellEnabled;
    settings.UpsellDiscount = dto.UpsellDiscount;
    settings.UpsellMessage = dto.UpsellMessage;
    settings.UpsellProductIdsJson = SerializeProductIds(dto.UpsellProductIds);

    settings.SmartCombosMostRequested = dto.SmartCombos.MostRequested;
    settings.SmartCombosNightCombo = dto.SmartCombos.NightCombo;
    settings.SmartCombosComboForTwo = dto.SmartCombos.ComboForTwo;

    settings.WinbackEnabled = dto.Automations.WinbackEnabled;
    settings.WinbackDays = dto.Automations.WinbackDays;
    settings.TwoForOneEnabled = dto.Automations.TwoForOneEnabled;
    settings.TwoForOneDaysJson = SerializeDays(dto.Automations.TwoForOneDays);
    settings.TwoForOneProductIdsJson = SerializeProductIds(dto.Automations.TwoForOneProductIds);

    settings.HappyHourEnabled = dto.Automations.HappyHourEnabled;
    settings.HappyHourDaysJson = SerializeDays(dto.Automations.HappyHourDays);
    settings.HappyHourStart = dto.Automations.HappyHourStart;
    settings.HappyHourEnd = dto.Automations.HappyHourEnd;
    settings.HappyHourDiscount = dto.Automations.HappyHourDiscount;
    settings.HappyHourProductIdsJson = SerializeProductIds(dto.Automations.HappyHourProductIds);

    settings.PeakHourEnabled = dto.PeakHourMode.Enabled;
    settings.PeakHourHideSlowProducts = dto.PeakHourMode.HideSlowProducts;
    settings.PeakHourBoostFastProducts = dto.PeakHourMode.BoostFastProducts;
    settings.PeakHourThresholdOrders = dto.PeakHourMode.ThresholdOrders;
    settings.PeakHourStart = dto.PeakHourMode.PeakStart;
    settings.PeakHourEnd = dto.PeakHourMode.PeakEnd;

    settings.DynamicPricingEnabled = dto.DynamicPricing.Enabled;
    settings.DynamicPricingOffPeakDiscount = dto.DynamicPricing.OffPeakDiscount;
    settings.DynamicPricingOffPeakStart = dto.DynamicPricing.OffPeakStart;
    settings.DynamicPricingOffPeakEnd = dto.DynamicPricing.OffPeakEnd;
    settings.DynamicPricingPeakMessage = dto.DynamicPricing.PeakMessage;
    settings.DynamicPricingProductIdsJson = SerializeProductIds(dto.DynamicPricing.ProductIds);

    var discountPercent = ResolveDiscountPercent(dto);
    var happyHourProductIds = dto.Automations.HappyHourProductIds ?? new List<int>();
    var dynamicPricingProductIds = dto.DynamicPricing.ProductIds ?? new List<int>();

    // Combinar IDs: unión de los productos seleccionados en ambas features
    // Si no hay ninguno seleccionado en una feature activa, esa feature no aporta productos
    var allSelectedIds = new HashSet<int>();

    if (dto.Automations.HappyHourEnabled && happyHourProductIds.Count > 0)
    {
        foreach (var id in happyHourProductIds) allSelectedIds.Add(id);
    }
    if (dto.DynamicPricing.Enabled && dynamicPricingProductIds.Count > 0)
    {
        foreach (var id in dynamicPricingProductIds) allSelectedIds.Add(id);
    }

    var products = await _context.Products.ToListAsync();
    foreach (var product in products)
    {
        var shouldApplyDiscount = discountPercent > 0 && allSelectedIds.Contains(product.Id);

        if (shouldApplyDiscount)
        {
            product.DiscountPriceCents = DiscountPricingService.ApplyDiscount(product.PriceCents, discountPercent);
            product.DiscountDoublePriceCents = product.DoublePriceCents.HasValue
                ? DiscountPricingService.ApplyDiscount(product.DoublePriceCents.Value, discountPercent)
                : null;
        }
        else
        {
            product.DiscountPriceCents = null;
            product.DiscountDoublePriceCents = null;
        }
    }

    await _context.SaveChangesAsync();

    return Ok(MapToDto(settings));
}


       private static GrowthSettingsDto MapToDto(GrowthSettings settings)
{
    return new GrowthSettingsDto
    {
        UpsellEnabled = settings.UpsellEnabled,
        UpsellDiscount = settings.UpsellDiscount,
        UpsellMessage = settings.UpsellMessage,
        UpsellProductIds = DeserializeProductIds(settings.UpsellProductIdsJson),
        SmartCombos = new SmartCombosDto
        {
            MostRequested = settings.SmartCombosMostRequested,
            NightCombo = settings.SmartCombosNightCombo,
            ComboForTwo = settings.SmartCombosComboForTwo
        },
        Automations = new AutomationsDto
        {
            WinbackEnabled = settings.WinbackEnabled,
            WinbackDays = settings.WinbackDays,
            TwoForOneEnabled = settings.TwoForOneEnabled,
            TwoForOneDays = DeserializeDays(settings.TwoForOneDaysJson),
            TwoForOneProductIds = DeserializeProductIds(settings.TwoForOneProductIdsJson),
            HappyHourEnabled = settings.HappyHourEnabled,
            HappyHourDays = DeserializeDays(settings.HappyHourDaysJson),
            HappyHourStart = settings.HappyHourStart,
            HappyHourEnd = settings.HappyHourEnd,
            HappyHourDiscount = settings.HappyHourDiscount,
            HappyHourProductIds = DeserializeProductIds(settings.HappyHourProductIdsJson)
        },
        PeakHourMode = new PeakHourModeDto
        {
            Enabled = settings.PeakHourEnabled,
            HideSlowProducts = settings.PeakHourHideSlowProducts,
            BoostFastProducts = settings.PeakHourBoostFastProducts,
            ThresholdOrders = settings.PeakHourThresholdOrders,
            PeakStart = settings.PeakHourStart,
            PeakEnd = settings.PeakHourEnd
        },
        DynamicPricing = new DynamicPricingDto
        {
            Enabled = settings.DynamicPricingEnabled,
            OffPeakDiscount = settings.DynamicPricingOffPeakDiscount,
            OffPeakStart = settings.DynamicPricingOffPeakStart,
            OffPeakEnd = settings.DynamicPricingOffPeakEnd,
            PeakMessage = settings.DynamicPricingPeakMessage,
            ProductIds = DeserializeProductIds(settings.DynamicPricingProductIdsJson)
        }
    };
}
       private static string SerializeDays(List<string> days)
{
    return JsonSerializer.Serialize(days ?? new List<string>());
}

private static List<string> DeserializeDays(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return new List<string>();
    }

    try
    {
        return JsonSerializer.Deserialize<List<string>>(value) ?? new List<string>();
    }
    catch
    {
        return new List<string>();
    }
}

private static string SerializeProductIds(List<int>? ids)
{
    return JsonSerializer.Serialize(ids ?? new List<int>());
}

private static List<int> DeserializeProductIds(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return new List<int>();
    }

    try
    {
        return JsonSerializer.Deserialize<List<int>>(value) ?? new List<int>();
    }
    catch
    {
        return new List<int>();
    }
}

private static int ResolveDiscountPercent(GrowthSettingsDto dto)
{
    var discountPercent = 0;

    if (dto.Automations.HappyHourEnabled)
    {
        discountPercent = Math.Max(discountPercent, dto.Automations.HappyHourDiscount);
    }

    if (dto.DynamicPricing.Enabled)
    {
        discountPercent = Math.Max(discountPercent, dto.DynamicPricing.OffPeakDiscount);
    }

    return discountPercent;
}
    }
}
