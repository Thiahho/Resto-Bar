using System.Text.Json.Serialization;

namespace Back.Dtos
{
    /// <summary>
    /// Resumen diario generado por IA
    /// </summary>
    public sealed record DailySummaryDto
    {
        [JsonPropertyName("headline")]
        public required string Headline { get; init; }

        [JsonPropertyName("highlights")]
        public required IReadOnlyList<string> Highlights { get; init; }

        [JsonPropertyName("alerts")]
        public required IReadOnlyList<AlertDto> Alerts { get; init; }

        [JsonPropertyName("recommendations")]
        public required IReadOnlyList<RecommendationDto> Recommendations { get; init; }

        /// <summary>
        /// Métricas brutas usadas para generar el resumen (opcional)
        /// </summary>
        public DailyMetricsDto? Metrics { get; init; }

        /// <summary>
        /// Metadata de la llamada a IA
        /// </summary>
        public IAuditMetadata? AuditMetadata { get; init; }
    }

    /// <summary>
    /// Alerta sobre situaciones anormales
    /// </summary>
    public sealed record AlertDto
    {
        [JsonPropertyName("severity")]
        public required string Severity { get; init; } // "INFO" | "WARNING" | "CRITICAL"

        [JsonPropertyName("message")]
        public required string Message { get; init; }

        [JsonPropertyName("evidence")]
        public required string Evidence { get; init; }
    }

    /// <summary>
    /// Recomendación accionable para el dueño
    /// </summary>
    public sealed record RecommendationDto
    {
        [JsonPropertyName("title")]
        public required string Title { get; init; }

        [JsonPropertyName("description")]
        public required string Description { get; init; }

        [JsonPropertyName("evidence")]
        public required string Evidence { get; init; }

        [JsonPropertyName("owner_action")]
        public required bool OwnerAction { get; init; }
    }

    /// <summary>
    /// Request para generar resumen con IA
    /// </summary>
    public sealed record GenerateSummaryRequest
    {
        [JsonPropertyName("date")]
        public required string Date { get; init; } // YYYY-MM-DD
    }

    /// <summary>
    /// Metadata de auditoría para llamadas a IA
    /// </summary>
    public sealed record IAuditMetadata
    {
        [JsonPropertyName("model")]
        public required string Model { get; init; }

        [JsonPropertyName("prompt_version")]
        public required int PromptVersion { get; init; }

        [JsonPropertyName("total_tokens")]
        public required int TotalTokens { get; init; }

        [JsonPropertyName("prompt_tokens")]
        public required int PromptTokens { get; init; }

        [JsonPropertyName("completion_tokens")]
        public required int CompletionTokens { get; init; }

        [JsonPropertyName("latency_ms")]
        public required long LatencyMs { get; init; }

        [JsonPropertyName("success")]
        public required bool Success { get; init; }

        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; init; }

        [JsonPropertyName("cache_hit")]
        public bool CacheHit { get; init; }
    }
}
