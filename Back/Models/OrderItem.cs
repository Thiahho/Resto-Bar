using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("order_items")]
public class OrderItem {
  [Key] public int Id { get; set; }
  [Required] public int OrderId { get; set; }
  [ForeignKey(nameof(OrderId))] public Order? Order { get; set; }

  public int? ProductId { get; set; } // puede quedar null si se borró el producto
  [MaxLength(160)] public string NameSnapshot { get; set; } = null!;
  public int Qty { get; set; }
  public int UnitPriceCents { get; set; }
  public int ModifiersTotalCents { get; set; }
  public int LineTotalCents { get; set; }

  // JSON con los detalles de los modificadores seleccionados
  [Column(TypeName = "jsonb")]
  public string? ModifiersSnapshot { get; set; }
}
}
