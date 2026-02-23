using Azure.AI.OpenAI;
using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using OpenAI.Chat;
using System.ClientModel;
using System.Diagnostics;
using System.Text.Json;

namespace Back.Services
{
    public interface IIAInsightsService
    {
        Task<DailySummaryDto?> GenerateDailySummaryAsync(
            DailyMetricsDto metrics,
            DateOnly date,
            int? userId,
            CancellationToken ct);
    }

    public sealed class IAInsightsService : IIAInsightsService
    {
        private const int PROMPT_VERSION = 1;
        private const int MAX_RETRIES = 1;
        private const int MAX_RECOMMENDATIONS = 3;

        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<IAInsightsService> _logger;
        private readonly IMemoryCache _cache;
        private readonly ChatClient _chatClient;

        public IAInsightsService(
            AppDbContext context,
            IConfiguration configuration,
            ILogger<IAInsightsService> logger,
            IMemoryCache cache)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _cache = cache;

            var apiKey = _configuration["OpenAI:ApiKey"]
                ?? throw new InvalidOperationException("OpenAI API Key no configurada");

            var model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini";

            _chatClient = new AzureOpenAIClient(new ApiKeyCredential(apiKey))
                .GetChatClient(model);
        }

        public async Task<DailySummaryDto?> GenerateDailySummaryAsync(
            DailyMetricsDto metrics,
            DateOnly date,
            int? userId,
            CancellationToken ct)
        {
            var cacheKey = $"ia_summary_{date:yyyy-MM-dd}";

            // Intentar obtener del cache
            if (_cache.TryGetValue(cacheKey, out DailySummaryDto? cachedSummary) && cachedSummary != null)
            {
                _logger.LogInformation("Cache HIT para resumen IA de {Date}", date);

                // Marcar en metadata que vino del cache
                var metadata = cachedSummary.AuditMetadata with { CacheHit = true };
                return cachedSummary with { AuditMetadata = metadata };
            }

            _logger.LogInformation(
                "Cache MISS - Generando resumen IA para {Date} (Usuario: {UserId})",
                date,
                userId);

            var sw = Stopwatch.StartNew();
            DailySummaryDto? summary = null;
            IAuditMetadata? auditMetadata = null;
            Exception? lastError = null;

            // Intentar generar resumen (con 1 retry)
            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++)
            {
                try
                {
                    var result = await CallOpenAIAsync(metrics, date, ct);
                    summary = result.Summary;
                    auditMetadata = result.Metadata;

                    // Validar resumen
                    if (!ValidateSummary(summary))
                    {
                        _logger.LogWarning(
                            "Resumen IA inválido en intento {Attempt}. Reintentando...",
                            attempt + 1);
                        continue;
                    }

                    _logger.LogInformation(
                        "Resumen IA generado exitosamente. Tokens: {Tokens}, Latencia: {LatencyMs}ms",
                        auditMetadata.TotalTokens,
                        auditMetadata.LatencyMs);

                    break; // Éxito
                }
                catch (Exception ex)
                {
                    lastError = ex;
                    _logger.LogError(
                        ex,
                        "Error al generar resumen IA (intento {Attempt}/{MaxRetries})",
                        attempt + 1,
                        MAX_RETRIES + 1);

                    if (attempt == MAX_RETRIES)
                    {
                        _logger.LogError(
                            "No se pudo generar resumen después de {Retries} intentos",
                            MAX_RETRIES + 1);

                        auditMetadata = new IAuditMetadata
                        {
                            Model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini",
                            PromptVersion = PROMPT_VERSION,
                            TotalTokens = 0,
                            PromptTokens = 0,
                            CompletionTokens = 0,
                            LatencyMs = sw.ElapsedMilliseconds,
                            Success = false,
                            ErrorMessage = ex.Message,
                            CacheHit = false
                        };
                    }
                }
            }

            // Auditar llamada
            await AuditIACallAsync(date, userId, auditMetadata, ct);

            // Guardar en cache si se generó exitosamente
            if (summary != null && auditMetadata != null)
            {
                var summaryWithMetadata = summary with { AuditMetadata = auditMetadata };

                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var ttl = date == today
                    ? TimeSpan.FromMinutes(10)  // Hoy: 10 minutos
                    : TimeSpan.FromHours(24);   // Pasado: 24 horas

                _cache.Set(cacheKey, summaryWithMetadata, ttl);

                _logger.LogInformation(
                    "Resumen IA cacheado para {Date} con TTL de {TTL}",
                    date,
                    ttl);

                return summaryWithMetadata;
            }

