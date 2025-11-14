using Back.Data;
using Back.Dtos;
using Back.Services;
using Back.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Back.Controller
{
    [ApiController]
    [Route("api/admin/products")]
    [Authorize]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ImageService _imageService;
        private readonly ILogger<ProductsController> _logger;

        public ProductsController(AppDbContext context, ImageService imageService, ILogger<ProductsController> logger)
        {
            _context = context;
            _imageService = imageService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
        {
            return await _context.Products
                .Include(p => p.Category)
                .OrderBy(p => p.DisplayOrder)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    PriceCents = p.PriceCents,
                    HasImage = p.ImageData != null && p.ImageData.Length > 0,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    DisplayOrder = p.DisplayOrder
                })
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<ProductDto>> PostProduct([FromForm] CreateProductDto productDto)
        {
            try
            {
                _logger.LogInformation("Creando producto: {Name}", productDto.Name);
                _logger.LogInformation("Imagen recibida: {HasImage}, Tamaño: {Size} bytes",
                    productDto.ImageData != null,
                    productDto.ImageData?.Length ?? 0);

                var product = new Product
                {
                    Name = productDto.Name,
                    Description = productDto.Description,
                    PriceCents = productDto.PriceCents,
                    CategoryId = productDto.CategoryId
                };

                // Guardar imagen si se proporcionó
                if (productDto.ImageData != null)
                {
                    _logger.LogInformation("Procesando imagen...");
                    product.ImageData = await _imageService.ProcessImageAsync(productDto.ImageData);
                    _logger.LogInformation("Imagen procesada. Tamaño final: {Size} bytes", product.ImageData?.Length ?? 0);
                }
                else
                {
                    _logger.LogWarning("No se recibió imagen");
                }

                _context.Products.Add(product);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Producto guardado con ID: {Id}, HasImage: {HasImage}",
                    product.Id,
                    product.ImageData != null && product.ImageData.Length > 0);

                await _context.Entry(product).Reference(p => p.Category).LoadAsync();

                return CreatedAtAction(nameof(GetProducts), new { id = product.Id }, new ProductDto
                {
                    Id = product.Id,
                    Name = product.Name,
                    Description = product.Description,
                    PriceCents = product.PriceCents,
                    HasImage = product.ImageData != null && product.ImageData.Length > 0,
                    CategoryId = product.CategoryId,
                    CategoryName = product.Category.Name,
                    DisplayOrder = product.DisplayOrder
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear producto");
                return StatusCode(500, new { error = "Error al crear el producto", details = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProduct(int id, [FromForm] UpdateProductDto productDto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            product.Name = productDto.Name;
            product.Description = productDto.Description;
            product.PriceCents = productDto.PriceCents;
            product.CategoryId = productDto.CategoryId;

            // Actualizar imagen si se proporcionó una nueva
            if (productDto.ImageData != null)
            {
                product.ImageData = await _imageService.ProcessImageAsync(productDto.ImageData);
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderProducts([FromBody] List<ReorderProductDto> reorderList)
        {
            try
            {
                foreach (var item in reorderList)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product != null)
                    {
                        product.DisplayOrder = item.DisplayOrder;
                    }
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al reordenar productos");
                return StatusCode(500, new { error = "Error al reordenar productos", details = ex.Message });
            }
        }
    }
}
