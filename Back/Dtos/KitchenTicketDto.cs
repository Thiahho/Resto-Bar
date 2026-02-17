namespace Back.Dtos
{
    public class KitchenTicketDto
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public string Station { get; set; } = null!;
        public string Status { get; set; } = "PENDING";
        public string TicketNumber { get; set; } = null!;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? StartedAt { get; set; }
        public DateTimeOffset? ReadyAt { get; set; }
        public DateTimeOffset? DeliveredAt { get; set; }
        public int? AssignedToUserId { get; set; }
        public string? AssignedToUserName { get; set; }
        public string? ItemsSnapshot { get; set; }
        public string? Notes { get; set; }
    }
}
