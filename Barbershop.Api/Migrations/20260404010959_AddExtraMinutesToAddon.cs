using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barbershop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExtraMinutesToAddon : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AddsExtraTime",
                table: "ServiceAddons",
                newName: "ExtraMinutes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ExtraMinutes",
                table: "ServiceAddons",
                newName: "AddsExtraTime");
        }
    }
}
