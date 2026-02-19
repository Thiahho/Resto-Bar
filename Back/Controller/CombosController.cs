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
                .AsNoTracking()
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

        [Authorize]
        [HttpGet("api/admin/combos/smart-suggestions")]
        public async Task<ActionResult<List<SmartComboSuggestionDto>>> GetSmartSuggestions()
        {
            var suggestions = await BuildSmartSuggestions();
            return Ok(suggestions);
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

        private async Task<List<SmartComboSuggestionDto>> BuildSmartSuggestions()
        {
            var products = await _context.Products.ToDictionaryAsync(p => p.Id);
            var suggestions = new List<SmartComboSuggestionDto>();

            var topProducts = await _context.OrderItems
                .Where(oi => oi.ProductId != null)
                .GroupBy(oi => oi.ProductId!.Value)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(x => x.Qty) })
                .OrderByDescending(g => g.Qty)
                .Take(5)
                .ToListAsync();

            var mostRequestedItems = topProducts
                .Select(tp => BuildItem(tp.ProductId, 1, products))
                .Where(item => item != null)
                .Take(3)
                .Select(item => item!)
                .ToList();

            if (mostRequestedItems.Count > 0)
            {
                suggestions.Add(BuildSuggestion(
                    "most_requested",
                    "Los más pedidos",
                    "Basado en los productos más vendidos.",
                    mostRequestedItems));
            }

            var nightItems = await _context.OrderItems
                .Where(oi => oi.ProductId != null)
                .Join(_context.Orders,
                    oi => oi.OrderId,
                    o => o.Id,
                    (oi, o) => new { oi, o })
                .Where(x => x.o.CreatedAt.Hour >= 18 && x.o.CreatedAt.Hour < 23)
                .GroupBy(x => x.oi.ProductId!.Value)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(x => x.oi.Qty) })
                .OrderByDescending(g => g.Qty)
                .Take(3)
                .ToListAsync();

            var nightComboItems = nightItems
                .Select(tp => BuildItem(tp.ProductId, 1, products))
                .Where(item => item != null)
                .Select(item => item!)
                .ToList();

            if (nightComboItems.Count > 0)
            {
                suggestions.Add(BuildSuggestion(
                    "night_combo",
                    "Combo noche",
                    "Productos fuertes en horario nocturno.",
                    nightComboItems));
            }

            var pairSuggestion = await BuildPairSuggestion(products);
            if (pairSuggestion != null)
            {
                suggestions.Add(pairSuggestion);
            }

            return suggestions;
        }

        private SmartComboSuggestionDto? BuildSuggestion(string key, string name, string description, List<SmartComboItemDto> items)
        {
            if (items.Count == 0)
            {
                return null;
            }

            var estimated = items.Sum(i => i.UnitPriceCents * i.Qty);
            return new SmartComboSuggestionDto
            {
                Key = key,
                Name = name,
                Description = description,
                Items = items,
                EstimatedTotalCents = estimated
            };
        }

        private SmartComboItemDto? BuildItem(int productId, int qty, Dictionary<int, Product> products)
        {
            if (!products.TryGetValue(productId, out var product))
            {
                return null;
            }

            return new SmartComboItemDto
            {
                ProductId = productId,
                ProductName = product.Name,
                Qty = qty,
                UnitPriceCents = product.PriceCents
            };
        }

        private async Task<SmartComboSuggestionDto?> BuildPairSuggestion(Dictionary<int, Product> products)
        {
            var recentOrders = await _context.Orders
                .OrderByDescending(o => o.CreatedAt)
                .Take(200)
                .Select(o => o.Id)
                .ToListAsync();

            if (recentOrders.Count == 0)
            {
                return null;
            }

            var orderItems = await _context.OrderItems
                .Where(oi => oi.ProductId != null && recentOrders.Contains(oi.OrderId))
                .GroupBy(oi => new { oi.OrderId, oi.ProductId })
                .Select(g => new
                {
                    g.Key.OrderId,
                    ProductId = g.Key.ProductId!.Value
                })
                .ToListAsync();

            var pairCounts = new Dictionary<(int, int), int>();
            foreach (var orderGroup in orderItems.GroupBy(oi => oi.OrderId))
            {
                var productIds = orderGroup.Select(x => x.ProductId).Distinct().OrderBy(x => x).ToList();
                for (var i = 0; i < productIds.Count; i++)
                {
                    for (var j = i + 1; j < productIds.Count; j++)
                    {
                        var key = (productIds[i], productIds[j]);
                        pairCounts[key] = pairCounts.TryGetValue(key, out var count) ? count + 1 : 1;
                    }
                }
            }

            if (pairCounts.Count == 0)
            {
                return null;
            }

            var topPair = pairCounts.OrderByDescending(kvp => kvp.Value).First().Key;
            var items = new List<SmartComboItemDto>();
            var firstItem = BuildItem(topPair.Item1, 1, products);
            var secondItem = BuildItem(topPair.Item2, 1, products);
            if (firstItem != null)
            {
                items.Add(firstItem);
            }
            if (secondItem != null)
            {
                items.Add(secondItem);
            }

            if (items.Count == 0)
            {
                return null;
            }

            return BuildSuggestion(
                "combo_for_two",
                "Combo para 2",
                "Basado en productos que se piden juntos.",
                items);
        }
    }
}
