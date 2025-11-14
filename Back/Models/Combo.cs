using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("combos")]
public class Combo {
  [Key] public int Id { get; set; }
  [Required, MaxLength(160)] public string Name { get; set; } = null!;
  public int priceCents { get; set; }
  public bool IsActive { get; set; } = true;

  public List<ComboItem> Items { get; set; } = new();
}
}
