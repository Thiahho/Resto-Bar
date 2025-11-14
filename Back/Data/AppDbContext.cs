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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configurar el enum OrderStatus para que se guarde como string en la BD
            modelBuilder.Entity<Order>()
                .Property(o => o.Status)
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
            modelBuilder.Entity<OrderStatusEntity>().HasIndex(x => new {x.Id, x.Activo});

            base.OnModelCreating(modelBuilder);
        }
    }
}
