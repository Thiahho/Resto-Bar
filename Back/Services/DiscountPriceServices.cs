using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;
using Back.Models;
namespace Back.Services
{
     public static class DiscountPricingService
    {
        public static int ApplyDiscount(int priceCents, int discountPercent)
        {
            if (discountPercent <= 0) return priceCents;
            var discount = priceCents * (discountPercent / 100m);
            return (int)Math.Round(priceCents - discount, MidpointRounding.AwayFromZero);
        }

        public static int GetMaxDiscountPercent(GrowthSettings? settings)
        {
            if (settings == null)
            {
                return 0;
            }

            var discountPercent = 0;

            if (settings.HappyHourEnabled)
            {
                discountPercent = Math.Max(discountPercent, settings.HappyHourDiscount);
            }

            if (settings.DynamicPricingEnabled)
            {
                discountPercent = Math.Max(discountPercent, settings.DynamicPricingOffPeakDiscount);
            }

            return discountPercent;
        }
    }
}