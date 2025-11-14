using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
   [Table("orderstatus")]
    public class OrderStatusEntity {
    [Key] public int Id { get; set; }
    public string? Estado { get; set; }
    public bool Activo { get; set; } = true;
    }
}
