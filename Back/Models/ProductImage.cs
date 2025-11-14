using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("product_images")]
public class ProductImage {
  [Key] public int Id { get; set; }
  [Required] public int ProductId { get; set; }
  [ForeignKey(nameof(ProductId))] public Product? Product { get; set; }

  [Required, MaxLength(50)] public string Mime { get; set; } = "image/webp";
  [Required] public byte[] Bytes { get; set; } = Array.Empty<byte>();
  public int Width { get; set; }
  public int Height { get; set; }
  public int SizeBytes { get; set; }
  public bool IsPrimary { get; set; } = true;
  public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
}
