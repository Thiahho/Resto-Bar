using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Back.Migrations
{
    /// <inheritdoc />
    public partial class AddWaiterTelegramFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add phone to user if not exists
            migrationBuilder.Sql(@"ALTER TABLE ""user"" ADD COLUMN IF NOT EXISTS phone character varying(30)");

            // Add assigned_waiter_id to table_sessions if not exists
            migrationBuilder.Sql(@"ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS assigned_waiter_id integer");

            // Add FK assigned_waiter_id → user if not exists
            migrationBuilder.Sql(@"
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_table_sessions_user_assigned_waiter_id'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT fk_table_sessions_user_assigned_waiter_id
      FOREIGN KEY (assigned_waiter_id) REFERENCES ""user""(id) ON DELETE SET NULL;
  END IF;
END $$");

            // Create index on assigned_waiter_id if not exists
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ix_table_sessions_assigned_waiter_id ON table_sessions(assigned_waiter_id)");

            // Rename whatsapp_api_key → telegram_chat_id (varchar 50) if whatsapp_api_key still exists
            migrationBuilder.Sql(@"
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'whatsapp_api_key'
  ) THEN
    ALTER TABLE ""user"" RENAME COLUMN whatsapp_api_key TO telegram_chat_id;
    ALTER TABLE ""user"" ALTER COLUMN telegram_chat_id TYPE character varying(50);
  END IF;
END $$");

            // Add telegram_chat_id if it still doesn't exist (case: whatsapp_api_key never existed)
            migrationBuilder.Sql(@"ALTER TABLE ""user"" ADD COLUMN IF NOT EXISTS telegram_chat_id character varying(50)");

            // Drop unique index on endpoint (no longer needed in model)
            migrationBuilder.DropIndex(
                name: "ix_user_push_subscriptions_endpoint",
                table: "user_push_subscriptions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_user_push_subscriptions_endpoint",
                table: "user_push_subscriptions",
                column: "endpoint",
                unique: true);

            migrationBuilder.Sql(@"ALTER TABLE ""user"" DROP COLUMN IF EXISTS telegram_chat_id");
            migrationBuilder.Sql(@"ALTER TABLE ""user"" DROP COLUMN IF EXISTS phone");
            migrationBuilder.Sql(@"ALTER TABLE table_sessions DROP COLUMN IF EXISTS assigned_waiter_id");
        }
    }
}
