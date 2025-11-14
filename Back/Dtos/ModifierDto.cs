using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class ModifierDto
    {
        public int Id { get; set; }

        [Required, MaxLength(120)]
        public string Name { get; set; } = null!;

        public int PriceCentsDelta { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class CreateModifierDto
    {
        [Required, MaxLength(120)]
        public string Name { get; set; } = null!;

        public int PriceCentsDelta { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateModifierDto
    {
        [MaxLength(120)]
        public string? Name { get; set; }

        public int? PriceCentsDelta { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        public bool? IsActive { get; set; }
    }

    public class ModifierWithProductsDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int PriceCentsDelta { get; set; }
        public string? Category { get; set; }
        public bool IsActive { get; set; }
        public List<ProductInfoDto> AssociatedProducts { get; set; } = new();
    }

    public class ProductInfoDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
    }
}
