using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Back.Migrations
{
    /// <inheritdoc />
    public partial class AddWaiterWhatsAppFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "phone",
                table: "user",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "whatsapp_api_key",
                table: "user",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "assigned_waiter_id",
                table: "table_sessions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_table_sessions_assigned_waiter_id",
                table: "table_sessions",
                column: "assigned_waiter_id");

            migrationBuilder.AddForeignKey(
                name: "fk_table_sessions_user_assigned_waiter_id",
                table: "table_sessions",
                column: "assigned_waiter_id",
                principalTable: "user",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_table_sessions_user_assigned_waiter_id",
                table: "table_sessions");

            migrationBuilder.DropIndex(
                name: "ix_table_sessions_assigned_waiter_id",
                table: "table_sessions");

            migrationBuilder.DropColumn(
                name: "assigned_waiter_id",
                table: "table_sessions");

            migrationBuilder.DropColumn(
                name: "phone",
                table: "user");

            migrationBuilder.DropColumn(
                name: "whatsapp_api_key",
                table: "user");
        }
    }
}
