using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Back.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionPaymentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "paid_at",
                table: "table_sessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_method",
                table: "table_sessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tip_cents",
                table: "table_sessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "paid_at",
                table: "table_sessions");

            migrationBuilder.DropColumn(
                name: "payment_method",
                table: "table_sessions");

            migrationBuilder.DropColumn(
                name: "tip_cents",
                table: "table_sessions");
        }
    }
}
