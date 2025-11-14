using Back.Models;
using System.Text.Json;

namespace Back.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // Solo verificar que las tablas existan
            // No insertar datos automáticamente - los datos deben estar en la base de datos

            try
            {
                // Verificar que las tablas existen haciendo una consulta simple
                var tablesExist = context.Categories.Any() || !context.Categories.Any();
            }
            catch (Exception ex)
            {
                // Si las tablas no existen, fallar con mensaje claro
                throw new Exception("Las tablas de la base de datos no existen. Ejecuta el script BD/bd_fixed.sql primero.", ex);
            }

            // No insertar datos - la aplicación mostrará solo lo que está en la base de datos
        }
    }
}
