using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
    [Table("categories")]
    public class Category
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(120)] public string Name { get; set; } = null!;
        public int SortOrder { get; set; }
        public List<Product> Products { get; set; } = new();
    }
}
