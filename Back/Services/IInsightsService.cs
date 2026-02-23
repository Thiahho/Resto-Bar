using Back.Data;
using Back.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Org.BouncyCastle.Security;

namespace Back.Services
{
    public interface IInsightsService
    {
        Task<DailyMetricsDto> GetDailyMetricsAsync(DateOnly date, CancellationToken ct);
    }

    public sealed class InsightsService : IInsightsService
    {
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<InsightsService> _logger;

        public InsightsService(
            AppDbContext context,
            IMemoryCache cache,
            ILogger<InsightsService> logger)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        public async Task<DailyMetricsDto> GetDailyMetricsAsync(DateOnly date, CancellationToken ct)
        {
            var cacheKey = $"daily_metrics_{date:yyyy-MM-dd}";

            // Intentar obtener del cache
            if (_cache.TryGetValue(cacheKey, out DailyMetricsDto? cachedMetrics) && cachedMetrics != null)
            {
                _logger.LogInformation("Cache HIT para métricas de {Date}", date);
                return cachedMetrics;
            }

            _logger.LogInformation("Cache MISS para métricas de {Date}", date);

            // Calcular métricas
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");

            var startLocal= date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
            var endLocal = startLocal.AddDays(1);

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, tz);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(endLocal, tz);

            var orderDay = _context.Orders
                .AsNoTracking()
                .Where(o => o.CreatedAt >= startUtc && o.CreatedAt < endUtc);


            var kpi = await orderDay
                .GroupBy(_=>1)
                .Select(g=> new
                {
                    OrdersTotal = g.Count(),
                    OrdersDelivered = g.Count(o=>o.Status == Models.OrderStatus.DELIVERED),
                    OrdersCancelled = g.Count(o=>o.Status == Models.OrderStatus.CANCELLED),
                    RevenueCents = g.Where(x=> x.Status == Models.OrderStatus.DELIVERED).Sum(o=>(long?)o.TotalCents) ?? 0L,
                    TipsCents= g.Where(x=> x.Status == Models.OrderStatus.DELIVERED).Sum(o=>(long?)o.TipCents) ?? 0L,
                    AvgTicketCents = (long)(g.Where(x => x.Status == Models.OrderStatus.DELIVERED)
                    .Select(x => (long?)x.TotalCents)
                    .Average() ?? 0.0)
                })
            .SingleOrDefaultAsync(ct);

            if(kpi is null)
            {
                return new DailyMetricsDto
                {
                    Date = date,
                    OrdersTotal = 0,
                    OrdersDelivered = 0,
                    OrdersCancelled = 0,
                    RevenueTotal = 0,
                    TipsCents = 0,
                    AvgTicketCents = 0,
                    ItemsSoldTotal = 0,
                    TopProducts = [],
                    HourlyBuckets = []
                };
            }

            // Items vendidos (solo ventas reales)
            var itemsSoldTotal = await (
                from o in _context.Orders.AsNoTracking()
                join oi in _context.OrderItems.AsNoTracking() on o.Id equals oi.OrderId
                where o.CreatedAt >= startUtc && o.CreatedAt < endUtc
                      && o.Status == Models.OrderStatus.DELIVERED
                select (int?)oi.Qty
            ).SumAsync(ct) ?? 0;

            // Top productos (solo ventas reales)
            var topProducts = await (
                from o in _context.Orders.AsNoTracking()
                join oi in _context.OrderItems.AsNoTracking() on o.Id equals oi.OrderId
                where o.CreatedAt >= startUtc && o.CreatedAt < endUtc
                      && o.Status == Models.OrderStatus.DELIVERED
                group oi by oi.NameSnapshot into grp
                orderby grp.Sum(x => (long)x.LineTotalCents) descending
                select new TopProductDto(
                    grp.Key,
                    grp.Sum(x => x.Qty),
                    grp.Sum(x => (long)x.LineTotalCents)
                )
            ).Take(10).ToListAsync(ct);


            // Buckets por hora (en hora Argentina)
            // Nota: EF con Npgsql suele traducir DatePart/AtTimeZone, pero si te complica, lo hago con SQL crudo.
            var hourly = await orderDay
                .Select(o => new { o.CreatedAt, o.Status, o.TotalCents })
                .ToListAsync(ct);

            var hourlyBuckets = hourly
                .GroupBy(x => TimeZoneInfo.ConvertTimeFromUtc(x.CreatedAt, tz).Hour)
                .OrderBy(g => g.Key)
                .Select(g => new HourlyBucketDto(
                    g.Key,
                    g.Count(),
                    g.Where(x => x.Status == Models.OrderStatus.DELIVERED).Sum(x => (long)x.TotalCents)
                ))
                .ToList();

            var metrics = new DailyMetricsDto
            {
                Date = date,
                OrdersTotal = kpi.OrdersTotal,
                OrdersDelivered = kpi.OrdersDelivered,
                OrdersCancelled = kpi.OrdersCancelled,
                RevenueTotal = kpi.RevenueCents,
                TipsCents = kpi.TipsCents,
                AvgTicketCents = kpi.AvgTicketCents,
                ItemsSoldTotal = itemsSoldTotal,
                TopProducts = topProducts,
                HourlyBuckets = hourlyBuckets
            };

            // Guardar en cache con TTL dinámico
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var ttl = date == today
                ? TimeSpan.FromMinutes(5)   // Hoy: 5 minutos (datos cambiantes)
                : TimeSpan.FromHours(4);    // Pasado: 4 horas (datos estables)

            _cache.Set(cacheKey, metrics, ttl);

            _logger.LogInformation(
                "Métricas calculadas y cacheadas para {Date} con TTL de {TTL}",
                date,
                ttl);

            return metrics;
        }

    }

}
