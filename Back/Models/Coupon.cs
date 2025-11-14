using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
[Table("coupons")]
public class Coupon {
  [Key] public int Id { get; set; }
  [Required, MaxLength(40)] public string Code { get; set; } = null!;
  // "PERCENT" | "AMOUNT"
  [Required, MaxLength(10)] public string Type { get; set; } = "PERCENT";
  public int Value { get; set; }
  public int? MinTotalCents { get; set; }
  public DateTimeOffset ValidFrom { get; set; }
  public DateTimeOffset ValidTo { get; set; }
  public int? UsageLimit { get; set; }
  public bool IsActive { get; set; } = true;

  public List<CouponRedemption> Redemptions { get; set; } = new();
}
}
