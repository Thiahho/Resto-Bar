using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class CategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int SortOrder { get; set; }
        public string? DefaultStation { get; set; }
    }

    public class CreateUpdateCategoryDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; }
        public string? DefaultStation { get; set; }
    }

    public class ReorderCategoryDto
    {
        [Required]
        public int CategoryId { get; set; }
        [Required]
        public int SortOrder { get; set; }
    }
}
