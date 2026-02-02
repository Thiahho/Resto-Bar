using System.Collections.Generic;

namespace Back.Dtos
{
    public class GrowthSettingsDto
    {
        public bool UpsellEnabled { get; set; }
        public int UpsellDiscount { get; set; }
        public string UpsellMessage { get; set; } = string.Empty;
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
        public List<string> TwoForOneDays { get; set; } = new();
        public bool HappyHourEnabled { get; set; }
        public List<string> HappyHourDays { get; set; } = new();
        public string HappyHourStart { get; set; } = "18:00";
        public string HappyHourEnd { get; set; } = "20:00";
        public int HappyHourDiscount { get; set; }
    }

    public class PeakHourModeDto
    {
        public bool Enabled { get; set; }
        public bool HideSlowProducts { get; set; }
        public bool BoostFastProducts { get; set; }
        public int ThresholdOrders { get; set; }
        public string PeakStart { get; set; } = "12:00";
        public string PeakEnd { get; set; } = "14:00";
    }

    public class DynamicPricingDto
    {
        public bool Enabled { get; set; }
        public int OffPeakDiscount { get; set; }
        public string OffPeakStart { get; set; } = "18:00";
        public string OffPeakEnd { get; set; } = "20:00";
        public string PeakMessage { get; set; } = string.Empty;
    }
}
