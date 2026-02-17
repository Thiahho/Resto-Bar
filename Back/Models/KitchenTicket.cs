using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Back.Models
{
    [Table("kitchen_tickets")]
    public class KitchenTicket
    {
        [Key] public int Id { get; set; }

        public int OrderId { get; set; }
        [ForeignKey(nameof(OrderId))] public Order Order { get; set; } = null!;

        [Required] public KitchenStation Station { get; set; }
        [Required] public KitchenTicketStatus Status { get; set; } = KitchenTicketStatus.PENDING;

        [Required, MaxLength(20)] public string TicketNumber { get; set; } = null!;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? StartedAt { get; set; }
        public DateTimeOffset? ReadyAt { get; set; }
        public DateTimeOffset? DeliveredAt { get; set; }

        public int? AssignedToUserId { get; set; }
        [ForeignKey(nameof(AssignedToUserId))] public User? AssignedToUser { get; set; }

        [Column(TypeName = "jsonb")]
        public string? ItemsSnapshot { get; set; }

        [MaxLength(500)] public string? Notes { get; set; }
    }
}
