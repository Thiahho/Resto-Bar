using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("modifiers")]
  public class Modifier {
    [Key] public int Id { get; set; }
    [Required, MaxLength(120)] public string Name { get; set; } = null!;
    [Column("price_cents_delta")] public int PriceCentsDelta { get; set; }
    [MaxLength(50)] public string? Category { get; set; }
    public bool IsActive { get; set; } = true;

    public List<ProductModifier> ProductModifiers { get; set; } = new();
  }
}
