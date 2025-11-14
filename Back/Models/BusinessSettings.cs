using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
    [Table("business_settings")]
    public class BusinessSettings {
    [Key] public short Id { get; set; } = 1;
    [Required, MaxLength(160)] public string Name { get; set; } = "Cartelito";
    [MaxLength(160)] public string? BannerTitle { get; set; }
    [MaxLength(200)] public string? BannerSubtitle { get; set; }
    [MaxLength(40)] public string? PhoneWa { get; set; }
    [MaxLength(200)] public string? Address { get; set; }
    [MaxLength(160)] public string? Instagram { get; set; }
    [MaxLength(160)] public string? Facebook { get; set; }
    [MaxLength(160)] public string? Tiktok { get; set; }
    [Column(TypeName = "jsonb")] public string? OpeningHours { get; set; }
    }
}
