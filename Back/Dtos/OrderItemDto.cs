using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class OrderItemDto
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int? ProductId { get; set; }
        public string NameSnapshot { get; set; }
        public int Qty { get; set; }
        public int UnitPriceCents { get; set; }
        public int ModifiersTotalCents { get; set; }
        public int LineTotalCents { get; set; }
        public string? ModifiersSnapshot { get; set; }
    }

}
