using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
[Table("combo_items")]
public class ComboItem {
  public int ComboId { get; set; }
  public int ProductId { get; set; }
  public int Qty { get; set; }

  [ForeignKey(nameof(ComboId))] public Combo? Combo { get; set; }
  [ForeignKey(nameof(ProductId))] public Product? Product { get; set; }
}
}
