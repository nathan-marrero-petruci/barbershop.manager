using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barbershop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceAddons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Services",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ServiceAddons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Price = table.Column<decimal>(type: "TEXT", nullable: false),
                    IsHairCompatible = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsBeardCompatible = table.Column<bool>(type: "INTEGER", nullable: false),
                    AddsExtraTime = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceAddons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppointmentAddons",
                columns: table => new
                {
                    AppointmentId = table.Column<int>(type: "INTEGER", nullable: false),
                    ServiceAddonId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentAddons", x => new { x.AppointmentId, x.ServiceAddonId });
                    table.ForeignKey(
                        name: "FK_AppointmentAddons_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppointmentAddons_ServiceAddons_ServiceAddonId",
                        column: x => x.ServiceAddonId,
                        principalTable: "ServiceAddons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentAddons_ServiceAddonId",
                table: "AppointmentAddons",
                column: "ServiceAddonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppointmentAddons");

            migrationBuilder.DropTable(
                name: "ServiceAddons");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Services");
        }
    }
}
