using System.Text.RegularExpressions;

namespace Back.Validators
{
    public static class PasswordValidator
    {
        private const int MinLength = 8;
        private const int MaxLength = 128;

        public static (bool IsValid, List<string> Errors) ValidatePassword(string password)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(password))
            {
                errors.Add("La contraseña es requerida");
                return (false, errors);
            }

            if (password.Length < MinLength)
            {
                errors.Add($"La contraseña debe tener al menos {MinLength} caracteres");
            }

            if (password.Length > MaxLength)
            {
                errors.Add($"La contraseña no puede tener más de {MaxLength} caracteres");
            }

            if (!Regex.IsMatch(password, @"[A-Z]"))
            {
                errors.Add("La contraseña debe contener al menos una letra mayúscula");
            }

            if (!Regex.IsMatch(password, @"[a-z]"))
            {
                errors.Add("La contraseña debe contener al menos una letra minúscula");
            }

            if (!Regex.IsMatch(password, @"[0-9]"))
            {
                errors.Add("La contraseña debe contener al menos un número");
            }

            if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>/?]"))
            {
                errors.Add("La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}; etc.)");
            }

            // Verificar que no tenga espacios
            if (password.Contains(' '))
            {
                errors.Add("La contraseña no debe contener espacios");
            }

            return (errors.Count == 0, errors);
        }
    }
}
