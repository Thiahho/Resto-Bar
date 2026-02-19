using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class TableSessionDto
    {
        public int Id { get; set; }
        public int TableId { get; set; }
        public string? TableName { get; set; }
        public string? CustomerName { get; set; }
        public int GuestCount { get; set; }
        public DateTimeOffset OpenedAt { get; set; }
        public DateTimeOffset? ClosedAt { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public int? OpenedByUserId { get; set; }
        public string? OpenedByUserName { get; set; }
        public int? ClosedByUserId { get; set; }
        public string? ClosedByUserName { get; set; }
        public int? AssignedWaiterId { get; set; }
        public string? AssignedWaiterName { get; set; }
        public string? AssignedWaiterPhone { get; set; }
        public int SubtotalCents { get; set; }
        public int TotalCents { get; set; }
        public int TipCents { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTimeOffset? PaidAt { get; set; }
        public string? Notes { get; set; }
        public List<OrderDto> Orders { get; set; } = new();
    }

    public class OpenTableSessionDto
    {
        [MaxLength(120)]
        public string? CustomerName { get; set; }

        [Required, Range(1, 50)]
        public int GuestCount { get; set; } = 1;

        [MaxLength(500)]
        public string? Notes { get; set; }

        public int? WaiterId { get; set; }
    }

    public class CloseTableSessionDto
    {
        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "CASH";  // CASH, CARD, TRANSFER

        [Range(0, int.MaxValue)]
        public int TipCents { get; set; } = 0;

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class TableSessionListItemDto
    {
        public int Id { get; set; }
        public int TableId { get; set; }
        public string? TableName { get; set; }
        public string? CustomerName { get; set; }
        public int GuestCount { get; set; }
        public DateTimeOffset OpenedAt { get; set; }
        public DateTimeOffset? ClosedAt { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public string? OpenedByUserName { get; set; }
        public string? ClosedByUserName { get; set; }
        public int SubtotalCents { get; set; }
        public int TipCents { get; set; }
        public int TotalCents { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTimeOffset? PaidAt { get; set; }
        public string? Notes { get; set; }
        public int OrderCount { get; set; }
    }

    public class SessionsDailySummaryDto
    {
        public string Date { get; set; } = "";
        public List<TableSessionListItemDto> Sessions { get; set; } = new();
        public int SessionCount { get; set; }
        public int TotalByCash { get; set; }
        public int TotalByCard { get; set; }
        public int TotalByTransfer { get; set; }
        public int TotalTips { get; set; }
        public int GrandTotal { get; set; }
    }

    public class CreateTableOrderDto
    {
        [Required]
        public List<OrderItemDto> Items { get; set; } = new();

        [MaxLength(500)]
        public string? Note { get; set; }

        /// <summary>Descuento pre-calculado por el cliente (ej. 2x1). Se valida que no supere el subtotal.</summary>
        [Range(0, int.MaxValue)]
        public int DiscountCents { get; set; } = 0;
    }
}
