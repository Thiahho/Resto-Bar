using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Back.Controller
{
    [ApiController]
    public class CombosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CombosController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/public/combos - Obtener todos los combos activos (público)
        [HttpGet("api/public/combos")]
        public async Task<ActionResult<List<ComboDto>>> GetPublicCombos()
        {
            var combos = await _context.Combos
                .Include(c => c.Items)
                .ThenInclude(ci => ci.Product)
                .Where(c => c.IsActive)
                .ToListAsync();

            var combosDto = combos.Select(MapComboToDto).ToList();
            return Ok(combosDto);
        }

        // GET /api/admin/combos - Obtener todos los combos (admin)
        [Authorize]
        [HttpGet("api/admin/combos")]
        public async Task<ActionResult<List<ComboDto>>> GetAllCombos()
        {
            var combos = await _context.Combos
                .Include(c => c.Items)
                .ThenInclude(ci => ci.Product)
                .ToListAsync();

            var combosDto = combos.Select(MapComboToDto).ToList();
            return Ok(combosDto);
        }

        // GET /api/admin/combos/{id} - Obtener combo por ID (admin)
        [Authorize]
        [HttpGet("api/admin/combos/{id}")]
        public async Task<ActionResult<ComboDto>> GetCombo(int id)
        {
            var combo = await _context.Combos
                .Include(c => c.Items)
                .ThenInclude(ci => ci.Product)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (combo == null)
                return NotFound();

            return Ok(MapComboToDto(combo));
        }

        // POST /api/admin/combos - Crear nuevo combo (admin)
        [Authorize]
        [HttpPost("api/admin/combos")]
        public async Task<ActionResult<ComboDto>> CreateCombo([FromBody] CreateComboDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validar que los productos existan
            var productIds = dto.Items.Select(i => i.ProductId).ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            if (products.Count != productIds.Distinct().Count())
                return BadRequest("Uno o más productos no existen");

            var combo = new Combo
            {
                Name = dto.Name,
                priceCents = dto.PriceCents,
                IsActive = dto.IsActive,
                Items = dto.Items.Select(i => new ComboItem
                {
                    ProductId = i.ProductId,
                    Qty = i.Qty
                }).ToList()
            };

            _context.Combos.Add(combo);
            await _context.SaveChangesAsync();

            // Recargar con productos
            await _context.Entry(combo)
                .Collection(c => c.Items)
                .Query()
                .Include(ci => ci.Product)
                .LoadAsync();

            return CreatedAtAction(nameof(GetCombo), new { id = combo.Id }, MapComboToDto(combo));
        }

        // PUT /api/admin/combos/{id} - Actualizar combo (admin)
        [Authorize]
        [HttpPut("api/admin/combos/{id}")]
        public async Task<ActionResult> UpdateCombo(int id, [FromBody] CreateComboDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var combo = await _context.Combos
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (combo == null)
                return NotFound();

            // Validar que los productos existan
            var productIds = dto.Items.Select(i => i.ProductId).ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();

            if (products.Count != productIds.Distinct().Count())
                return BadRequest("Uno o más productos no existen");

            combo.Name = dto.Name;
            combo.priceCents = dto.PriceCents;
            combo.IsActive = dto.IsActive;

            // Actualizar items (eliminar los viejos y crear nuevos)
            _context.ComboItems.RemoveRange(combo.Items);
            combo.Items = dto.Items.Select(i => new ComboItem
            {
                ComboId = id,
                ProductId = i.ProductId,
                Qty = i.Qty
            }).ToList();

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE /api/admin/combos/{id} - Eliminar combo (admin)
        [Authorize]
        [HttpDelete("api/admin/combos/{id}")]
        public async Task<ActionResult> DeleteCombo(int id)
        {
            var combo = await _context.Combos
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (combo == null)
                return NotFound();

            _context.Combos.Remove(combo);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST /api/admin/combos/{id}/toggle-active - Cambiar estado activo/inactivo
        [Authorize]
        [HttpPost("api/admin/combos/{id}/toggle-active")]
        public async Task<ActionResult> ToggleActive(int id)
        {
            var combo = await _context.Combos.FindAsync(id);

            if (combo == null)
                return NotFound();

            combo.IsActive = !combo.IsActive;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private ComboDto MapComboToDto(Combo combo)
        {
            return new ComboDto
            {
                Id = combo.Id,
                Name = combo.Name,
                PriceCents = combo.priceCents,
                IsActive = combo.IsActive,
                Items = combo.Items.Select(ci => new ComboItemDto
                {
                    ProductId = ci.ProductId,
                    ProductName = ci.Product?.Name ?? "",
                    Qty = ci.Qty
                }).ToList()
            };
        }
    }
}
