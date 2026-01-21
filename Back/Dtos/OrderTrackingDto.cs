namespace Back.Dtos
{
    public class OrderTrackingDto
    {
        public int OrderId { get; set; }
        public string PublicCode { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public string TakeMode { get; set; } = "";
        public string? Address { get; set; }
        public string? Reference { get; set; }
        public DateTimeOffset? ScheduledAt { get; set; }
        public string? Note { get; set; }
        public int SubtotalCents { get; set; }
        public int DiscountCents { get; set; }
        public int TipCents { get; set; }
        public int TotalCents { get; set; }
        public List<OrderItemDto> Items { get; set; } = new();
        public List<OrderTrackingHistoryDto> History { get; set; } = new();
    }

    public class OrderTrackingHistoryDto
    {
        public string Status { get; set; } = "";
        public DateTimeOffset ChangedAt { get; set; }
    }
}