            return summary;
        }

        private async Task<(DailySummaryDto Summary, IAuditMetadata Metadata)> CallOpenAIAsync(
            DailyMetricsDto metrics,
            DateOnly date,
            CancellationToken ct)
        {
            var sw = Stopwatch.StartNew();

            var systemPrompt = BuildSystemPrompt();
            var metricsPayload = BuildMetricsPayload(metrics, date);

            var maxTokens = int.Parse(_configuration["OpenAI:MaxTokens"] ?? "800");
            var temperature = float.Parse(_configuration["OpenAI:Temperature"] ?? "0.3");

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(metricsPayload)
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = maxTokens,
                Temperature = temperature,
                ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                    name: "daily_summary",
                    jsonSchema: BinaryData.FromString("""
                    {
                        "type": "object",
                        "properties": {
                            "headline": { "type": "string" },
                            "highlights": {
                                "type": "array",
                                "items": { "type": "string" }
                            },
                            "alerts": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "severity": { "type": "string" },
                                        "message": { "type": "string" },
                                        "evidence": { "type": "string" }
                                    },
                                    "required": ["severity", "message", "evidence"]
                                }
                            },
                            "recommendations": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "title": { "type": "string" },
                                        "description": { "type": "string" },
                                        "evidence": { "type": "string" },
                                        "owner_action": { "type": "boolean" }
                                    },
                                    "required": ["title", "description", "evidence", "owner_action"]
                                }
                            }
                        },
                        "required": ["headline", "highlights", "alerts", "recommendations"],
                        "additionalProperties": false
                    }
                    """),
                    strictSchemaEnabled: true
                )
            };

            var response = await _chatClient.CompleteChatAsync(messages, options, ct);

            sw.Stop();

            var content = response.Value.Content[0].Text;
            var usage = response.Value.Usage;

            var summary = JsonSerializer.Deserialize<DailySummaryDto>(content)
                ?? throw new InvalidOperationException("No se pudo deserializar respuesta de OpenAI");

            var metadata = new IAuditMetadata
            {
                Model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini",
                PromptVersion = PROMPT_VERSION,
                TotalTokens = usage.TotalTokenCount,
                PromptTokens = usage.InputTokenCount,
                CompletionTokens = usage.OutputTokenCount,
                LatencyMs = sw.ElapsedMilliseconds,
                Success = true,
                CacheHit = false
            };

            return (summary, metadata);
        }

        private string BuildSystemPrompt()
        {
            return """
            Eres un analista de negocios especializado en restaurantes. Tu trabajo es generar resúmenes diarios CONCISOS y ACCIONABLES para el dueño.

            REGLAS CRÍTICAS - ANTI-ALUCINACIÓN:
            1. SOLO usa números que aparecen EXACTAMENTE en el JSON de métricas
            2. NUNCA inventes, calcules o estimes números adicionales
            3. CADA recomendación DEBE citar evidencia específica del JSON (ej: "40 órdenes canceladas")
            4. Si no hay suficiente información, di "No hay datos suficientes" - NO adivines
            5. NO hagas comparaciones con días anteriores (no tienes esa información)

            FORMATO DE SALIDA:
            - headline: Máximo 150 caracteres, enfocado en el resultado más importante
            - highlights: 3-5 puntos cortos (máx 80 caracteres cada uno) con hechos clave
            - alerts: Solo si hay problemas reales (tasa cancelación >20%, caída >40%, etc.)
              - severity: "INFO", "WARNING" o "CRITICAL"
              - message: Descripción del problema
              - evidence: Números específicos del JSON
            - recommendations: Máximo 3 recomendaciones ACCIONABLES
              - title: Título corto (máx 60 caracteres)
              - description: Explicación clara (máx 150 caracteres)
              - evidence: OBLIGATORIO - números específicos del JSON
              - owner_action: true si requiere acción del dueño, false si es solo informativo

            TONO:
            - Directo y profesional
            - Enfocado en ACCIÓN, no en descripción
            - Optimista pero honesto

            EJEMPLOS DE EVIDENCIA CORRECTA:
            ✅ "40 órdenes canceladas de 100 totales (40%)"
            ✅ "Ticket promedio de $8500, ingresos de $340000"
            ✅ "Pizza Napolitana lideró ventas con 25 unidades"

            EJEMPLOS DE EVIDENCIA INCORRECTA:
            ❌ "Las ventas bajaron respecto a ayer" (no tienes datos de ayer)
            ❌ "Se estima una mejora del 15%" (NO estimar)
            ❌ "Probablemente por el clima" (NO especular)
            """;
        }

        private string BuildMetricsPayload(DailyMetricsDto metrics, DateOnly date)
        {
            // Solo enviar agregaciones - NO PII
            var payload = new
            {
                date = date.ToString("yyyy-MM-dd"),
                orders_total = metrics.OrdersTotal,
                orders_delivered = metrics.OrdersDelivered,
                orders_cancelled = metrics.OrdersCancelled,
                revenue_cents = metrics.RevenueTotal,
                tips_cents = metrics.TipsCents,
                avg_ticket_cents = metrics.AvgTicketCents,
                items_sold = metrics.ItemsSoldTotal,
                top_products = metrics.TopProducts.Select(p => new
                {
                    name = p.Name,
                    quantity = p.Qty,
                    revenue_cents = p.RevenueCents
                }).ToList(),
                hourly_distribution = metrics.HourlyBuckets.Select(h => new
                {
                    hour = h.Hour,
                    orders = h.Orders,
                    revenue_cents = h.RevenueCents
                }).ToList()
            };

            return JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = false
            });
        }

        private bool ValidateSummary(DailySummaryDto? summary)
        {
            if (summary == null)
                return false;

            // Validar campos obligatorios
            if (string.IsNullOrWhiteSpace(summary.Headline))
                return false;

            if (summary.Highlights == null || !summary.Highlights.Any())
                return false;

            if (summary.Alerts == null || summary.Recommendations == null)
                return false;

            // Validar límite de recomendaciones
            if (summary.Recommendations.Count > MAX_RECOMMENDATIONS)
            {
                _logger.LogWarning(
                    "Resumen tiene {Count} recomendaciones, máximo permitido: {Max}",
                    summary.Recommendations.Count,
                    MAX_RECOMMENDATIONS);
                return false;
            }

            // Validar que cada recomendación tenga evidencia
            foreach (var rec in summary.Recommendations)
            {
                if (string.IsNullOrWhiteSpace(rec.Evidence))
                {
                    _logger.LogWarning(
                        "Recomendación '{Title}' no tiene evidencia",
                        rec.Title);
                    return false;
                }
            }

            // Validar que cada alerta tenga evidencia
            foreach (var alert in summary.Alerts)
            {
                if (string.IsNullOrWhiteSpace(alert.Evidence))
                {
                    _logger.LogWarning(
                        "Alerta '{Message}' no tiene evidencia",
                        alert.Message);
                    return false;
                }

                // Validar severity
                if (alert.Severity != "INFO" &&
                    alert.Severity != "WARNING" &&
                    alert.Severity != "CRITICAL")
                {
                    _logger.LogWarning(
                        "Alerta tiene severity inválido: {Severity}",
                        alert.Severity);
                    return false;
                }
            }

            return true;
        }

        private async Task AuditIACallAsync(
            DateOnly date,
            int? userId,
            IAuditMetadata? metadata,
            CancellationToken ct)
        {
            try
            {
                var auditLog = new AuditLog
                {
                    Entity = "IAInsights",
                    EntityId = date.ToString("yyyy-MM-dd"),
                    Action = "GenerateSummary",
                    ByUser = userId,
                    Meta = metadata != null
                        ? JsonSerializer.Serialize(new
                        {
                            Model = metadata.Model,
                            PromptVersion = metadata.PromptVersion,
                            TotalTokens = metadata.TotalTokens,
                            PromptTokens = metadata.PromptTokens,
                            CompletionTokens = metadata.CompletionTokens,
                            LatencyMs = metadata.LatencyMs,
                            Success = metadata.Success,
                            ErrorMessage = metadata.ErrorMessage,
                            CacheHit = metadata.CacheHit
                        })
                        : null,
                    At = DateTimeOffset.UtcNow
                };

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Auditoría registrada: {Entity}/{EntityId}/{Action}",
                    auditLog.Entity,
                    auditLog.EntityId,
                    auditLog.Action);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al guardar auditoría de IA");
                // No lanzar excepción - la auditoría no debe bloquear el flujo
            }
        }
    }
}
