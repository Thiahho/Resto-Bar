namespace Back.Models
{
    public class UserPushSubscription
    {
        public int Id { get; set; }
        public string Endpoint { get; set; } = "";
        public string P256dh { get; set; } = "";
        public string Auth { get; set; } = "";
        public string? Station { get; set; }  // null = all stations
        public string? UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
