using System.Collections.Generic;

namespace Back.Dtos
{
    public class SmartComboSuggestionDto
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<SmartComboItemDto> Items { get; set; } = new();
        public int EstimatedTotalCents { get; set; }
    }

    public class SmartComboItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Qty { get; set; }
        public int UnitPriceCents { get; set; }
    }
}
