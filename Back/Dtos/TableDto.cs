using System.ComponentModel.DataAnnotations;

namespace Back.Dtos
{
    public class TableDto
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string Name { get; set; } = null!;
        public int Capacity { get; set; }
        public string Status { get; set; } = "AVAILABLE";
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }

        // Current session if table is occupied
        public TableSessionSummaryDto? CurrentSession { get; set; }
    }

    public class CreateUpdateTableDto
    {
        [Required, MaxLength(50)]
        public string Name { get; set; } = null!;

        [Required, Range(1, 100)]
        public int Capacity { get; set; }

        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class CreateTableDto
    {
        [Required, Range(1, int.MaxValue)]
        public int BranchId { get; set; } = 1;

        [Required, MaxLength(50)]
        public string Name { get; set; } = null!;

        [Required, Range(1, 100)]
        public int Capacity { get; set; }

        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateTableDto
    {
        [Required, MaxLength(50)]
        public string Name { get; set; } = null!;

        [Required, Range(1, 100)]
        public int Capacity { get; set; }

        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class ReserveTableDto
    {
        [MaxLength(120)]
        public string? CustomerName { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class TableSessionSummaryDto
    {
        public int Id { get; set; }
        public string? CustomerName { get; set; }
        public int GuestCount { get; set; }
        public DateTimeOffset OpenedAt { get; set; }
        public int OrderCount { get; set; }
        public int TotalCents { get; set; }
        public int? AssignedWaiterId { get; set; }
        public string? AssignedWaiterName { get; set; }
    }
}
