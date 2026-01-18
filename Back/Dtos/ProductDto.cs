using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class ProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int PriceCents { get; set; }
        public bool HasImage { get; set; } // Indica si el producto tiene imagen
        public int CategoryId { get; set; }
        public string CategoryName { get; set; }
        public int DisplayOrder { get; set; }
        public int? DoublePriceCents {get;set;}

    }

    public class CreateProductDto
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public string Description { get; set; }
        [Required]
        public int PriceCents { get; set; }
        public int? DoublePriceCents {get;set;}

        [Required]
        public int CategoryId { get; set; }
        public IFormFile? ImageData { get; set; }
    }

    public class UpdateProductDto
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public string Description { get; set; }
        [Required]
        public int PriceCents { get; set; }
        public int? DoublePriceCents {get;set;}

        [Required]
        public int CategoryId { get; set; }
        public IFormFile? ImageData { get; set; }
    }

    public class ReorderProductDto
    {
        [Required]
        public int ProductId { get; set; }
        [Required]
        public int DisplayOrder { get; set; }
    }
}
