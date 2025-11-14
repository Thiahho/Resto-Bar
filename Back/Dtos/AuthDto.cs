using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class LoginRequest
    {
        [Required]
        public string Usuario { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class RegisterRequest
    {
        [Required]
        [StringLength(150)]
        public string Usuario { get; set; }

        [Required]
        [StringLength(150)]
        public string Password { get; set; }

        [Required]
        [StringLength(150)]
        public string Rol { get; set; }
    }

    public class LoginResponse
    {
        public string Token { get; set; }
        public string Usuario { get; set; }
        public string Rol { get; set; }
    }
}
