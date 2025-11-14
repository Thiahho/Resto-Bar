using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace Back.Services
{
    public class ImageService
    {
        private readonly IWebHostEnvironment _hostEnvironment;
        private const int MaxImageWidth = 800;
        private const int MaxImageHeight = 800;

        public ImageService(IWebHostEnvironment hostEnvironment)
        {
            _hostEnvironment = hostEnvironment;
        }

        /// <summary>
        /// Procesa una imagen y la convierte a formato WebP, retornando los bytes
        /// </summary>
        public async Task<byte[]> ProcessImageAsync(IFormFile imageFile)
        {
            if (imageFile == null || imageFile.Length == 0)
            {
                return null;
            }

            // Validar que sea una imagen
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp" };
            var extension = Path.GetExtension(imageFile.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
            {
                throw new InvalidOperationException("Invalid image format. Only JPG, PNG, GIF, BMP, and WebP are allowed.");
            }

            using (var image = await Image.LoadAsync(imageFile.OpenReadStream()))
            {
                // Redimensionar la imagen para ahorrar espacio
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(MaxImageWidth, MaxImageHeight),
                    Mode = ResizeMode.Max
                }));

                // Convertir a WebP y guardar en memoria
                using (var ms = new MemoryStream())
                {
                    await image.SaveAsync(ms, new WebpEncoder());
                    return ms.ToArray();
                }
            }
        }

        [Obsolete("Use ProcessImageAsync instead")]
        public async Task<string> SaveImageAsync(IFormFile imageFile)
        {
            if (imageFile == null || imageFile.Length == 0)
            {
                return null;
            }

            var uploadsFolder = Path.Combine(_hostEnvironment.WebRootPath, "images");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = $"{Guid.NewGuid().ToString()}_{Path.GetFileNameWithoutExtension(imageFile.FileName)}.webp";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var image = await Image.LoadAsync(imageFile.OpenReadStream()))
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(800, 800),
                    Mode = ResizeMode.Max
                }));

                await image.SaveAsync(filePath, new WebpEncoder());
            }

            return $"/images/{uniqueFileName}";
        }
    }
}
