using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
   [Table("products")]
    public class Product {
    [Key] public int Id { get; set; }
    [Required] public int CategoryId { get; set; }
    [ForeignKey(nameof(CategoryId))] public Category? Category { get; set; }

    [Required, MaxLength(160)] public string Name { get; set; } = null!;
    public string? Description { get; set; }
    [Column("price")] public int PriceCents { get; set; }
    [Column("discount_price")] public int? DiscountPriceCents { get; set; }
    public byte[]? ImageData { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public int? DoublePriceCents {get;set;}
    [Column("discount_double_price")] public int? DiscountDoublePriceCents { get; set; }
    public List<ProductModifier> ProductModifiers { get; set; } = new();
    // public List<ProductImage> Images { get; set; } = new(); // TODO: Descomentar cuando exista la tabla
    
    }
}
