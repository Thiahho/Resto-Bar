using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("product_modifiers")]
public class ProductModifier {
  public int ProductId { get; set; }
  public int ModifierId { get; set; }

  [ForeignKey(nameof(ProductId))] public Product? Product { get; set; }
  [ForeignKey(nameof(ModifierId))] public Modifier? Modifier { get; set; }
}
}
