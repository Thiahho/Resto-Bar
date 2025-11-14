using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Back.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CouponsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CouponsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/coupons
        [HttpGet]
        public async Task<ActionResult<List<CouponDto>>> GetCoupons()
        {
            var coupons = await _context.Coupons
                .Include(c => c.Redemptions)
                .OrderByDescending(c => c.Id)
                .ToListAsync();

            var couponDtos = coupons.Select(c => new CouponDto
            {
                Id = c.Id,
                Code = c.Code,
                Type = c.Type,
                Value = c.Value,
                MinTotalCents = c.MinTotalCents,
                ValidFrom = c.ValidFrom,
                ValidTo = c.ValidTo,
                UsageLimit = c.UsageLimit,
                UsageCount = c.Redemptions.Count,
                IsActive = c.IsActive
            }).ToList();

            return Ok(couponDtos);
        }

        // GET: api/coupons/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<CouponDto>> GetCoupon(int id)
        {
            var coupon = await _context.Coupons
                .Include(c => c.Redemptions)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (coupon == null)
                return NotFound(new { message = "Cupón no encontrado" });

            var couponDto = new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Type = coupon.Type,
                Value = coupon.Value,
                MinTotalCents = coupon.MinTotalCents,
                ValidFrom = coupon.ValidFrom,
                ValidTo = coupon.ValidTo,
                UsageLimit = coupon.UsageLimit,
                UsageCount = coupon.Redemptions.Count,
                IsActive = coupon.IsActive
            };

            return Ok(couponDto);
        }

        // POST: api/coupons
        [HttpPost]
        public async Task<ActionResult<CouponDto>> CreateCoupon([FromBody] CreateCouponDto dto)
        {
            // Validar que el código no exista
            var existingCoupon = await _context.Coupons
                .FirstOrDefaultAsync(c => c.Code.ToUpper() == dto.Code.ToUpper());

            if (existingCoupon != null)
                return BadRequest(new { message = "Ya existe un cupón con ese código" });

            // Validar tipo
            if (dto.Type != "PERCENT" && dto.Type != "AMOUNT")
                return BadRequest(new { message = "El tipo debe ser PERCENT o AMOUNT" });

            // Validar valor
            if (dto.Type == "PERCENT" && (dto.Value < 0 || dto.Value > 100))
                return BadRequest(new { message = "El porcentaje debe estar entre 0 y 100" });

            if (dto.Type == "AMOUNT" && dto.Value < 0)
                return BadRequest(new { message = "El monto debe ser mayor a 0" });

            // Validar fechas
            if (dto.ValidTo <= dto.ValidFrom)
                return BadRequest(new { message = "La fecha de fin debe ser posterior a la fecha de inicio" });

            var coupon = new Coupon
            {
                Code = dto.Code.ToUpper(),
                Type = dto.Type,
                Value = dto.Value,
                MinTotalCents = dto.MinTotalCents,
                ValidFrom = dto.ValidFrom,
                ValidTo = dto.ValidTo,
                UsageLimit = dto.UsageLimit,
                IsActive = dto.IsActive
            };

            _context.Coupons.Add(coupon);
            await _context.SaveChangesAsync();

            var couponDto = new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Type = coupon.Type,
                Value = coupon.Value,
                MinTotalCents = coupon.MinTotalCents,
                ValidFrom = coupon.ValidFrom,
                ValidTo = coupon.ValidTo,
                UsageLimit = coupon.UsageLimit,
                UsageCount = 0,
                IsActive = coupon.IsActive
            };

            return CreatedAtAction(nameof(GetCoupon), new { id = coupon.Id }, couponDto);
        }

        // PUT: api/coupons/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<CouponDto>> UpdateCoupon(int id, [FromBody] CreateCouponDto dto)
        {
            var coupon = await _context.Coupons
                .Include(c => c.Redemptions)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (coupon == null)
                return NotFound(new { message = "Cupón no encontrado" });

            // Validar que el código no exista en otro cupón
            var existingCoupon = await _context.Coupons
                .FirstOrDefaultAsync(c => c.Code.ToUpper() == dto.Code.ToUpper() && c.Id != id);

            if (existingCoupon != null)
                return BadRequest(new { message = "Ya existe otro cupón con ese código" });

            // Validar tipo
            if (dto.Type != "PERCENT" && dto.Type != "AMOUNT")
                return BadRequest(new { message = "El tipo debe ser PERCENT o AMOUNT" });

            // Validar valor
            if (dto.Type == "PERCENT" && (dto.Value < 0 || dto.Value > 100))
                return BadRequest(new { message = "El porcentaje debe estar entre 0 y 100" });

            if (dto.Type == "AMOUNT" && dto.Value < 0)
                return BadRequest(new { message = "El monto debe ser mayor a 0" });

            // Validar fechas
            if (dto.ValidTo <= dto.ValidFrom)
                return BadRequest(new { message = "La fecha de fin debe ser posterior a la fecha de inicio" });

            coupon.Code = dto.Code.ToUpper();
            coupon.Type = dto.Type;
            coupon.Value = dto.Value;
            coupon.MinTotalCents = dto.MinTotalCents;
            coupon.ValidFrom = dto.ValidFrom;
            coupon.ValidTo = dto.ValidTo;
            coupon.UsageLimit = dto.UsageLimit;
            coupon.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            var couponDto = new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Type = coupon.Type,
                Value = coupon.Value,
                MinTotalCents = coupon.MinTotalCents,
                ValidFrom = coupon.ValidFrom,
                ValidTo = coupon.ValidTo,
                UsageLimit = coupon.UsageLimit,
                UsageCount = coupon.Redemptions.Count,
                IsActive = coupon.IsActive
            };

            return Ok(couponDto);
        }

        // DELETE: api/coupons/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteCoupon(int id)
        {
            var coupon = await _context.Coupons
                .Include(c => c.Redemptions)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (coupon == null)
                return NotFound(new { message = "Cupón no encontrado" });

            // Verificar si tiene redenciones
            if (coupon.Redemptions.Any())
                return BadRequest(new { message = "No se puede eliminar un cupón que ya ha sido usado" });

            _context.Coupons.Remove(coupon);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cupón eliminado exitosamente" });
        }

        // POST: api/coupons/validate
        [HttpPost("validate")]
        public async Task<ActionResult<CouponValidationResult>> ValidateCoupon([FromBody] ValidateCouponDto dto)
        {
            var coupon = await _context.Coupons
                .Include(c => c.Redemptions)
                .FirstOrDefaultAsync(c => c.Code.ToUpper() == dto.Code.ToUpper());

            var result = new CouponValidationResult();

            if (coupon == null)
            {
                result.IsValid = false;
                result.ErrorMessage = "Cupón no encontrado";
                return Ok(result);
            }

            if (!coupon.IsActive)
            {
                result.IsValid = false;
                result.ErrorMessage = "Cupón inactivo";
                return Ok(result);
            }

            var now = DateTimeOffset.Now;

            // Convertir todas las fechas a la zona horaria local del servidor para comparación
            var nowLocal = now.ToLocalTime();
            var validFromLocal = coupon.ValidFrom.ToLocalTime();
            var validToLocal = coupon.ValidTo.ToLocalTime();

            if (nowLocal < validFromLocal)
            {
                result.IsValid = false;
                result.ErrorMessage = "Cupón aún no válido";
                return Ok(result);
            }

            if (nowLocal > validToLocal)
            {
                result.IsValid = false;
                result.ErrorMessage = "Cupón expirado";
                return Ok(result);
            }

            if (coupon.MinTotalCents.HasValue && dto.TotalCents < coupon.MinTotalCents.Value)
            {
                result.IsValid = false;
                result.ErrorMessage = $"El monto mínimo es ${coupon.MinTotalCents.Value / 100.0:F2}";
                return Ok(result);
            }

            if (coupon.UsageLimit.HasValue && coupon.Redemptions.Count >= coupon.UsageLimit.Value)
            {
                result.IsValid = false;
                result.ErrorMessage = "Cupón agotado";
                return Ok(result);
            }

            // Calcular descuento
            int discountCents = 0;
            if (coupon.Type == "PERCENT")
            {
                discountCents = (int)(dto.TotalCents * (coupon.Value / 100.0));
            }
            else if (coupon.Type == "AMOUNT")
            {
                discountCents = Math.Min(coupon.Value, dto.TotalCents);
            }

            result.IsValid = true;
            result.DiscountCents = discountCents;
            result.Coupon = new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Type = coupon.Type,
                Value = coupon.Value,
                MinTotalCents = coupon.MinTotalCents,
                ValidFrom = coupon.ValidFrom,
                ValidTo = coupon.ValidTo,
                UsageLimit = coupon.UsageLimit,
                UsageCount = coupon.Redemptions.Count,
                IsActive = coupon.IsActive
            };

            return Ok(result);
        }

        // POST: api/coupons/{id}/toggle-active
        [HttpPost("{id}/toggle-active")]
        public async Task<ActionResult<CouponDto>> ToggleActive(int id)
        {
            var coupon = await _context.Coupons
                .Include(c => c.Redemptions)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (coupon == null)
                return NotFound(new { message = "Cupón no encontrado" });

            coupon.IsActive = !coupon.IsActive;
            await _context.SaveChangesAsync();

            var couponDto = new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Type = coupon.Type,
                Value = coupon.Value,
                MinTotalCents = coupon.MinTotalCents,
                ValidFrom = coupon.ValidFrom,
                ValidTo = coupon.ValidTo,
                UsageLimit = coupon.UsageLimit,
                UsageCount = coupon.Redemptions.Count,
                IsActive = coupon.IsActive
            };

            return Ok(couponDto);
        }
    }
}
