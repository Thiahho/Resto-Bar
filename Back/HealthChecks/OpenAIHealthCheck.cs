using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Back.HealthChecks
{
    public class OpenAIHealthCheck : IHealthCheck
    {
        private readonly IConfiguration _configuration;

        public OpenAIHealthCheck(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var apiKey = _configuration["OpenAI:ApiKey"];
                var model = _configuration["OpenAI:Model"];

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    return Task.FromResult(HealthCheckResult.Unhealthy(
                        "OpenAI API Key no está configurada"));
                }

                if (apiKey == "sk-proj-YOUR_OPENAI_API_KEY_HERE")
                {
                    return Task.FromResult(HealthCheckResult.Unhealthy(
                        "OpenAI API Key no ha sido reemplazada del valor de ejemplo"));
                }

                if (string.IsNullOrWhiteSpace(model))
                {
                    return Task.FromResult(HealthCheckResult.Degraded(
                        "OpenAI Model no está configurado, se usará el default"));
                }

                return Task.FromResult(HealthCheckResult.Healthy(
                    $"OpenAI configurado correctamente (Model: {model})"));
            }
            catch (Exception ex)
            {
                return Task.FromResult(HealthCheckResult.Unhealthy(
                    "Error al verificar configuración de OpenAI",
                    ex));
            }
        }
    }
}
