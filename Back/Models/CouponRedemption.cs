  using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{

[Table("coupon_redemptions")]
public class CouponRedemption {
  public int CouponId { get; set; }
  public int OrderId { get; set; }

  [ForeignKey(nameof(CouponId))] public Coupon? Coupon { get; set; }
  [ForeignKey(nameof(OrderId))] public Order? Order { get; set; }
}
}
