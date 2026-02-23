using Back.Data;
using Back.Dtos;
using Back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Back.Controller
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("api")]
    public class AdminController : ControllerBase
    {
        private readonly IInsightsService _insightsService;
        private readonly IIAInsightsService _iaInsightsService;
        private readonly AppDbContext _context;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            IInsightsService insightsService,
            IIAInsightsService iaInsightsService,
            AppDbContext context,
            ILogger<AdminController> logger)
        {
            _insightsService = insightsService;
            _iaInsightsService = iaInsightsService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obtiene métricas diarias sin procesamiento de IA
        /// </summary>
        /// <param name="date">Fecha en formato YYYY-MM-DD</param>
        /// <param name="ct">Cancellation token</param>
        [HttpGet("api/admin/insights/daily")]
        public async Task<IActionResult> GetDailyMetrics(
            [FromQuery] string date,
            CancellationToken ct)
        {
            try
            {
                // Validar formato de fecha
                if (!DateOnly.TryParse(date, out var parsedDate))
                {
                    return BadRequest(new { message = "Formato de fecha inválido. Use YYYY-MM-DD" });
                }

                // No permitir fechas futuras
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (parsedDate > today)
                {
                    return BadRequest(new { message = "No se pueden obtener métricas de fechas futuras" });
                }

                var metrics = await _insightsService.GetDailyMetricsAsync(parsedDate, ct);

                _logger.LogInformation("Métricas obtenidas para {Date}: {OrdersDelivered} órdenes entregadas", parsedDate, metrics.OrdersDelivered);

                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener métricas diarias para {Date}", date);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        /// <summary>
        /// Genera resumen diario con IA
        /// </summary>
        /// <param name="request">Request con fecha YYYY-MM-DD</param>
        /// <param name="ct">Cancellation token</param>
        [HttpPost("api/admin/insights/daily/summary")]
        [EnableRateLimiting("ai")]
        public async Task<IActionResult> GenerateDailySummary(
            [FromBody] GenerateSummaryRequest request,
            CancellationToken ct)
        {
            try
            {
                // Validar formato de fecha
                if (!DateOnly.TryParse(request.Date, out var parsedDate))
                {
                    return BadRequest(new { message = "Formato de fecha inválido. Use YYYY-MM-DD" });
                }

                // No permitir fechas futuras
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (parsedDate > today)
                {
                    return BadRequest(new { message = "No se pueden generar resúmenes de fechas futuras" });
                }

                // Obtener métricas
                var metrics = await _insightsService.GetDailyMetricsAsync(parsedDate, ct);

                // Si no hay ventas, no generar resumen con IA
                if (metrics.OrdersDelivered == 0)
                {
                    _logger.LogInformation(
                        "No hay órdenes entregadas para {Date}, omitiendo generación de IA",
                        parsedDate);

                    return Ok(new
                    {
                        message = "No hay datos suficientes para generar resumen",
                        fallback = true,
                        metrics
                    });
                }

                // Obtener ID de usuario del token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                int? userId = userIdClaim != null ? int.Parse(userIdClaim) : null;

                // Generar resumen con IA
                var summary = await _iaInsightsService.GenerateDailySummaryAsync(
                    metrics,
                    parsedDate,
                    userId,
                    ct);

                // Si falla la IA, devolver fallback con métricas
                if (summary == null)
                {
                    _logger.LogWarning(
                        "No se pudo generar resumen IA para {Date}, devolviendo fallback",
                        parsedDate);

                    return Ok(new
                    {
                        message = "No se pudo generar resumen IA, se devuelven métricas brutas",
                        fallback = true,
                        metrics
                    });
                }

                // Adjuntar métricas al resumen
                var result = summary with { Metrics = metrics };

                _logger.LogInformation(
                    "Resumen IA generado exitosamente para {Date}",
                    parsedDate);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar resumen IA para {Date}", request.Date);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        /// <summary>
        /// Obtiene estadísticas de uso de IA de los últimos 30 días
        /// </summary>
        [HttpGet("api/admin/insights/ia-usage")]
        public async Task<IActionResult> GetIAUsageStats(CancellationToken ct)
        {
            try
            {
                var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);

                var auditLogs = await _context.AuditLogs
                    .AsNoTracking()
                    .Where(a => a.Entity == "IAInsights"
                             && a.Action == "GenerateSummary"
                             && a.At >= thirtyDaysAgo)
                    .OrderByDescending(a => a.At)
                    .ToListAsync(ct);

                var totalCalls = auditLogs.Count;
                var totalTokens = 0;
                var totalPromptTokens = 0;
                var totalCompletionTokens = 0;
                var successfulCalls = 0;
                var failedCalls = 0;
                var cacheHits = 0;

                var dailyBreakdown = new Dictionary<string, object>();

                foreach (var log in auditLogs)
                {
                    if (string.IsNullOrWhiteSpace(log.Meta))
                        continue;

                    try
                    {
                        var meta = JsonDocument.Parse(log.Meta);

                        var tokens = meta.RootElement.GetProperty("TotalTokens").GetInt32();
                        var promptTokens = meta.RootElement.GetProperty("PromptTokens").GetInt32();
                        var completionTokens = meta.RootElement.GetProperty("CompletionTokens").GetInt32();
                        var success = meta.RootElement.GetProperty("Success").GetBoolean();
                        var cacheHit = meta.RootElement.TryGetProperty("CacheHit", out var ch)
                            ? ch.GetBoolean()
                            : false;

                        totalTokens += tokens;
                        totalPromptTokens += promptTokens;
                        totalCompletionTokens += completionTokens;

                        if (success)
                            successfulCalls++;
                        else
                            failedCalls++;

                        if (cacheHit)
                            cacheHits++;

                        // Agregar a breakdown diario
                        var date = log.At.ToString("yyyy-MM-dd");
                        if (!dailyBreakdown.ContainsKey(date))
                        {
                            dailyBreakdown[date] = new
                            {
                                calls = 0,
                                tokens = 0,
                                successful = 0,
                                failed = 0
                            };
                        }

                        var current = dailyBreakdown[date];
                        var currentDict = JsonSerializer.Deserialize<Dictionary<string, int>>(
                            JsonSerializer.Serialize(current)) ?? new();

                        currentDict["calls"]++;
                        currentDict["tokens"] += tokens;
                        currentDict["successful"] += success ? 1 : 0;
                        currentDict["failed"] += success ? 0 : 1;

                        dailyBreakdown[date] = currentDict;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error al parsear metadata de audit log {Id}", log.Id);
                    }
                }

                // Calcular costo estimado (GPT-4o-mini: $0.15/1M input, $0.60/1M output)
                var inputCost = (totalPromptTokens / 1_000_000.0) * 0.15;
                var outputCost = (totalCompletionTokens / 1_000_000.0) * 0.60;
                var estimatedCostUsd = inputCost + outputCost;

                var result = new
                {
                    period_days = 30,
                    total_calls = totalCalls,
                    successful_calls = successfulCalls,
                    failed_calls = failedCalls,
                    cache_hits = cacheHits,
                    cache_hit_rate = totalCalls > 0 ? (double)cacheHits / totalCalls : 0,
                    total_tokens = totalTokens,
                    prompt_tokens = totalPromptTokens,
                    completion_tokens = totalCompletionTokens,
                    estimated_cost_usd = Math.Round(estimatedCostUsd, 4),
                    daily_breakdown = dailyBreakdown
                        .OrderByDescending(kv => kv.Key)
                        .Take(30)
                        .ToDictionary(kv => kv.Key, kv => kv.Value)
                };

                _logger.LogInformation(
                    "Estadísticas IA consultadas: {TotalCalls} llamadas, ${Cost} USD",
                    totalCalls,
                    estimatedCostUsd);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener estadísticas de uso de IA");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }
}
