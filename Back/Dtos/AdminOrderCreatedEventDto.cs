namespace Back.Dtos
{
    public class AdminOrderCreatedEventDto
    {
        public int Id { get; set; }
        public int? BranchId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string TakeMode { get; set; } = string.Empty;
        public int TotalCents { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }

    }
}
