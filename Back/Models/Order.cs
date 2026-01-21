using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
  [Table("orders")]
  public class Order {
    [Key] public int Id { get; set; }
    public int? BranchId { get; set; }
    [ForeignKey(nameof(BranchId))] public Branch? Branch { get; set; }

    [Required, MaxLength(120)] public string CustomerName { get; set; } = null!;
    [Required, MaxLength(40)] public string Phone { get; set; } = null!;
    [Required, MaxLength(20)] public string Channel { get; set; } = "WEB";
    [Required, MaxLength(20)] public string TakeMode { get; set; } = "TAKEAWAY";
    [MaxLength(200)] public string? Address { get; set; }
    [MaxLength(200)] public string? Reference { get; set; }
    public DateTimeOffset? ScheduledAt { get; set; }
    [MaxLength(500)] public string? Note { get; set; }
    [MaxLength(12)] public string? PublicCode { get; set; }

    public int SubtotalCents { get; set; }
    public int DiscountCents { get; set; }
    public int TipCents { get; set; } = 0;
    public int TotalCents { get; set; }

    [Required] public OrderStatus Status { get; set; } = OrderStatus.CREATED;
    public int? CreatedBy { get; set; } // users.id
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<OrderItem> Items { get; set; } = new();
    public List<OrderStatusHistory> StatusHistory { get; set; } = new();
  }
}
