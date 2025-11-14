using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{

[Table("audit_logs")]
public class AuditLog {
  [Key] public long Id { get; set; }
  [Required, MaxLength(60)] public string Entity { get; set; } = null!;
  [Required, MaxLength(60)] public string EntityId { get; set; } = null!;
  [Required, MaxLength(60)] public string Action { get; set; } = null!;
  public int? ByUser { get; set; }
  public string? Meta { get; set; } // jsonb
  public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}
}
