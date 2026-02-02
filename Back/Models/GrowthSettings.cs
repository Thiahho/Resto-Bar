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

        public bool UpsellEnabled { get; set; } = true;
        public int UpsellDiscount { get; set; } = 15;
        [MaxLength(200)] public string UpsellMessage { get; set; } = "Agrega papas + bebida con 15% OFF";

        public bool SmartCombosMostRequested { get; set; } = true;
        public bool SmartCombosNightCombo { get; set; } = true;
        public bool SmartCombosComboForTwo { get; set; } = true;

        public bool WinbackEnabled { get; set; } = true;
        public int WinbackDays { get; set; } = 15;

        public bool TwoForOneEnabled { get; set; } = false;
        [Column(TypeName = "jsonb")] public string TwoForOneDaysJson { get; set; } = "[]";

        public bool HappyHourEnabled { get; set; } = true;
        [Column(TypeName = "jsonb")] public string HappyHourDaysJson { get; set; } = "[]";
        [MaxLength(5)] public string HappyHourStart { get; set; } = "18:00";
        [MaxLength(5)] public string HappyHourEnd { get; set; } = "20:00";
        public int HappyHourDiscount { get; set; } = 10;

        public bool PeakHourEnabled { get; set; } = false;
        public bool PeakHourHideSlowProducts { get; set; } = true;
        public bool PeakHourBoostFastProducts { get; set; } = true;
        public int PeakHourThresholdOrders { get; set; } = 18;
        [MaxLength(5)] public string PeakHourStart { get; set; } = "12:00";
        [MaxLength(5)] public string PeakHourEnd { get; set; } = "14:00";

        public bool DynamicPricingEnabled { get; set; } = false;
        public int DynamicPricingOffPeakDiscount { get; set; } = 10;
        [MaxLength(5)] public string DynamicPricingOffPeakStart { get; set; } = "18:00";
        [MaxLength(5)] public string DynamicPricingOffPeakEnd { get; set; } = "20:00";
        [MaxLength(200)] public string DynamicPricingPeakMessage { get; set; } = "Precio normal en hora pico";
    }
}
