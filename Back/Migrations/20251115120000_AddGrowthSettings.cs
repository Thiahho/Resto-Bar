using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Back.Migrations
{
    /// <inheritdoc />
    public partial class AddGrowthSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "growth_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    upsell_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    upsell_discount = table.Column<int>(type: "integer", nullable: false),
                    upsell_message = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    smart_combos_most_requested = table.Column<bool>(type: "boolean", nullable: false),
                    smart_combos_night_combo = table.Column<bool>(type: "boolean", nullable: false),
                    smart_combos_combo_for_two = table.Column<bool>(type: "boolean", nullable: false),
                    winback_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    winback_days = table.Column<int>(type: "integer", nullable: false),
                    two_for_one_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    two_for_one_days_json = table.Column<string>(type: "jsonb", nullable: false),
                    happy_hour_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    happy_hour_days_json = table.Column<string>(type: "jsonb", nullable: false),
                    happy_hour_start = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    happy_hour_end = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    happy_hour_discount = table.Column<int>(type: "integer", nullable: false),
                    peak_hour_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    peak_hour_hide_slow_products = table.Column<bool>(type: "boolean", nullable: false),
                    peak_hour_boost_fast_products = table.Column<bool>(type: "boolean", nullable: false),
                    peak_hour_threshold_orders = table.Column<int>(type: "integer", nullable: false),
                    peak_hour_start = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    peak_hour_end = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    dynamic_pricing_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    dynamic_pricing_off_peak_discount = table.Column<int>(type: "integer", nullable: false),
                    dynamic_pricing_off_peak_start = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    dynamic_pricing_off_peak_end = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    dynamic_pricing_peak_message = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_growth_settings", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "growth_settings");
        }
    }
}
