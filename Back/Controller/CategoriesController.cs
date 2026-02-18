using Back.Data;
using Back.Dtos;
using Back.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Back.Controller
{
    [ApiController]
    [Route("api/admin/categories")]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CategoriesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories()
        {
            return await _context.Categories
                .OrderBy(c => c.SortOrder)
                .Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    SortOrder = c.SortOrder,
                    DefaultStation = c.DefaultStation.HasValue ? c.DefaultStation.ToString() : null
                })
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<CategoryDto>> PostCategory(CreateUpdateCategoryDto categoryDto)
        {
            KitchenStation? station = null;
            if (!string.IsNullOrWhiteSpace(categoryDto.DefaultStation) &&
                Enum.TryParse<KitchenStation>(categoryDto.DefaultStation, out var parsedStation))
            {
                station = parsedStation;
            }

            var category = new Category { Name = categoryDto.Name, DefaultStation = station };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategories), new { id = category.Id }, new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                SortOrder = category.SortOrder,
                DefaultStation = category.DefaultStation?.ToString()
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutCategory(int id, CreateUpdateCategoryDto categoryDto)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            category.Name = categoryDto.Name;

            if (!string.IsNullOrWhiteSpace(categoryDto.DefaultStation) &&
                Enum.TryParse<KitchenStation>(categoryDto.DefaultStation, out var parsedStation))
            {
                category.DefaultStation = parsedStation;
            }
            else
            {
                category.DefaultStation = null;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == id);
            if (hasProducts)
            {
                return BadRequest("Cannot delete category with associated products.");
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderCategories([FromBody] List<ReorderCategoryDto> reorderList)
        {
            try
            {
                foreach (var item in reorderList)
                {
                    var category = await _context.Categories.FindAsync(item.CategoryId);
                    if (category != null)
                    {
                        category.SortOrder = item.SortOrder;
                    }
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error al reordenar categorías", details = ex.Message });
            }
        }
    }

}
