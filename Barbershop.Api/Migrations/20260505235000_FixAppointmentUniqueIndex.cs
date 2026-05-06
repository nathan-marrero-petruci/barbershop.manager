using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barbershop.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixAppointmentUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the existing non-filtered unique index
            migrationBuilder.DropIndex(
                name: "IX_Appointments_BarberId_Start",
                table: "Appointments");

            // Create a partial unique index that only enforces uniqueness for active appointments.
            // Cancelled and Done appointments do not participate in the unique constraint,
            // allowing the same time slot to be reused after cancellation.
            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX \"IX_Appointments_BarberId_Start\" " +
                "ON \"Appointments\" (\"BarberId\", \"Start\") " +
                "WHERE \"Status\" NOT IN ('Cancelled', 'Done');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS \"IX_Appointments_BarberId_Start\";");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_BarberId_Start",
                table: "Appointments",
                columns: new[] { "BarberId", "Start" },
                unique: true);
        }
    }
}
