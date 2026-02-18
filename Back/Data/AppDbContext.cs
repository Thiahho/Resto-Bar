using Back.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace Back.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

          public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    // public DbSet<ProductImage> ProductImages => Set<ProductImage>(); // TODO: Descomentar cuando exista la tabla
    public DbSet<BusinessSettings> BusinessSettings => Set<BusinessSettings>();
    public DbSet<GrowthSettings> GrowthSettings => Set<GrowthSettings>();

    // TODO: Descomentar cuando existan estas tablas en la BD
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Modifier> Modifiers => Set<Modifier>();
    public DbSet<ProductModifier> ProductModifiers => Set<ProductModifier>();
    public DbSet<Combo> Combos => Set<Combo>();
    public DbSet<ComboItem> ComboItems => Set<ComboItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CouponRedemption> CouponRedemptions => Set<CouponRedemption>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<OrderStatusEntity> OrderStatuses => Set<OrderStatusEntity>();
    public DbSet<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();
    public DbSet<Table> Tables => Set<Table>();
    public DbSet<TableSession> TableSessions => Set<TableSession>();
    public DbSet<KitchenTicket> KitchenTickets => Set<KitchenTicket>();
    public DbSet<UserPushSubscription> UserPushSubscriptions => Set<UserPushSubscription>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configurar el enum OrderStatus para que se guarde como string en la BD
            modelBuilder.Entity<Order>()
                .Property(o => o.Status)
                .HasConversion<string>();
            modelBuilder.Entity<OrderStatusHistory>()
                .Property(h => h.Status)
                .HasConversion<string>();

            // Configurar el enum KitchenStation para Category
            modelBuilder.Entity<Category>()
                .Property(c => c.DefaultStation)
                .HasConversion<string>();

            modelBuilder.Entity<Category>().HasIndex(x => x.SortOrder);
            modelBuilder.Entity<Product>().HasIndex(x => x.CategoryId);
            modelBuilder.Entity<Product>().HasIndex(x => x.Name).HasMethod("gin");

            // TODO: Descomentar cuando existan las tablas
            modelBuilder.Entity<ProductModifier>().HasKey(x => new { x.ProductId, x.ModifierId });
            modelBuilder.Entity<ComboItem>().HasKey(x => new { x.ComboId, x.ProductId });
            modelBuilder.Entity<CouponRedemption>().HasKey(x => new { x.CouponId, x.OrderId });
            modelBuilder.Entity<Coupon>().HasIndex(x => x.Code).IsUnique();
            modelBuilder.Entity<AuditLog>().HasIndex(x => new { x.Entity, x.EntityId });
            modelBuilder.Entity<Order>()
               .HasMany(x => x.Items).WithOne(x => x.Order).HasForeignKey(x => x.OrderId)
               .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Order>()
               .HasMany(x => x.StatusHistory).WithOne(x => x.Order).HasForeignKey(x => x.OrderId)
               .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OrderStatusEntity>().HasIndex(x => new {x.Id, x.Activo});
            modelBuilder.Entity<Order>().HasIndex(x => x.PublicCode).IsUnique();
            modelBuilder.Entity<OrderStatusHistory>().HasIndex(x => x.OrderId);

            // Dine-in entities configuration
            // Table
            modelBuilder.Entity<Table>()
                .Property(t => t.Status)
                .HasConversion<string>();
            modelBuilder.Entity<Table>().HasIndex(t => new { t.BranchId, t.SortOrder });
            modelBuilder.Entity<Table>().HasIndex(t => t.Status);
            modelBuilder.Entity<Table>()
                .HasMany(t => t.Sessions)
                .WithOne(s => s.Table)
                .HasForeignKey(s => s.TableId)
                .OnDelete(DeleteBehavior.Restrict);

            // TableSession
            modelBuilder.Entity<TableSession>()
                .Property(s => s.Status)
                .HasConversion<string>();
            modelBuilder.Entity<TableSession>().HasIndex(s => new { s.TableId, s.ClosedAt });
            modelBuilder.Entity<TableSession>().HasIndex(s => s.Status);
            // Unique constraint: only one active session per table
            modelBuilder.Entity<TableSession>()
                .HasIndex(s => s.TableId)
                .IsUnique()
                .HasFilter("closed_at IS NULL");
            modelBuilder.Entity<TableSession>()
                .HasMany(s => s.Orders)
                .WithOne(o => o.TableSession)
                .HasForeignKey(o => o.TableSessionId)
                .OnDelete(DeleteBehavior.Restrict);

            // KitchenTicket
            modelBuilder.Entity<KitchenTicket>()
                .Property(k => k.Station)
                .HasConversion<string>();
            modelBuilder.Entity<KitchenTicket>()
                .Property(k => k.Status)
                .HasConversion<string>();
            modelBuilder.Entity<KitchenTicket>().HasIndex(k => new { k.OrderId, k.Station });
            modelBuilder.Entity<KitchenTicket>().HasIndex(k => new { k.Status, k.Station });
            modelBuilder.Entity<KitchenTicket>().HasIndex(k => k.TicketNumber);

            // Order - KitchenTickets relationship
            modelBuilder.Entity<Order>()
                .HasMany(o => o.KitchenTickets)
                .WithOne(k => k.Order)
                .HasForeignKey(k => k.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            base.OnModelCreating(modelBuilder);
        }
    }
}
