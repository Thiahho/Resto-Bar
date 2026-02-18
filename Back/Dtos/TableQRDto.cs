namespace Back.Dtos
{
    public class TableQRDto
    {
        public int TableId { get; set; }
        public string TableName { get; set; } = null!;
        public int? SessionId { get; set; }
        public string Token { get; set; } = null!;
        public string QrCodeUrl { get; set; } = null!;
        public DateTimeOffset ExpiresAt { get; set; }
    }

    public class GenerateTableQRRequest
    {
        public int TableId { get; set; }
    }
}
