using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Back.Models
{
    [Table("order_status_history")]
    public class OrderStatusHistory
    {
        [Key] public int Id { get; set; }

        [Required] public int OrderId { get; set; }
        [ForeignKey(nameof(OrderId))] public Order Order { get; set; } = null!;

        [Required] public OrderStatus Status { get; set; }

        public int? ChangedByUserId { get; set; }
        [ForeignKey(nameof(ChangedByUserId))] public User? ChangedBy { get; set; }

        public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
