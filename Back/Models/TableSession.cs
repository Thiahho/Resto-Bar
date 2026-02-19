using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Back.Models
{
    [Table("table_sessions")]
    public class TableSession
    {
        [Key] public int Id { get; set; }

        public int TableId { get; set; }
        [ForeignKey(nameof(TableId))] public Table Table { get; set; } = null!;

        [MaxLength(120)] public string? CustomerName { get; set; }
        public int GuestCount { get; set; } = 1;

        public DateTimeOffset OpenedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? ClosedAt { get; set; }

        [Required] public TableSessionStatus Status { get; set; } = TableSessionStatus.ACTIVE;

        public int? OpenedByUserId { get; set; }
        [ForeignKey(nameof(OpenedByUserId))] public User? OpenedByUser { get; set; }

        public int? ClosedByUserId { get; set; }
        [ForeignKey(nameof(ClosedByUserId))] public User? ClosedByUser { get; set; }

        public int? AssignedWaiterId { get; set; }
        [ForeignKey(nameof(AssignedWaiterId))] public User? AssignedWaiter { get; set; }

        public int SubtotalCents { get; set; } = 0;
        public int TotalCents { get; set; } = 0;

        [MaxLength(500)] public string? Notes { get; set; }

        [MaxLength(20)] public string? PaymentMethod { get; set; }  // "CASH" | "CARD" | "TRANSFER"
        public int TipCents { get; set; } = 0;
        public DateTimeOffset? PaidAt { get; set; }

        // Navigation
        public List<Order> Orders { get; set; } = new();
    }
}
