using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class UpdateOrderStatusDto
    {
        [Required]
        public string Status { get; set; } = null!;
    }
}
