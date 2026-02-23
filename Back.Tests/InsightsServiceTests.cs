using Back.Data;
using Back.Dtos;
using Back.Models;
using Back.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Back.Tests.Services
{
    public class InsightsServiceTests
    {
        private readonly Mock<ILogger<InsightsService>> _mockLogger;
        private readonly IMemoryCache _cache;

        public InsightsServiceTests()
        {
            _mockLogger = new Mock<ILogger<InsightsService>>();
            _cache = new MemoryCache(new MemoryCacheOptions());
        }

        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetDailyMetrics_EmptyDay_ReturnsZeros()
        {
            // Arrange
            await using var context = GetInMemoryDbContext();
            var service = new InsightsService(context, _cache, _mockLogger.Object);
            var emptyDate = new DateOnly(2026, 1, 1);

            // Act
            var result = await service.GetDailyMetricsAsync(emptyDate, CancellationToken.None);

            // Assert
            Assert.Equal(emptyDate, result.Date);
            Assert.Equal(0, result.OrdersTotal);
            Assert.Equal(0, result.OrdersDelivered);
            Assert.Equal(0, result.OrdersCancelled);
            Assert.Equal(0, result.RevenueTotal);
            Assert.Equal(0, result.TipsCents);
            Assert.Equal(0, result.AvgTicketCents);
            Assert.Equal(0, result.ItemsSoldTotal);
            Assert.Empty(result.TopProducts);
            Assert.Empty(result.HourlyBuckets);
        }

        [Fact]
        public async Task GetDailyMetrics_WithSales_CalculatesCorrectly()
        {
            // Arrange
            await using var context = GetInMemoryDbContext();
            var service = new InsightsService(context, _cache, _mockLogger.Object);

            var testDate = new DateOnly(2026, 2, 22);
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(
                testDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified),
                tz);

            // Crear 3 órdenes entregadas
            var order1 = new Order
            {
                Id = 1,
                CreatedAt = startUtc.AddHours(12),
                Status = OrderStatus.DELIVERED,
                TotalCents = 10000,
                TipCents = 500,
                CustomerName = "Test 1"
            };
            var order2 = new Order
            {
                Id = 2,
                CreatedAt = startUtc.AddHours(13),
                Status = OrderStatus.DELIVERED,
                TotalCents = 15000,
                TipCents = 1000,
                CustomerName = "Test 2"
            };
            var order3 = new Order
            {
                Id = 3,
                CreatedAt = startUtc.AddHours(14),
                Status = OrderStatus.DELIVERED,
                TotalCents = 20000,
                TipCents = 1500,
                CustomerName = "Test 3"
            };

            context.Orders.AddRange(order1, order2, order3);

            // Agregar items a las órdenes
            context.OrderItems.AddRange(
                new OrderItem
                {
                    OrderId = 1,
                    NameSnapshot = "Pizza",
                    Qty = 2,
                    LineTotalCents = 5000
                },
                new OrderItem
                {
                    OrderId = 2,
                    NameSnapshot = "Pizza",
                    Qty = 1,
                    LineTotalCents = 3000
                },
                new OrderItem
                {
                    OrderId = 3,
                    NameSnapshot = "Burger",
                    Qty = 3,
                    LineTotalCents = 6000
                }
            );

            await context.SaveChangesAsync();

            // Act
            var result = await service.GetDailyMetricsAsync(testDate, CancellationToken.None);

            // Assert
            Assert.Equal(testDate, result.Date);
            Assert.Equal(3, result.OrdersTotal);
            Assert.Equal(3, result.OrdersDelivered);
            Assert.Equal(0, result.OrdersCancelled);
            Assert.Equal(45000, result.RevenueTotal); // 10000 + 15000 + 20000
            Assert.Equal(3000, result.TipsCents); // 500 + 1000 + 1500
            Assert.Equal(15000, result.AvgTicketCents); // 45000 / 3
            Assert.Equal(6, result.ItemsSoldTotal); // 2 + 1 + 3
            Assert.Equal(2, result.TopProducts.Count);
        }

        [Fact]
        public async Task GetDailyMetrics_CancelledOrders_DoNotCountInRevenue()
        {
            // Arrange
            await using var context = GetInMemoryDbContext();
            var service = new InsightsService(context, _cache, _mockLogger.Object);

            var testDate = new DateOnly(2026, 2, 22);
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(
                testDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified),
                tz);

            // 2 órdenes entregadas + 1 cancelada
            var order1 = new Order
            {
                Id = 1,
                CreatedAt = startUtc.AddHours(12),
                Status = OrderStatus.DELIVERED,
                TotalCents = 10000,
                TipCents = 500,
                CustomerName = "Test 1"
            };
            var order2 = new Order
            {
                Id = 2,
                CreatedAt = startUtc.AddHours(13),
                Status = OrderStatus.CANCELLED,
                TotalCents = 15000,
                TipCents = 0,
                CustomerName = "Test 2"
            };

            context.Orders.AddRange(order1, order2);
            await context.SaveChangesAsync();

            // Act
            var result = await service.GetDailyMetricsAsync(testDate, CancellationToken.None);

            // Assert
            Assert.Equal(2, result.OrdersTotal);
            Assert.Equal(1, result.OrdersDelivered);
            Assert.Equal(1, result.OrdersCancelled);
            Assert.Equal(10000, result.RevenueTotal); // Solo order1
            Assert.Equal(500, result.TipsCents); // Solo order1
            Assert.Equal(10000, result.AvgTicketCents); // Solo order1
        }

        [Fact]
        public async Task GetDailyMetrics_UsesCache_OnSecondCall()
        {
            // Arrange
            await using var context = GetInMemoryDbContext();
            var service = new InsightsService(context, _cache, _mockLogger.Object);

            var testDate = new DateOnly(2026, 2, 22);
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(
                testDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified),
                tz);

            var order = new Order
            {
                Id = 1,
                CreatedAt = startUtc.AddHours(12),
                Status = OrderStatus.DELIVERED,
                TotalCents = 10000,
                TipCents = 500,
                CustomerName = "Test"
            };

            context.Orders.Add(order);
            await context.SaveChangesAsync();

            // Act - Primera llamada
            var result1 = await service.GetDailyMetricsAsync(testDate, CancellationToken.None);

            // Agregar otra orden después de la primera llamada
            var order2 = new Order
            {
                Id = 2,
                CreatedAt = startUtc.AddHours(14),
                Status = OrderStatus.DELIVERED,
                TotalCents = 20000,
                TipCents = 1000,
                CustomerName = "Test 2"
            };
            context.Orders.Add(order2);
            await context.SaveChangesAsync();

            // Act - Segunda llamada (debería venir del cache, sin la nueva orden)
            var result2 = await service.GetDailyMetricsAsync(testDate, CancellationToken.None);

            // Assert - Ambos resultados deberían ser iguales (cache hit)
            Assert.Equal(result1.OrdersTotal, result2.OrdersTotal);
            Assert.Equal(result1.RevenueTotal, result2.RevenueTotal);
            Assert.Equal(1, result2.OrdersTotal); // Solo 1 porque vino del cache
        }

        [Fact]
        public async Task GetDailyMetrics_HourlyBuckets_CorrectTimezone()
        {
            // Arrange
            await using var context = GetInMemoryDbContext();
            var service = new InsightsService(context, _cache, _mockLogger.Object);

            var testDate = new DateOnly(2026, 2, 22);
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Argentina/Buenos_Aires");
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(
                testDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified),
                tz);

            // Crear órdenes en diferentes horas
            var order1 = new Order
            {
                Id = 1,
                CreatedAt = startUtc.AddHours(12), // 12 PM Argentina
                Status = OrderStatus.DELIVERED,
                TotalCents = 10000,
                TipCents = 500,
                CustomerName = "Test 1"
            };
            var order2 = new Order
            {
                Id = 2,
                CreatedAt = startUtc.AddHours(13), // 1 PM Argentina
                Status = OrderStatus.DELIVERED,
                TotalCents = 15000,
                TipCents = 1000,
                CustomerName = "Test 2"
            };
            var order3 = new Order
            {
                Id = 3,
                CreatedAt = startUtc.AddHours(13).AddMinutes(30), // 1:30 PM Argentina
                Status = OrderStatus.DELIVERED,
                TotalCents = 20000,
                TipCents = 1500,
                CustomerName = "Test 3"
            };

            context.Orders.AddRange(order1, order2, order3);
            await context.SaveChangesAsync();

            // Act
            var result = await service.GetDailyMetricsAsync(testDate, CancellationToken.None);

            // Assert
            Assert.Equal(2, result.HourlyBuckets.Count); // Horas 12 y 13

            var bucket12 = result.HourlyBuckets.FirstOrDefault(b => b.Hour == 12);
            Assert.NotNull(bucket12);
            Assert.Equal(1, bucket12.Orders);
            Assert.Equal(10000, bucket12.RevenueCents);

            var bucket13 = result.HourlyBuckets.FirstOrDefault(b => b.Hour == 13);
            Assert.NotNull(bucket13);
            Assert.Equal(2, bucket13.Orders);
            Assert.Equal(35000, bucket13.RevenueCents); // 15000 + 20000
        }
    }
}
