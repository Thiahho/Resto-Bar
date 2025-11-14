using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Back.Controller
{
    [ApiController]
    public class ModifiersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ModifiersController> _logger;

        public ModifiersController(AppDbContext context, ILogger<ModifiersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET /api/modifiers - Obtener todos los modificadores activos (público)
        [HttpGet("api/modifiers")]
        public async Task<ActionResult<List<ModifierDto>>> GetActiveModifiers()
        {
            var modifiers = await _context.Modifiers
                .Where(m => m.IsActive)
                .OrderBy(m => m.Name)
                .Select(m => new ModifierDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    PriceCentsDelta = m.PriceCentsDelta,
                    Category = m.Category,
                    IsActive = m.IsActive
                })
                .ToListAsync();

            return Ok(modifiers);
        }

        // GET /api/modifiers/categories - Obtener categorías únicas existentes (público)
        [HttpGet("api/modifiers/categories")]
        public async Task<ActionResult<List<string>>> GetCategories()
        {
            var categories = await _context.Modifiers
                .Where(m => !string.IsNullOrEmpty(m.Category))
                .Select(m => m.Category!)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return Ok(categories);
        }

        // GET /api/products/{productId}/modifiers - Obtener modificadores de un producto específico (público)
        [HttpGet("api/products/{productId}/modifiers")]
        public async Task<ActionResult<List<ModifierDto>>> GetProductModifiers(int productId)
        {
            var product = await _context.Products
                .Include(p => p.ProductModifiers)
                    .ThenInclude(pm => pm.Modifier)
                .FirstOrDefaultAsync(p => p.Id == productId);

            if (product == null)
            {
                return NotFound("Product not found");
            }

            var modifiers = product.ProductModifiers
                .Where(pm => pm.Modifier != null && pm.Modifier.IsActive)
                .Select(pm => new ModifierDto
                {
                    Id = pm.Modifier!.Id,
                    Name = pm.Modifier.Name,
                    PriceCentsDelta = pm.Modifier.PriceCentsDelta,
                    Category = pm.Modifier.Category,
                    IsActive = pm.Modifier.IsActive
                })
                .ToList();

            return Ok(modifiers);
        }

        // GET /api/admin/modifiers - Listar todos los modificadores (admin)
        [Authorize]
        [HttpGet("api/admin/modifiers")]
        public async Task<ActionResult<List<ModifierDto>>> GetAllModifiers()
        {
            var modifiers = await _context.Modifiers
                .OrderBy(m => m.Name)
                .Select(m => new ModifierDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    PriceCentsDelta = m.PriceCentsDelta,
                    Category = m.Category,
                    IsActive = m.IsActive
                })
                .ToListAsync();

            return Ok(modifiers);
        }

        // GET /api/admin/modifiers/with-products - Listar todos los modificadores con productos asociados (admin)
        [Authorize]
        [HttpGet("api/admin/modifiers/with-products")]
        public async Task<ActionResult<List<ModifierWithProductsDto>>> GetAllModifiersWithProducts()
        {
            var modifiers = await _context.Modifiers
                .Include(m => m.ProductModifiers)
                    .ThenInclude(pm => pm.Product)
                .OrderBy(m => m.Name)
                .Select(m => new ModifierWithProductsDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    PriceCentsDelta = m.PriceCentsDelta,
                    Category = m.Category,
                    IsActive = m.IsActive,
                    AssociatedProducts = m.ProductModifiers
                        .Where(pm => pm.Product != null)
                        .Select(pm => new ProductInfoDto
                        {
                            Id = pm.Product!.Id,
                            Name = pm.Product!.Name
                        })
                        .ToList()
                })
                .ToListAsync();

            return Ok(modifiers);
        }

        // GET /api/admin/modifiers/{id} - Obtener un modificador por ID (admin)
        [Authorize]
        [HttpGet("api/admin/modifiers/{id}")]
        public async Task<ActionResult<ModifierDto>> GetModifier(int id)
        {
            var modifier = await _context.Modifiers.FindAsync(id);

            if (modifier == null)
            {
                return NotFound();
            }

            return Ok(new ModifierDto
            {
                Id = modifier.Id,
                Name = modifier.Name,
                PriceCentsDelta = modifier.PriceCentsDelta,
                Category = modifier.Category,
                IsActive = modifier.IsActive
            });
        }

        // POST /api/admin/modifiers - Crear nuevo modificador (admin)
        [Authorize]
        [HttpPost("api/admin/modifiers")]
        public async Task<ActionResult<ModifierDto>> CreateModifier([FromBody] CreateModifierDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var modifier = new Modifier
            {
                Name = dto.Name,
                PriceCentsDelta = dto.PriceCentsDelta,
                Category = dto.Category,
                IsActive = dto.IsActive
            };

            _context.Modifiers.Add(modifier);
            await _context.SaveChangesAsync();

            var modifierDto = new ModifierDto
            {
                Id = modifier.Id,
                Name = modifier.Name,
                PriceCentsDelta = modifier.PriceCentsDelta,
                Category = modifier.Category,
                IsActive = modifier.IsActive
            };

            return CreatedAtAction(nameof(GetModifier), new { id = modifier.Id }, modifierDto);
        }

        // PUT /api/admin/modifiers/{id} - Actualizar modificador (admin)
        [Authorize]
        [HttpPut("api/admin/modifiers/{id}")]
        public async Task<ActionResult> UpdateModifier(int id, [FromBody] UpdateModifierDto dto)
        {
            var modifier = await _context.Modifiers.FindAsync(id);

            if (modifier == null)
            {
                return NotFound();
            }

            if (dto.Name != null)
                modifier.Name = dto.Name;

            if (dto.PriceCentsDelta.HasValue)
                modifier.PriceCentsDelta = dto.PriceCentsDelta.Value;

            if (dto.Category != null)
                modifier.Category = dto.Category;

            if (dto.IsActive.HasValue)
                modifier.IsActive = dto.IsActive.Value;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE /api/admin/modifiers/{id} - Eliminar modificador (admin)
        [Authorize]
        [HttpDelete("api/admin/modifiers/{id}")]
        public async Task<ActionResult> DeleteModifier(int id)
        {
            var modifier = await _context.Modifiers.FindAsync(id);

            if (modifier == null)
            {
                return NotFound();
            }

            _context.Modifiers.Remove(modifier);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST /api/admin/products/{productId}/modifiers/{modifierId} - Asociar modificador a producto (admin)
        [Authorize]
        [HttpPost("api/admin/products/{productId}/modifiers/{modifierId}")]
        public async Task<ActionResult> AssignModifierToProduct(int productId, int modifierId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                return NotFound("Product not found");
            }

            var modifier = await _context.Modifiers.FindAsync(modifierId);
            if (modifier == null)
            {
                return NotFound("Modifier not found");
            }

            var existingRelation = await _context.ProductModifiers
                .FirstOrDefaultAsync(pm => pm.ProductId == productId && pm.ModifierId == modifierId);

            if (existingRelation != null)
            {
                return BadRequest("Modifier already assigned to this product");
            }

            _context.ProductModifiers.Add(new ProductModifier
            {
                ProductId = productId,
                ModifierId = modifierId
            });

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE /api/admin/products/{productId}/modifiers/{modifierId} - Desasociar modificador de producto (admin)
        [Authorize]
        [HttpDelete("api/admin/products/{productId}/modifiers/{modifierId}")]
        public async Task<ActionResult> RemoveModifierFromProduct(int productId, int modifierId)
        {
            var productModifier = await _context.ProductModifiers
                .FirstOrDefaultAsync(pm => pm.ProductId == productId && pm.ModifierId == modifierId);

            if (productModifier == null)
            {
                return NotFound("Association not found");
            }

            _context.ProductModifiers.Remove(productModifier);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
