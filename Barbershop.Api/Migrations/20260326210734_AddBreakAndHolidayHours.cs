using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barbershop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBreakAndHolidayHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeSpan>(
                name: "BreakEnd",
                table: "WorkingHours",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "BreakStart",
                table: "WorkingHours",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "WorkEnd",
                table: "Holidays",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "WorkStart",
                table: "Holidays",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BreakEnd",
                table: "WorkingHours");

            migrationBuilder.DropColumn(
                name: "BreakStart",
                table: "WorkingHours");

            migrationBuilder.DropColumn(
                name: "WorkEnd",
                table: "Holidays");

            migrationBuilder.DropColumn(
                name: "WorkStart",
                table: "Holidays");
        }
    }
}
