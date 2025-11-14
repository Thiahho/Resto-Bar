using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("branches")]
public class Branch {
  [Key] public int Id { get; set; }
  [Required, MaxLength(120)] public string Name { get; set; } = null!;
  [MaxLength(40)] public string? Phone { get; set; }
  [MaxLength(40)] public string? WaNumber { get; set; }
  [MaxLength(200)] public string? Address { get; set; }
  public bool IsActive { get; set; } = true;
  public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
}
