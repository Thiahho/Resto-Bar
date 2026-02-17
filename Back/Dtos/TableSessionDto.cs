using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class TableSessionDto
    {
        public int Id { get; set; }
        public int TableId { get; set; }
        public string? TableName { get; set; }
        public string? CustomerName { get; set; }
        public int GuestCount { get; set; }
        public DateTimeOffset OpenedAt { get; set; }
        public DateTimeOffset? ClosedAt { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public int? OpenedByUserId { get; set; }
        public string? OpenedByUserName { get; set; }
        public int? ClosedByUserId { get; set; }
        public string? ClosedByUserName { get; set; }
        public int SubtotalCents { get; set; }
        public int TotalCents { get; set; }
        public string? Notes { get; set; }
        public List<OrderDto> Orders { get; set; } = new();
    }

    public class OpenTableSessionDto
    {
        [MaxLength(120)]
        public string? CustomerName { get; set; }

        [Required, Range(1, 50)]
        public int GuestCount { get; set; } = 1;

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class CloseTableSessionDto
    {
        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class CreateTableOrderDto
    {
        [Required]
        public List<OrderItemDto> Items { get; set; } = new();

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
