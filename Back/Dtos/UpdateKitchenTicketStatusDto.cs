using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class UpdateKitchenTicketStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;  // "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED"
        public string? Notes { get; set; }
    }
}
