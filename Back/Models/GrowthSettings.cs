using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Back.Models
{
    [Table("growth_settings")]
    public class GrowthSettings
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; } = 1;

        // Upsell
        public bool UpsellEnabled { get; set; }
        public int UpsellDiscount { get; set; }
        [MaxLength(200)] public string? UpsellMessage { get; set; }

        // Smart Combos
        public bool SmartCombosMostRequested { get; set; }
        public bool SmartCombosNightCombo { get; set; }
        public bool SmartCombosComboForTwo { get; set; }

        // Winback
        public bool WinbackEnabled { get; set; }
        public int WinbackDays { get; set; }

        // 2x1
        public bool TwoForOneEnabled { get; set; }
        [Column(TypeName = "jsonb")] public string? TwoForOneDaysJson { get; set; }

        // Happy Hour
        public bool HappyHourEnabled { get; set; }
        [Column(TypeName = "jsonb")] public string? HappyHourDaysJson { get; set; }
        [MaxLength(5)] public string? HappyHourStart { get; set; }
        [MaxLength(5)] public string? HappyHourEnd { get; set; }
        public int HappyHourDiscount { get; set; }

        // Peak Hour Mode
        public bool PeakHourEnabled { get; set; }
        public bool PeakHourHideSlowProducts { get; set; }
        public bool PeakHourBoostFastProducts { get; set; }
        public int PeakHourThresholdOrders { get; set; }
        [MaxLength(5)] public string? PeakHourStart { get; set; }
        [MaxLength(5)] public string? PeakHourEnd { get; set; }

        // Dynamic Pricing
        public bool DynamicPricingEnabled { get; set; }
        public int DynamicPricingOffPeakDiscount { get; set; }
        [MaxLength(5)] public string? DynamicPricingOffPeakStart { get; set; }
        [MaxLength(5)] public string? DynamicPricingOffPeakEnd { get; set; }
        [MaxLength(200)] public string? DynamicPricingPeakMessage { get; set; }
    }
}
