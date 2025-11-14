using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
    [Table("user")]
    public class User
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [StringLength(150)]
        [Column("usuario")]
        public string Usuario { get; set; }

        [Required]
        [StringLength(150)]
        [Column("password")]
        public string Password { get; set; }

        [Required]
        [StringLength(150)]
        [Column("rol")]
        public string Rol { get; set; }

        // [Column("created_at")]
        // public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
