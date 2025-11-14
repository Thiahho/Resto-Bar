using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class OrderDto
    {
        public int Id { get; set; }
        public int? BranchId { get; set; }
        public string CustomerName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Channel { get; set; } = "WEB";
        public string TakeMode { get; set; } = "TAKEAWAY";
        public string? Address { get; set; }
        public string? Reference { get; set; }
        public DateTimeOffset? ScheduledAt { get; set; }
        public string? Note { get; set; }
        public int SubtotalCents { get; set; }
        public int DiscountCents { get; set; }
        public int TipCents { get; set; }
        public int TotalCents { get; set; }
        public string Status { get; set; } = "CREATED";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public List<OrderItemDto> Items { get; set; } = new();
    }

}
