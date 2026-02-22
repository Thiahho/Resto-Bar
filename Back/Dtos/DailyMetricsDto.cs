namespace Back.Dtos
{
    public sealed class DailyMetricsDto
    {
        public DateOnly Date { get; init; }
        public int OrdersTotal { get; init; }
        public int OrdersDelivered { get; init; }
        public int OrdersCancelled { get; init; }

        public long RevenueTotal { get; init; }
        public long TipsCents { get; init; }
        public long AvgTicketCents { get; init; }

        public int ItemsSoldTotal  { get; init; }

        public IReadOnlyList<TopProductDto> TopProducts { get; init; } = [];
        public IReadOnlyList<HourlyBucketDto> HourlyBuckets{ get; init; } = [];

    }

    public sealed record TopProductDto(string Name, int Qty, long RevenueCents);
    public sealed record HourlyBucketDto(int Hour, int Orders, long RevenueCents);


}
