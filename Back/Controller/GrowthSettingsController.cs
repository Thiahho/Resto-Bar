using System.Text.Json;
using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

            settings.SmartCombosMostRequested = dto.SmartCombos.MostRequested;
            settings.SmartCombosNightCombo = dto.SmartCombos.NightCombo;
            settings.SmartCombosComboForTwo = dto.SmartCombos.ComboForTwo;

            settings.WinbackEnabled = dto.Automations.WinbackEnabled;
            settings.WinbackDays = dto.Automations.WinbackDays;
            settings.TwoForOneEnabled = dto.Automations.TwoForOneEnabled;
            settings.TwoForOneDaysJson = SerializeDays(dto.Automations.TwoForOneDays);

            settings.HappyHourEnabled = dto.Automations.HappyHourEnabled;
            settings.HappyHourDaysJson = SerializeDays(dto.Automations.HappyHourDays);
            settings.HappyHourStart = dto.Automations.HappyHourStart;
            settings.HappyHourEnd = dto.Automations.HappyHourEnd;
            settings.HappyHourDiscount = dto.Automations.HappyHourDiscount;

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
                    HappyHourEnabled = settings.HappyHourEnabled,
                    HappyHourDays = DeserializeDays(settings.HappyHourDaysJson),
                    HappyHourStart = settings.HappyHourStart,
                    HappyHourEnd = settings.HappyHourEnd,
                    HappyHourDiscount = settings.HappyHourDiscount
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
                    PeakMessage = settings.DynamicPricingPeakMessage
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
    }
}
