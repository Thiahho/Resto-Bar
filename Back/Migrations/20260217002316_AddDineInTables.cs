using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Back.Migrations
{
    /// <inheritdoc />
    public partial class AddDineInTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add table_session_id column to orders table only if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'orders' AND column_name = 'table_session_id'
                    ) THEN
                        ALTER TABLE orders ADD COLUMN table_session_id integer NULL;
                    END IF;
                END $$;
            ");

            migrationBuilder.CreateTable(
                name: "kitchen_tickets",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_id = table.Column<int>(type: "integer", nullable: false),
                    station = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    ticket_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ready_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    delivered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    assigned_to_user_id = table.Column<int>(type: "integer", nullable: true),
                    items_snapshot = table.Column<string>(type: "jsonb", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_kitchen_tickets", x => x.id);
                    table.ForeignKey(
                        name: "fk_kitchen_tickets_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_kitchen_tickets_user_assigned_to_user_id",
                        column: x => x.assigned_to_user_id,
                        principalTable: "user",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tables",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    branch_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tables", x => x.id);
                    table.ForeignKey(
                        name: "fk_tables_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "table_sessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    table_id = table.Column<int>(type: "integer", nullable: false),
                    customer_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    guest_count = table.Column<int>(type: "integer", nullable: false),
                    opened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    opened_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    closed_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    subtotal_cents = table.Column<int>(type: "integer", nullable: false),
                    total_cents = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_table_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_table_sessions_tables_table_id",
                        column: x => x.table_id,
                        principalTable: "tables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_table_sessions_user_closed_by_user_id",
                        column: x => x.closed_by_user_id,
                        principalTable: "user",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_table_sessions_user_opened_by_user_id",
                        column: x => x.opened_by_user_id,
                        principalTable: "user",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_orders_table_session_id",
                table: "orders",
                column: "table_session_id");

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_tickets_assigned_to_user_id",
                table: "kitchen_tickets",
                column: "assigned_to_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_tickets_order_id_station",
                table: "kitchen_tickets",
                columns: new[] { "order_id", "station" });

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_tickets_status_station",
                table: "kitchen_tickets",
                columns: new[] { "status", "station" });

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_tickets_ticket_number",
                table: "kitchen_tickets",
                column: "ticket_number");

            migrationBuilder.CreateIndex(
                name: "ix_table_sessions_closed_by_user_id",
                table: "table_sessions",
                column: "closed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_table_sessions_opened_by_user_id",
                table: "table_sessions",
                column: "opened_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_table_sessions_status",
                table: "table_sessions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_table_sessions_table_id",
                table: "table_sessions",
                column: "table_id",
                unique: true,
                filter: "closed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_table_sessions_table_id_closed_at",
                table: "table_sessions",
                columns: new[] { "table_id", "closed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_tables_branch_id_sort_order",
                table: "tables",
                columns: new[] { "branch_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_tables_status",
                table: "tables",
                column: "status");

            migrationBuilder.AddForeignKey(
                name: "fk_orders_table_sessions_table_session_id",
                table: "orders",
                column: "table_session_id",
                principalTable: "table_sessions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_orders_table_sessions_table_session_id",
                table: "orders");

            migrationBuilder.DropTable(
                name: "kitchen_tickets");

            migrationBuilder.DropTable(
                name: "table_sessions");

            migrationBuilder.DropTable(
                name: "tables");

            migrationBuilder.DropIndex(
                name: "ix_orders_table_session_id",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "table_session_id",
                table: "orders");
        }
    }
}
