namespace Back.Dtos
{
    public class CouponDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string Type { get; set; } = "PERCENT"; // "PERCENT" | "AMOUNT"
        public int Value { get; set; }
        public int? MinTotalCents { get; set; }
        public DateTimeOffset ValidFrom { get; set; }
        public DateTimeOffset ValidTo { get; set; }
        public int? UsageLimit { get; set; }
        public int UsageCount { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CreateCouponDto
    {
        public string Code { get; set; } = null!;
        public string Type { get; set; } = "PERCENT";
        public int Value { get; set; }
        public int? MinTotalCents { get; set; }
        public DateTimeOffset ValidFrom { get; set; }
        public DateTimeOffset ValidTo { get; set; }
        public int? UsageLimit { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ValidateCouponDto
    {
        public string Code { get; set; } = null!;
        public int TotalCents { get; set; }
    }

    public class CouponValidationResult
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public int DiscountCents { get; set; }
        public CouponDto? Coupon { get; set; }
    }
}
