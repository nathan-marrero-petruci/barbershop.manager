using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barbershop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentAccessToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessToken",
                table: "Appointments",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            // Gerar token único para agendamentos já existentes
            migrationBuilder.Sql(
                "UPDATE \"Appointments\" SET \"AccessToken\" = lower(hex(randomblob(16))) WHERE \"AccessToken\" = ''");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_AccessToken",
                table: "Appointments",
                column: "AccessToken",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Appointments_AccessToken",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "AccessToken",
                table: "Appointments");
        }
    }
}
