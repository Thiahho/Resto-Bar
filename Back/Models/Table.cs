using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Back.Models
{
    [Table("tables")]
    public class Table
    {
        [Key] public int Id { get; set; }

        public int BranchId { get; set; }
        [ForeignKey(nameof(BranchId))] public Branch Branch { get; set; } = null!;

        [Required, MaxLength(50)] public string Name { get; set; } = null!;
        public int Capacity { get; set; }

        [Required] public TableStatus Status { get; set; } = TableStatus.AVAILABLE;

        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation
        public List<TableSession> Sessions { get; set; } = new();
    }
}
