using System.Collections.Generic;

namespace Back.Dtos
{
    public class GrowthSettingsDto
    {
        public bool UpsellEnabled { get; set; }
        public int UpsellDiscount { get; set; }
        public string? UpsellMessage { get; set; }
        public SmartCombosDto SmartCombos { get; set; } = new();
        public AutomationsDto Automations { get; set; } = new();
        public PeakHourModeDto PeakHourMode { get; set; } = new();
        public DynamicPricingDto DynamicPricing { get; set; } = new();
    }

    public class SmartCombosDto
    {
        public bool MostRequested { get; set; }
        public bool NightCombo { get; set; }
        public bool ComboForTwo { get; set; }
    }

    public class AutomationsDto
    {
        public bool WinbackEnabled { get; set; }
        public int WinbackDays { get; set; }
        public bool TwoForOneEnabled { get; set; }
        public List<string>? TwoForOneDays { get; set; }
        public List<int>? TwoForOneProductIds { get; set; }
        public bool HappyHourEnabled { get; set; }
        public List<string>? HappyHourDays { get; set; }
        public string? HappyHourStart { get; set; }
        public string? HappyHourEnd { get; set; }
        public int HappyHourDiscount { get; set; }
    }

    public class PeakHourModeDto
    {
        public bool Enabled { get; set; }
        public bool HideSlowProducts { get; set; }
        public bool BoostFastProducts { get; set; }
        public int ThresholdOrders { get; set; }
        public string? PeakStart { get; set; }
        public string? PeakEnd { get; set; }
    }

    public class DynamicPricingDto
    {
        public bool Enabled { get; set; }
        public int OffPeakDiscount { get; set; }
        public string? OffPeakStart { get; set; }
        public string? OffPeakEnd { get; set; }
        public string? PeakMessage { get; set; }
    }
}
