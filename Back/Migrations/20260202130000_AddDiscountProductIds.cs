using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Back.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscountProductIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "happy_hour_product_ids_json",
                table: "growth_settings",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "dynamic_pricing_product_ids_json",
                table: "growth_settings",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "happy_hour_product_ids_json",
                table: "growth_settings");

            migrationBuilder.DropColumn(
                name: "dynamic_pricing_product_ids_json",
                table: "growth_settings");
        }
    }
}
