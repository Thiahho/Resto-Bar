namespace Back.Dtos
{
    public class BusinessInfoDto
    {
        public string Name { get; set; }
        public string? Description { get; set; }
        public BannerDto Banner { get; set; }
        public string[] Hours { get; set; }
        public ContactDto Contact { get; set; }
    }

    public class BannerDto
    {
        public string ImageUrl { get; set; }
        public string Title { get; set; }
        public string Subtitle { get; set; }
    }

    public class ContactDto
    {
        public string Phone { get; set; }
        public string Address { get; set; }
        public string? TransferAlias { get; set; }
        public SocialDto Social { get; set; }
    }

    public class SocialDto
    {
        public string Instagram { get; set; }
        public string Facebook { get; set; }
    }

    public class UpdateBusinessInfoDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? BannerTitle { get; set; }
        public string? BannerSubtitle { get; set; }
        public string[]? Hours { get; set; }
        public string? ContactPhone { get; set; }
        public string? ContactAddress { get; set; }
        public string? ContactTransferAlias { get; set; }
        public string? SocialInstagram { get; set; }
        public string? SocialFacebook { get; set; }
    }

    public class CatalogDto
    {
        public IEnumerable<ProductDto> Products { get; set; }
        public IEnumerable<CategoryDto> Categories { get; set; }
        public BusinessInfoDto BusinessInfo { get; set; }
        public ActivePromotionDto? ActivePromotion { get; set; }
        public UpsellConfigDto? UpsellConfig { get; set; }
        public TwoForOneConfigDto? TwoForOneConfig { get; set; }
    }

    public class ActivePromotionDto
    {
        public string Type { get; set; } // "happy_hour" o "dynamic_pricing"
        public string Message { get; set; } // Mensaje a mostrar
        public int DiscountPercent { get; set; } // Porcentaje de descuento
    }

    public class UpsellConfigDto
    {
        public bool Enabled { get; set; }
        public int DiscountPercent { get; set; }
        public string? Message { get; set; }
    }

    public class TwoForOneConfigDto
    {
        public bool Active { get; set; } // Si está activo hoy
        public List<int> ProductIds { get; set; } = new(); // IDs de productos elegibles (vacío = todos)
    }
}
