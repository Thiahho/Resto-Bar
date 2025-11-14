using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class ComboItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public int Qty { get; set; }
    }

    public class ComboDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int PriceCents { get; set; }
        public bool IsActive { get; set; }
        public List<ComboItemDto> Items { get; set; } = new();
    }

    public class CreateComboDto
    {
        [Required, MaxLength(160)]
        public string Name { get; set; } = null!;

        [Required]
        public int PriceCents { get; set; }

        public bool IsActive { get; set; } = true;

        [Required]
        public List<ComboItemCreateDto> Items { get; set; } = new();
    }

    public class ComboItemCreateDto
    {
        [Required]
        public int ProductId { get; set; }

        [Required]
        public int Qty { get; set; }
    }
}
