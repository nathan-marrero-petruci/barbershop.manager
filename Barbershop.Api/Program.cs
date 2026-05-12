using System;
using System.Collections.Generic;
using System.Linq;
using System.Globalization;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Net.Http;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using System.Security.Cryptography;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.OpenApi;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite("Data Source=barbershop.db;Mode=ReadWriteCreate;Pooling=False",
        sqlite => sqlite.CommandTimeout(30)));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Insira o token JWT. Exemplo: \"Bearer eyJ...\""
    });

    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer"),
            new List<string>()
        }
    });
});
var allowedOrigin = builder.Configuration["ALLOWED_ORIGIN"] ?? "http://localhost:5173";
builder.Services.AddCors(options => options.AddPolicy("AllowFrontend", policy =>
    policy.WithOrigins(allowedOrigin).AllowAnyMethod().AllowAnyHeader().AllowCredentials()));
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            if (ctx.Request.Cookies.TryGetValue("admin_token", out var cookie))
                ctx.Token = cookie;
            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? ""))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("booking", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});
builder.Services.AddHttpClient("whatsapp");
builder.Services.AddHostedService<WhatsAppReminderService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Habilita WAL mode para melhor concorrência em produção
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
    db.Database.ExecuteSqlRaw("PRAGMA synchronous=NORMAL;");
    db.Database.ExecuteSqlRaw("PRAGMA busy_timeout=5000;");

    if (!db.Barbers.Any())
        db.Barbers.AddRange(new Barber { Name = "João" }, new Barber { Name = "Pedro" });

    // Re-seed services if still on placeholder data (Duration < 40)
    var oldServices = db.Services.Where(s => s.Duration < 40).ToList();
    if (oldServices.Any()) db.Services.RemoveRange(oldServices);

    if (!db.Services.Any())
    {
        db.Services.AddRange(
            new Service { Name = "Corte",        Duration = 40, Price = 45m,  Category = "hair"  },
            new Service { Name = "Barba",         Duration = 40, Price = 35m,  Category = "beard" },
            new Service { Name = "Corte + Barba", Duration = 60, Price = 80m,  Category = "both"  }
        );
    }
    db.SaveChanges();

    if (!db.ServiceAddons.Any())
    {
        db.ServiceAddons.AddRange(
            new ServiceAddon { Name = "Sobrancelha",          Price = 10m, IsHairCompatible = true,  IsBeardCompatible = true,  ExtraMinutes = 0  },
            new ServiceAddon { Name = "Pigmentação capilar",   Price = 35m, IsHairCompatible = true,  IsBeardCompatible = false, ExtraMinutes = 30 },
            new ServiceAddon { Name = "Pigmentação de barba",  Price = 15m, IsHairCompatible = false, IsBeardCompatible = true,  ExtraMinutes = 20 },
            new ServiceAddon { Name = "Relaxamento",           Price = 50m, IsHairCompatible = true,  IsBeardCompatible = true,  ExtraMinutes = 40 },
            new ServiceAddon { Name = "Escova",                Price = 10m, IsHairCompatible = true,  IsBeardCompatible = true,  ExtraMinutes = 15 },
            new ServiceAddon { Name = "Progressiva",           Price = 70m, IsHairCompatible = true,  IsBeardCompatible = false, ExtraMinutes = 60 }
        );
        db.SaveChanges();
    }

    if (!db.WorkingHours.Any())
    {
        var barbersList = db.Barbers.ToList();
        foreach (var b in barbersList)
        {
            for (DayOfWeek d = DayOfWeek.Monday; d <= DayOfWeek.Friday; d++)
            {
                db.WorkingHours.Add(new WorkingHour { BarberId = b.Id, DayOfWeek = d, Start = new TimeSpan(9, 0, 0), End = new TimeSpan(18, 0, 0) });
            }
            db.WorkingHours.Add(new WorkingHour { BarberId = b.Id, DayOfWeek = DayOfWeek.Saturday, Start = new TimeSpan(9, 0, 0), End = new TimeSpan(13, 0, 0) });
        }
        db.SaveChanges();
    }

    if (!db.AdminUsers.Any())
    {
        var adminPw = PasswordHasher.Hash("admin");
        db.AdminUsers.Add(new AdminUser { Username = "admin", PasswordHash = adminPw, Role = "Admin" });
        db.SaveChanges();
    }

    if (!db.AppSettings.Any())
    {
        db.AppSettings.AddRange(
            new AppSetting { Key = "pix_key",               Value = "" },
            new AppSetting { Key = "pix_beneficiario",      Value = "Barbearia Espaço Vip" },
            new AppSetting { Key = "reminder_hours_before", Value = "2" },
            new AppSetting { Key = "whatsapp_api_url",      Value = "" },
            new AppSetting { Key = "whatsapp_api_token",    Value = "" },
            new AppSetting { Key = "whatsapp_instance",     Value = "" },
            new AppSetting { Key = "min_booking_advance_hours", Value = "24" }
        );
        db.SaveChanges();
    }
    // Ensure min_booking_advance_hours exists for existing installations
    if (!db.AppSettings.Any(s => s.Key == "min_booking_advance_hours"))
    {
        db.AppSettings.Add(new AppSetting { Key = "min_booking_advance_hours", Value = "24" });
        db.SaveChanges();
    }
}

// ── Webhook UltraMsg ─────────────────────────────────────────────────────────
// Recebe mensagens recebidas no número da barbearia e responde com o link de agendamento.
app.MapPost("/webhooks/whatsapp", async (HttpRequest req, AppDbContext db, IHttpClientFactory httpFactory, ILogger<Program> logger) =>
{
    // UltraMsg envia form-urlencoded
    var form = await req.ReadFormAsync();

    var eventType = form["event_type"].ToString();   // "message_received" ou "message_create"
    var from      = form["from"].ToString();          // número do remetente (ex: "5511999999999@c.us")
    var body      = form["body"].ToString();          // texto da mensagem
    var fromMe    = form["from_me"].ToString();       // "true" se foi o próprio bot que enviou

    // Ignorar mensagens enviadas pelo próprio número (evita loop)
    if (fromMe == "true" || eventType != "message_received")
        return Results.Ok();

    // Ignorar grupos (contêm @g.us)
    if (from.Contains("@g.us"))
        return Results.Ok();

    var waToken    = Environment.GetEnvironmentVariable("WHATSAPP_API_TOKEN")
                   ?? (await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "whatsapp_api_token"))?.Value ?? "";
    var waInstance = Environment.GetEnvironmentVariable("WHATSAPP_INSTANCE")
                   ?? (await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "whatsapp_instance"))?.Value ?? "";

    if (string.IsNullOrWhiteSpace(waToken) || string.IsNullOrWhiteSpace(waInstance))
        return Results.Ok();

    var frontendUrl = Environment.GetEnvironmentVariable("ALLOWED_ORIGIN") ?? "http://localhost:5173";
    var bookingLink = frontendUrl;

    var msg = $"Olá! 👋\n"
            + $"Para agendar seu horário na *Barbearia Espaço Vip*, acesse o link abaixo:\n\n"
            + $"🔗 {bookingLink}\n\n"
            + "É rápido e fácil! Escolha o serviço, o barbeiro e o horário que preferir. 😊";

    try
    {
        var http = httpFactory.CreateClient("whatsapp");
        await WhatsAppSender.SendAsync(http, waToken, waInstance, from, msg);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Falha ao responder webhook WhatsApp para {From}", from);
    }

    return Results.Ok();
}).RequireRateLimiting("booking");

app.MapGet("/barbers", async (AppDbContext db) => await db.Barbers.Where(b => b.IsActive).ToListAsync());
app.MapGet("/services", async (AppDbContext db) => await db.Services.OrderBy(s => s.Category).ThenBy(s => s.Name).ToListAsync());
app.MapGet("/addons", async (string? category, AppDbContext db) =>
{
    var q = db.ServiceAddons.AsQueryable();
    if (category == "hair")  q = q.Where(a => a.IsHairCompatible);
    if (category == "beard") q = q.Where(a => a.IsBeardCompatible);
    return await q.OrderBy(a => a.ExtraMinutes).ThenBy(a => a.Name).ToListAsync();
});

app.MapGet("/settings/public", async (AppDbContext db) =>
{
    var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "min_booking_advance_hours");
    var hours = int.TryParse(setting?.Value, out var h) ? h : 24;
    return Results.Ok(new { minBookingAdvanceHours = hours });
});

app.MapPost("/appointments", async (AppointmentDto dto, AppDbContext db, IHttpClientFactory httpFactory) =>
{
    
    var validationResults = new List<ValidationResult>();
    var ctx = new ValidationContext(dto);
    if (!Validator.TryValidateObject(dto, ctx, validationResults, true))
        return Results.BadRequest(new { errors = validationResults.Select(r => r.ErrorMessage) });

    var startUtc = dto.Start.Kind == DateTimeKind.Utc ? dto.Start : dto.Start.ToUniversalTime();
    if (startUtc <= DateTime.UtcNow.AddMinutes(-1))
        return Results.BadRequest("Start must be in the future.");

    // Block booking on a full holiday
    var bookingDate = startUtc.Date;
    var holiday = await db.Holidays.Where(h => h.Date.Date == bookingDate).FirstOrDefaultAsync();
    if (holiday != null && (!holiday.WorkStart.HasValue || !holiday.WorkEnd.HasValue))
        return Results.BadRequest("Não é possível agendar em um feriado.");

    var service = await db.Services.FindAsync(dto.ServiceId);
    if (service == null) return Results.BadRequest("Serviço inválido.");

    var pixKey          = (await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "pix_key"))?.Value ?? "";
    var pixBeneficiario = (await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "pix_beneficiario"))?.Value ?? "";
    // Fetch WA credentials before transaction to avoid rollback-after-commit bug
    var waToken    = Environment.GetEnvironmentVariable("WHATSAPP_API_TOKEN")
                   ?? (await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "whatsapp_api_token"))?.Value ?? "";
    var waInstance = Environment.GetEnvironmentVariable("WHATSAPP_INSTANCE")
                   ?? (await db.AppSettings.FirstOrDefaultAsync(s => s.Key == "whatsapp_instance"))?.Value ?? "";

    var addons = dto.AddonIds.Count > 0
        ? await db.ServiceAddons.Where(a => dto.AddonIds.Contains(a.Id)).ToListAsync()
        : new List<ServiceAddon>();
    bool hasTimeAddon = addons.Any(a => a.ExtraMinutes > 0);
    int totalDuration = service.Duration + addons.Sum(a => a.ExtraMinutes);
    var endUtc = startUtc.AddMinutes(totalDuration);

    Appointment appt;
    Customer customer;

    await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
    try
    {
        var conflict = await db.Appointments.AnyAsync(a =>
            a.BarberId == dto.BarberId && a.Start < endUtc && a.End > startUtc
            && a.Status != "Cancelled" && a.Status != "Done");

        if (conflict)
        {
            await tx.RollbackAsync();
            return Results.Conflict(new { error = "SlotTaken", message = "Horário ocupado." });
        }

        customer = await db.Customers.FirstOrDefaultAsync(c => c.Email == dto.CustomerEmail);
        if (customer == null)
        {
            customer = new Customer { Name = dto.CustomerName, Email = dto.CustomerEmail, Phone = dto.CustomerPhone };
            db.Customers.Add(customer);
        }
        else
        {
            customer.Phone = dto.CustomerPhone;
            customer.Name = dto.CustomerName;
        }
        await db.SaveChangesAsync();

        appt = new Appointment
        {
            BarberId = dto.BarberId,
            ServiceId = dto.ServiceId,
            CustomerId = customer.Id,
            Start = startUtc,
            End = endUtc,
            Status = "Pending"
        };

        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        foreach (var addon in addons)
            db.AppointmentAddons.Add(new AppointmentAddon { AppointmentId = appt.Id, ServiceAddonId = addon.Id });
        if (addons.Count > 0) await db.SaveChangesAsync();

        await tx.CommitAsync();
    }
    catch
    {
        await tx.RollbackAsync();
        throw;
    }

    // Post-commit: outside try/catch so a failure here doesn't attempt rollback on committed tx
    var totalPrice = service.Price + addons.Sum(a => a.Price);

    // Send WhatsApp confirmation (fire-and-forget, don't fail booking if WA fails)
    if (!string.IsNullOrWhiteSpace(waToken) && !string.IsNullOrWhiteSpace(waInstance))
    {
        var frontendUrl = Environment.GetEnvironmentVariable("ALLOWED_ORIGIN") ?? "http://localhost:5173";
        var portalLink  = $"{frontendUrl}/meu-agendamento?id={appt.Id}&phone={Uri.EscapeDataString(dto.CustomerPhone)}";
        var localTime  = appt.Start.ToLocalTime();
        var confirmMsg = $"Ol\u00e1 {customer.Name}! \u2702\ufe0f\n"
                       + $"Seu agendamento na *Barbearia Espa\u00e7o Vip* foi *criado* com sucesso!\n\n"
                       + $"\u2702\ufe0f Servi\u00e7o: {service.Name}\n"
                       + $"\ud83d\udd50 Hor\u00e1rio: {localTime:HH:mm} \u2013 {localTime:dd/MM/yyyy}\n\n"
                       + $"\ud83d\udcb3 Total: R$ {totalPrice:F2}\n"
                       + (string.IsNullOrWhiteSpace(pixKey) ? "" : $"\ud83d\udd11 Chave PIX: {pixKey}\n\n")
                       + "*Pr\u00f3ximo passo:* realize o pagamento via PIX. O barbeiro ir\u00e1 confirmar o recebimento e seu agendamento ser\u00e1 oficialmente confirmado.\n\n"
                       + $"\ud83d\udd17 Consulte ou cancele seu agendamento: {portalLink}\n\n"
                       + "Em caso de d\u00favidas, entre em contato com a barbearia.";
        var waHttp = httpFactory.CreateClient("whatsapp");
        _ = WhatsAppSender.SendAsync(waHttp, waToken, waInstance, dto.CustomerPhone, confirmMsg);
    }

    return Results.Created($"/appointments/{appt.Id}", new {
        appt.Id, appt.Start, appt.Status,
        TotalPrice = totalPrice,
        PixKey = pixKey,
        PixBeneficiario = pixBeneficiario
    });
}).RequireRateLimiting("booking");

// ── Portal do cliente ─────────────────────────────────────────────────────────

static string NormalizePhone(string phone) =>
    new string(phone.Where(char.IsDigit).ToArray());

app.MapGet("/meu-agendamento", async (int id, string phone, AppDbContext db) =>
{
    var normalized = NormalizePhone(phone);
    if (string.IsNullOrEmpty(normalized))
        return Results.BadRequest("Telefone inválido.");

    var appt = await db.Appointments
        .Include(a => a.Addons).ThenInclude(aa => aa.ServiceAddon)
        .FirstOrDefaultAsync(a => a.Id == id);

    if (appt == null) return Results.NotFound();

    var customer = await db.Customers.FindAsync(appt.CustomerId);
    if (customer == null || NormalizePhone(customer.Phone) != normalized)
        return Results.NotFound();

    var service = await db.Services.FindAsync(appt.ServiceId);
    var barber  = await db.Barbers.FindAsync(appt.BarberId);

    return Results.Ok(new
    {
        appt.Id,
        Start = DateTime.SpecifyKind(appt.Start, DateTimeKind.Utc),
        End   = DateTime.SpecifyKind(appt.End,   DateTimeKind.Utc),
        appt.Status,
        ServiceName = service?.Name ?? "",
        BarberName  = barber?.Name ?? "",
        CustomerName = customer.Name,
        Addons = appt.Addons.Select(aa => aa.ServiceAddon.Name).ToList()
    });
});

app.MapDelete("/meu-agendamento/{id}", async (int id, string phone, AppDbContext db) =>
{
    var normalized = NormalizePhone(phone);
    if (string.IsNullOrEmpty(normalized))
        return Results.BadRequest("Telefone inválido.");

    var appt = await db.Appointments.FindAsync(id);
    if (appt == null) return Results.NotFound();

    var customer = await db.Customers.FindAsync(appt.CustomerId);
    if (customer == null || NormalizePhone(customer.Phone) != normalized)
        return Results.NotFound();

    if (appt.Status == "Cancelled")
        return Results.BadRequest("Agendamento já cancelado.");

    if (appt.Status == "Completed")
        return Results.BadRequest("Não é possível cancelar um agendamento já concluído.");

    appt.Status = "Cancelled";
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Agendamento cancelado com sucesso." });
});

app.MapGet("/barbers/{barberId}/availability", async (int barberId, string date, int? serviceId, string? addonIds, AppDbContext db) =>
{
    if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        return Results.BadRequest("Invalid date format. Use YYYY-MM-DD");

    var whList = (await db.WorkingHours
        .Where(w => w.BarberId == barberId && w.DayOfWeek == parsedDate.DayOfWeek)
        .ToListAsync())
        .OrderBy(w => w.Start)
        .ToList();

    // Check holiday: full day off → no slots; partial → override working hours
    var holiday = await db.Holidays.Where(h => h.Date.Date == parsedDate.Date).FirstOrDefaultAsync();
    if (holiday != null)
    {
        if (!holiday.WorkStart.HasValue || !holiday.WorkEnd.HasValue)
            return Results.Ok(new List<string>());
        whList = new List<WorkingHour>
        {
            new WorkingHour { BarberId = barberId, Start = holiday.WorkStart.Value, End = holiday.WorkEnd.Value }
        };
    }

    if (!whList.Any()) return Results.Ok(new List<string>());

    var duration = 40;
    if (serviceId.HasValue)
    {
        var svc = await db.Services.FindAsync(serviceId.Value);
        if (svc != null)
        {
            duration = svc.Duration;
            if (!string.IsNullOrEmpty(addonIds))
            {
                var idList = addonIds.Split(',')
                    .Select(s => int.TryParse(s.Trim(), out var id) ? id : 0)
                    .Where(id => id > 0).ToList();
                if (idList.Count > 0)
                {
                    var selAddons = await db.ServiceAddons.Where(a => idList.Contains(a.Id)).ToListAsync();
                    duration += selAddons.Sum(a => a.ExtraMinutes);
                }
            }
        }
    }

    var stepMinutes = 15;
    var dayStartLocal = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, 0, 0, 0, DateTimeKind.Local);
    var dayEndLocal = dayStartLocal.AddDays(1);

    var dayStartUtc = dayStartLocal.ToUniversalTime();
    var dayEndUtc = dayEndLocal.ToUniversalTime();
    var appointments = await db.Appointments
        .Where(a => a.BarberId == barberId && a.Start < dayEndUtc && a.End > dayStartUtc
                 && a.Status != "Cancelled" && a.Status != "Done")
        .ToListAsync();

    var slots = new List<string>();
    foreach (var wh in whList)
    {
        var intervalStartLocal = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, wh.Start.Hours, wh.Start.Minutes, wh.Start.Seconds, DateTimeKind.Local);
        var intervalEndLocal = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, wh.End.Hours, wh.End.Minutes, wh.End.Seconds, DateTimeKind.Local);

        for (var slotLocal = intervalStartLocal; slotLocal.AddMinutes(duration) <= intervalEndLocal; slotLocal = slotLocal.AddMinutes(stepMinutes))
        {
            // Skip slots that fall within the lunch break
            if (wh.BreakStart.HasValue && wh.BreakEnd.HasValue)
            {
                var bS = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, wh.BreakStart.Value.Hours, wh.BreakStart.Value.Minutes, 0, DateTimeKind.Local);
                var bE = new DateTime(parsedDate.Year, parsedDate.Month, parsedDate.Day, wh.BreakEnd.Value.Hours, wh.BreakEnd.Value.Minutes, 0, DateTimeKind.Local);
                if (slotLocal < bE && slotLocal.AddMinutes(duration) > bS) continue;
            }

            var slotStartUtc = slotLocal.ToUniversalTime();
            var slotEndUtc = slotLocal.AddMinutes(duration).ToUniversalTime();

            var conflict = appointments.Any(a => a.Start < slotEndUtc && a.End > slotStartUtc);
            if (!conflict) slots.Add(slotStartUtc.ToString("o"));
        }
    }

    return Results.Ok(slots);
});

app.MapPost("/admin/login", async (LoginDto dto, AppDbContext db, HttpContext ctx) =>
{
    var user = await db.AdminUsers.SingleOrDefaultAsync(u => u.Username == dto.Username);
    if (user == null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
        return Results.Unauthorized();

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Role, user.Role)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(app.Configuration["Jwt:Key"] ?? ""));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var expires = DateTime.UtcNow.AddMinutes(int.Parse(app.Configuration["Jwt:ExpiryMinutes"] ?? "60"));

    var token = new JwtSecurityToken(
        issuer: app.Configuration["Jwt:Issuer"],
        audience: app.Configuration["Jwt:Audience"],
        claims: claims,
        expires: expires,
        signingCredentials: creds
    );

    var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
    ctx.Response.Cookies.Append("admin_token", tokenString, new CookieOptions
    {
        HttpOnly = true,
        Secure   = true,
        SameSite = SameSiteMode.Strict,
        Expires  = expires,
        Path     = "/"
    });
    return Results.Ok(new { username = user.Username });
}).RequireRateLimiting("login");

// helper de validação (cole antes do bloco admin)
IResult? ValidateDto<T>(T dto) where T : notnull
{
    var validationResults = new List<ValidationResult>();
    var ctx = new ValidationContext(dto);
    if (!Validator.TryValidateObject(dto, ctx, validationResults, true))
        return Results.BadRequest(new { errors = validationResults.Select(r => r.ErrorMessage) });
    return null;
}

var admin = app.MapGroup("/admin").RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

admin.MapGet("/me", (ClaimsPrincipal user) =>
    Results.Ok(new { username = user.Identity?.Name }));

admin.MapPost("/logout", (HttpContext ctx) =>
{
    ctx.Response.Cookies.Delete("admin_token");
    return Results.Ok();
});

/* ---------------- Barbers CRUD ---------------- */
admin.MapGet("/barbers", async (AppDbContext db) => await db.Barbers.AsNoTracking().ToListAsync());

admin.MapPost("/barbers", async (Barber b, AppDbContext db) =>
{
    var bad = ValidateDto(b);
    if (bad != null) return bad;
    if (await db.Barbers.AnyAsync(x => x.Name == b.Name)) return Results.Conflict(new { error = "BarberExists" });
    db.Barbers.Add(b);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/barbers/{b.Id}", b);
});

admin.MapPut("/barbers/{id}", async (int id, Barber input, AppDbContext db) =>
{
    var bad = ValidateDto(input);
    if (bad != null) return bad;
    var e = await db.Barbers.FindAsync(id);
    if (e == null) return Results.NotFound();
    if (await db.Barbers.AnyAsync(x => x.Name == input.Name && x.Id != id)) return Results.Conflict(new { error = "BarberNameTaken" });
    e.Name = input.Name;
    await db.SaveChangesAsync();
    return Results.Ok(e);
});

admin.MapDelete("/barbers/{id}", async (int id, AppDbContext db) =>
{
    var e = await db.Barbers.FindAsync(id);
    if (e == null) return Results.NotFound();
    var hasAppts = await db.Appointments.AnyAsync(a => a.BarberId == id);
    if (hasAppts)
    {
        e.IsActive = false;
        await db.SaveChangesAsync();
        return Results.Ok(new { softDeleted = true, message = "Barbeiro inativado pois possui agendamentos vinculados." });
    }
    db.Barbers.Remove(e);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

admin.MapPatch("/barbers/{id}/activate", async (int id, AppDbContext db) =>
{
    var e = await db.Barbers.FindAsync(id);
    if (e == null) return Results.NotFound();
    e.IsActive = true;
    await db.SaveChangesAsync();
    return Results.Ok(e);
});

/* ---------------- Services CRUD ---------------- */
admin.MapGet("/services", async (AppDbContext db) => await db.Services.ToListAsync());

admin.MapPost("/services", async (ServiceDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    if (await db.Services.AnyAsync(s => s.Name == dto.Name)) return Results.Conflict(new { error = "ServiceExists" });
    var s = new Service { Name = dto.Name.Trim(), Duration = dto.Duration, Price = dto.Price, Category = dto.Category };
    db.Services.Add(s);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/services/{s.Id}", s);
});

admin.MapPut("/services/{id}", async (int id, ServiceDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    var e = await db.Services.FindAsync(id);
    if (e == null) return Results.NotFound();
    if (await db.Services.AnyAsync(s => s.Name == dto.Name && s.Id != id)) return Results.Conflict(new { error = "ServiceNameTaken" });
    e.Name = dto.Name.Trim();
    e.Duration = dto.Duration;
    e.Price = dto.Price;
    e.Category = dto.Category;
    await db.SaveChangesAsync();
    return Results.Ok(e);
});

admin.MapDelete("/services/{id}", async (int id, AppDbContext db) =>
{
    var e = await db.Services.FindAsync(id);
    if (e == null) return Results.NotFound();
    var hasAppts = await db.Appointments.AnyAsync(a => a.ServiceId == id);
    if (hasAppts) return Results.Conflict(new { error = "HasAppointments", message = "Não é possível apagar serviço com agendamentos." });
    db.Services.Remove(e);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ---------------- WorkingHours CRUD ---------------- */
admin.MapGet("/workinghours", async (AppDbContext db) => await db.WorkingHours.ToListAsync());

admin.MapPost("/workinghours", async (WorkingHourDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    if (!await db.Barbers.AnyAsync(b => b.Id == dto.BarberId)) return Results.BadRequest("Barbeiro inválido.");
    if (dto.Start >= dto.End) return Results.BadRequest("Start deve ser antes do End.");
    var dayHours = await db.WorkingHours
        .Where(w => w.BarberId == dto.BarberId && w.DayOfWeek == dto.DayOfWeek)
        .ToListAsync();
    var overlap = dayHours.Any(w => w.Start < dto.End && w.End > dto.Start);
    if (overlap) return Results.Conflict(new { error = "WorkingHourOverlap", message = "Já existe um horário conflitante para este barbeiro neste dia." });
    if (dto.BreakStart.HasValue != dto.BreakEnd.HasValue) return Results.BadRequest("Informe tanto BreakStart quanto BreakEnd.");
    if (dto.BreakStart.HasValue && (dto.BreakStart.Value <= dto.Start || dto.BreakEnd!.Value >= dto.End || dto.BreakStart.Value >= dto.BreakEnd!.Value))
        return Results.BadRequest("Intervalo de almoço inválido.");
    var w = new WorkingHour { BarberId = dto.BarberId, DayOfWeek = dto.DayOfWeek, Start = dto.Start, End = dto.End, BreakStart = dto.BreakStart, BreakEnd = dto.BreakEnd };
    db.WorkingHours.Add(w);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/workinghours/{w.Id}", w);
});

admin.MapPut("/workinghours/{id}", async (int id, WorkingHourDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    var e = await db.WorkingHours.FindAsync(id);
    if (e == null) return Results.NotFound();
    if (!await db.Barbers.AnyAsync(b => b.Id == dto.BarberId)) return Results.BadRequest("Barbeiro inválido.");
    if (dto.Start >= dto.End) return Results.BadRequest("Start deve ser antes do End.");
    var dayHoursEdit = await db.WorkingHours
        .Where(w => w.BarberId == dto.BarberId && w.DayOfWeek == dto.DayOfWeek && w.Id != id)
        .ToListAsync();
    var overlapEdit = dayHoursEdit.Any(w => w.Start < dto.End && w.End > dto.Start);
    if (overlapEdit) return Results.Conflict(new { error = "WorkingHourOverlap", message = "Já existe um horário conflitante para este barbeiro neste dia." });
    if (dto.BreakStart.HasValue != dto.BreakEnd.HasValue) return Results.BadRequest("Informe tanto BreakStart quanto BreakEnd.");
    if (dto.BreakStart.HasValue && (dto.BreakStart.Value <= dto.Start || dto.BreakEnd!.Value >= dto.End || dto.BreakStart.Value >= dto.BreakEnd!.Value))
        return Results.BadRequest("Intervalo de almoço inválido.");
    e.BarberId = dto.BarberId;
    e.DayOfWeek = dto.DayOfWeek;
    e.Start = dto.Start;
    e.End = dto.End;
    e.BreakStart = dto.BreakStart;
    e.BreakEnd = dto.BreakEnd;
    await db.SaveChangesAsync();
    return Results.Ok(e);
});

admin.MapDelete("/workinghours/{id}", async (int id, AppDbContext db) =>
{
    var e = await db.WorkingHours.FindAsync(id);
    if (e == null) return Results.NotFound();
    db.WorkingHours.Remove(e);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ---------------- Holidays CRUD ---------------- */
admin.MapGet("/holidays", async (AppDbContext db) => await db.Holidays.OrderBy(h => h.Date).ToListAsync());

admin.MapPost("/holidays", async (HolidayDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    var date = dto.Date.Date;
    if (await db.Holidays.AnyAsync(h => h.Date.Date == date)) return Results.Conflict(new { error = "HolidayExists" });
    if (dto.WorkStart.HasValue != dto.WorkEnd.HasValue) return Results.BadRequest("Informe tanto WorkStart quanto WorkEnd.");
    var h = new Holiday { Date = date, Description = dto.Description?.Trim(), WorkStart = dto.WorkStart, WorkEnd = dto.WorkEnd };
    db.Holidays.Add(h);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/holidays/{h.Id}", h);
});

admin.MapPut("/holidays/{id}", async (int id, HolidayDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    var existing = await db.Holidays.FindAsync(id);
    if (existing == null) return Results.NotFound();
    var date = dto.Date.Date;
    if (await db.Holidays.AnyAsync(h => h.Date.Date == date && h.Id != id)) return Results.Conflict(new { error = "HolidayExists" });
    if (dto.WorkStart.HasValue != dto.WorkEnd.HasValue) return Results.BadRequest("Informe tanto WorkStart quanto WorkEnd.");
    existing.Date = date;
    existing.Description = dto.Description?.Trim();
    existing.WorkStart = dto.WorkStart;
    existing.WorkEnd = dto.WorkEnd;
    await db.SaveChangesAsync();
    return Results.Ok(existing);
});

admin.MapDelete("/holidays/{id}", async (int id, AppDbContext db) =>
{
    var e = await db.Holidays.FindAsync(id);
    if (e == null) return Results.NotFound();
    db.Holidays.Remove(e);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ---------------- Addons CRUD ---------------- */
admin.MapGet("/addons", async (AppDbContext db) =>
    await db.ServiceAddons.OrderBy(a => a.ExtraMinutes).ThenBy(a => a.Name).ToListAsync());

admin.MapPost("/addons", async (ServiceAddonDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    if (await db.ServiceAddons.AnyAsync(a => a.Name == dto.Name)) return Results.Conflict(new { error = "AddonExists" });
    var a = new ServiceAddon { Name = dto.Name.Trim(), Price = dto.Price, IsHairCompatible = dto.IsHairCompatible, IsBeardCompatible = dto.IsBeardCompatible, ExtraMinutes = dto.ExtraMinutes };
    db.ServiceAddons.Add(a);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/addons/{a.Id}", a);
});

admin.MapPut("/addons/{id}", async (int id, ServiceAddonDto dto, AppDbContext db) =>
{
    var bad = ValidateDto(dto);
    if (bad != null) return bad;
    var e = await db.ServiceAddons.FindAsync(id);
    if (e == null) return Results.NotFound();
    if (await db.ServiceAddons.AnyAsync(a => a.Name == dto.Name && a.Id != id)) return Results.Conflict(new { error = "AddonNameTaken" });
    e.Name = dto.Name.Trim();
    e.Price = dto.Price;
    e.IsHairCompatible = dto.IsHairCompatible;
    e.IsBeardCompatible = dto.IsBeardCompatible;
    e.ExtraMinutes = dto.ExtraMinutes;
    await db.SaveChangesAsync();
    return Results.Ok(e);
});

admin.MapDelete("/addons/{id}", async (int id, AppDbContext db) =>
{
    var e = await db.ServiceAddons.FindAsync(id);
    if (e == null) return Results.NotFound();
    db.ServiceAddons.Remove(e);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ---------------- Admin Appointments ---------------- */
admin.MapGet("/appointments", async (AppDbContext db, int page = 1, int pageSize = 20, string? status = null, string? phone = null, string? date = null) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    var q = db.Appointments.Include(a => a.Addons).ThenInclude(aa => aa.ServiceAddon).AsQueryable();

    // Date filter
    if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
    {
        var dayStart = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
        var dayEnd   = dayStart.AddDays(1);
        q = q.Where(a => a.Start >= dayStart && a.Start < dayEnd);
    }

    // Status filter
    if (!string.IsNullOrWhiteSpace(status))
        q = q.Where(a => a.Status == status);

    // Phone filter — join with Customers
    if (!string.IsNullOrWhiteSpace(phone))
    {
        var normalizedPhone = new string(phone.Where(char.IsDigit).ToArray());
        if (!string.IsNullOrEmpty(normalizedPhone))
        {
            var matchingCustomerIds = await db.Customers
                .Where(c => c.Phone.Replace("(","").Replace(")","").Replace("-","").Replace(" ","") == normalizedPhone
                         || c.Phone.Contains(normalizedPhone))
                .Select(c => c.Id)
                .ToListAsync();
            q = q.Where(a => matchingCustomerIds.Contains(a.CustomerId));
        }
    }

    var total  = await q.CountAsync();
    var appts  = await q.OrderByDescending(a => a.Start).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

    var barbers       = await db.Barbers.ToDictionaryAsync(b => b.Id, b => b.Name);
    var servicesData  = await db.Services.ToDictionaryAsync(s => s.Id, s => new { s.Name, s.Price });
    var customersData = await db.Customers.ToDictionaryAsync(c => c.Id, c => new { c.Name, c.Phone });

    var items = appts.Select(a => new {
        a.Id,
        a.BarberId,
        BarberName    = barbers.GetValueOrDefault(a.BarberId),
        a.ServiceId,
        ServiceName   = servicesData.GetValueOrDefault(a.ServiceId)?.Name,
        a.CustomerId,
        CustomerName  = customersData.GetValueOrDefault(a.CustomerId)?.Name,
        CustomerPhone = customersData.GetValueOrDefault(a.CustomerId)?.Phone,
        Start = DateTime.SpecifyKind(a.Start, DateTimeKind.Utc),
        End   = DateTime.SpecifyKind(a.End,   DateTimeKind.Utc),
        a.Status,
        TotalPrice = (servicesData.GetValueOrDefault(a.ServiceId)?.Price ?? 0) + a.Addons.Sum(aa => aa.ServiceAddon.Price),
        Addons = a.Addons.Select(aa => new { aa.ServiceAddonId, aa.ServiceAddon.Name, aa.ServiceAddon.Price }).ToList()
    });

    return Results.Ok(new {
        items,
        total,
        page,
        pageSize,
        totalPages = (int)Math.Ceiling((double)total / pageSize)
    });
});

admin.MapPatch("/appointments/{id}/status", async (int id, StatusDto dto, AppDbContext db, IHttpClientFactory httpFactory) =>
{
    var allowed = new[] { "Pending", "Confirmed", "Cancelled", "Done" };
    if (!allowed.Contains(dto.Status)) return Results.BadRequest("Status inválido.");
    var appt = await db.Appointments.FindAsync(id);
    if (appt == null) return Results.NotFound();
    appt.Status = dto.Status;
    await db.SaveChangesAsync();

    // Envia WhatsApp para o cliente quando o status for alterado pelo admin
    if (dto.Status == "Confirmed" || dto.Status == "Cancelled" || dto.Status == "Done")
    {
        var settings = await db.AppSettings.ToListAsync();
        string GetS(string key) => settings.FirstOrDefault(s => s.Key == key)?.Value ?? "";
        var waToken    = Environment.GetEnvironmentVariable("WHATSAPP_API_TOKEN") ?? GetS("whatsapp_api_token");
        var waInstance = Environment.GetEnvironmentVariable("WHATSAPP_INSTANCE") ?? GetS("whatsapp_instance");
        if (!string.IsNullOrWhiteSpace(waToken) && !string.IsNullOrWhiteSpace(waInstance))
        {
            var customer = await db.Customers.FindAsync(appt.CustomerId);
            var service  = await db.Services.FindAsync(appt.ServiceId);
            if (customer != null)
            {
                var localTime = appt.Start.ToLocalTime();
                string msg = "";
                if (dto.Status == "Confirmed")
                {
                    msg = $"Olá {customer.Name}! 👋\n"
                        + $"✅ Seu pagamento foi recebido e seu agendamento na *Barbearia Espaço Vip* está *confirmado*!\n\n"
                        + $"✂️ Serviço: {service?.Name ?? "serviço"}\n"
                        + $"🕐 Horário: {localTime:HH:mm} – {localTime:dd/MM/yyyy}\n\n"
                        + "Te esperamos! Em caso de dúvidas ou cancelamento, entre em contato com a barbearia.";
                }
                else if (dto.Status == "Cancelled")
                {
                    msg = $"Olá {customer.Name}! 👋\n"
                        + $"❌ Seu agendamento na *Barbearia Espaço Vip* foi *cancelado* pelo administrador.\n\n"
                        + $"✂️ Serviço: {service?.Name ?? "serviço"}\n"
                        + $"🕐 Horário: {localTime:HH:mm} – {localTime:dd/MM/yyyy}\n\n"
                        + "Se tiver dúvidas, entre em contato com a barbearia.";
                }
                else if (dto.Status == "Done")
                {
                    msg = $"Olá {customer.Name}! 👋\n"
                        + $"✅ Seu atendimento na *Barbearia Espaço Vip* foi *concluído*!\n\n"
                        + $"✂️ Serviço: {service?.Name ?? "serviço"}\n"
                        + $"🕐 Horário: {localTime:HH:mm} – {localTime:dd/MM/yyyy}\n\n"
                        + "Agradecemos pela preferência! Se quiser, deixe sua avaliação.";
                }
                var waHttp = httpFactory.CreateClient("whatsapp");
                _ = WhatsAppSender.SendAsync(waHttp, waToken, waInstance, customer.Phone, msg);
            }
        }
    }

    return Results.Ok(new { appt.Id, appt.Status });
});

/* ---------------- Settings ---------------- */
admin.MapGet("/settings", async (AppDbContext db) =>
{
    var settings = await db.AppSettings.ToListAsync();
    string Get(string key) => settings.FirstOrDefault(s => s.Key == key)?.Value ?? "";
    return Results.Ok(new {
        PixKey                = Get("pix_key"),
        PixBeneficiario       = Get("pix_beneficiario"),
        ReminderHoursBefore   = int.TryParse(Get("reminder_hours_before"), out var h) ? h : 2,
        WhatsappApiUrl        = Get("whatsapp_api_url"),
        WhatsappApiToken      = (string.IsNullOrEmpty(Get("whatsapp_api_token")) && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WHATSAPP_API_TOKEN"))) ? "" : "***",
        WhatsappInstance      = Get("whatsapp_instance"),
        MinBookingAdvanceHours = int.TryParse(Get("min_booking_advance_hours"), out var adv) ? adv : 24,
    });
});

admin.MapPut("/settings", async (SettingsDto dto, AppDbContext db) =>
{
    async Task Set(string key, string value)
    {
        var s = await db.AppSettings.FirstOrDefaultAsync(x => x.Key == key);
        if (s == null) db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else s.Value = value;
    }
    await Set("pix_key",               dto.PixKey ?? "");
    await Set("pix_beneficiario",      dto.PixBeneficiario ?? "");
    await Set("reminder_hours_before", (dto.ReminderHoursBefore ?? 2).ToString());
    await Set("whatsapp_api_url",      dto.WhatsappApiUrl ?? "");
    if (dto.WhatsappApiToken is not (null or "***")) await Set("whatsapp_api_token", dto.WhatsappApiToken);
    if (dto.WhatsappInstance is not null) await Set("whatsapp_instance", dto.WhatsappInstance ?? "");
    await Set("min_booking_advance_hours", (dto.MinBookingAdvanceHours ?? 24).ToString());
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ---------------- User Management ---------------- */
admin.MapGet("/users", async (AppDbContext db) =>
{
    var users = await db.AdminUsers
        .Select(u => new { u.Id, u.Username })
        .ToListAsync();
    return Results.Ok(users);
});

admin.MapPost("/users", async (CreateUserDto dto, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
        return Results.BadRequest("Username e senha s\u00e3o obrigat\u00f3rios.");
    if (!PasswordHasher.IsStrong(dto.Password, out var pwErr))
        return Results.BadRequest(pwErr);
    var exists = await db.AdminUsers.AnyAsync(u => u.Username == dto.Username);
    if (exists) return Results.Conflict("Usu\u00e1rio j\u00e1 existe.");
    var user = new AdminUser { Username = dto.Username.Trim(), PasswordHash = PasswordHasher.Hash(dto.Password), Role = "Admin" };
    db.AdminUsers.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/admin/users/{user.Id}", new { user.Id, user.Username });
});

admin.MapPut("/users/{id}/password", async (int id, ChangePasswordDto dto, AppDbContext db, HttpContext ctx) =>
{
    if (string.IsNullOrWhiteSpace(dto.NewPassword)) return Results.BadRequest("Nova senha obrigat\u00f3ria.");
    if (!PasswordHasher.IsStrong(dto.NewPassword, out var pwErr2)) return Results.BadRequest(pwErr2);
    var requestingUsername = ctx.User.Identity?.Name ?? "";
    var user = await db.AdminUsers.FindAsync(id);
    if (user == null) return Results.NotFound();
    // Cannot change another user's password unless you are that user
    // (simple self-service; admin can change own password only, unless it's the only user)
    var totalUsers = await db.AdminUsers.CountAsync();
    var isSelf = user.Username == requestingUsername;
    if (!isSelf && totalUsers > 1)
        return Results.Forbid();
    user.PasswordHash = PasswordHasher.Hash(dto.NewPassword);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

admin.MapDelete("/users/{id}", async (int id, AppDbContext db, HttpContext ctx) =>
{
    var user = await db.AdminUsers.FindAsync(id);
    if (user == null) return Results.NotFound();
    // Prevent deleting the last user
    var count = await db.AdminUsers.CountAsync();
    if (count <= 1) return Results.BadRequest("N\u00e3o \u00e9 poss\u00edvel remover o \u00fanico usu\u00e1rio do sistema.");
    // Prevent self-deletion
    var requestingUsername = ctx.User.Identity?.Name ?? "";
    if (user.Username == requestingUsername) return Results.BadRequest("Voc\u00ea n\u00e3o pode remover o pr\u00f3prio usu\u00e1rio.");
    db.AdminUsers.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

public class Barber { public int Id { get; set; } [Required][StringLength(100)] public string Name { get; set; } = string.Empty; public bool IsActive { get; set; } = true; }
public class Service { public int Id { get; set; } public string Name { get; set; } = string.Empty; public int Duration { get; set; } public decimal Price { get; set; } public string Category { get; set; } = "both"; }
public class ServiceAddon { public int Id { get; set; } public string Name { get; set; } = string.Empty; public decimal Price { get; set; } public bool IsHairCompatible { get; set; } = true; public bool IsBeardCompatible { get; set; } = true; public int ExtraMinutes { get; set; } = 0; }
public class AppointmentAddon { public int AppointmentId { get; set; } public int ServiceAddonId { get; set; } public ServiceAddon ServiceAddon { get; set; } = null!; }

public class ServiceDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(1, 600)]
    public int Duration { get; set; } = 30;

    [Range(0, 100000)]
    public decimal Price { get; set; } = 0m;

    [StringLength(10)]
    public string Category { get; set; } = "both";
}

public class ServiceAddonDto
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(0, 100000)]
    public decimal Price { get; set; } = 0m;

    public bool IsHairCompatible { get; set; } = true;
    public bool IsBeardCompatible { get; set; } = true;
    [Range(0, 120)]
    public int ExtraMinutes { get; set; } = 0;
}

public class Customer { public int Id { get; set; } public string Name { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; public string Phone { get; set; } = string.Empty; }
public class Appointment { public int Id { get; set; } public int BarberId { get; set; } public int ServiceId { get; set; } public int CustomerId { get; set; } public DateTime Start { get; set; } public DateTime End { get; set; } public string Status { get; set; } = string.Empty; public bool ReminderSent { get; set; } = false; public ICollection<AppointmentAddon> Addons { get; set; } = new List<AppointmentAddon>(); }

public class WorkingHour
{
    public int Id { get; set; }
    public int BarberId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan Start { get; set; }
    public TimeSpan End { get; set; }
    public TimeSpan? BreakStart { get; set; }
    public TimeSpan? BreakEnd { get; set; }
    public Barber Barber { get; set; } = null!;
}

public class WorkingHourDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int BarberId { get; set; }

    [Required]
    public DayOfWeek DayOfWeek { get; set; }

    [Required]
    public TimeSpan Start { get; set; }

    [Required]
    public TimeSpan End { get; set; }

    public TimeSpan? BreakStart { get; set; }
    public TimeSpan? BreakEnd { get; set; }
}

public class Holiday
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
    public TimeSpan? WorkStart { get; set; }   // null = dia inteiro fechado
    public TimeSpan? WorkEnd { get; set; }
}

public class HolidayDto
{
    [Required]
    public DateTime Date { get; set; }

    [StringLength(200)]
    public string? Description { get; set; }

    public TimeSpan? WorkStart { get; set; }
    public TimeSpan? WorkEnd { get; set; }
}

public class AppointmentDto
{
    [Required(ErrorMessage = "BarberId é obrigatório.")]
    [Range(1, int.MaxValue, ErrorMessage = "BarberId inválido.")]
    public int BarberId { get; set; }

    [Required(ErrorMessage = "ServiceId é obrigatório.")]
    [Range(1, int.MaxValue, ErrorMessage = "ServiceId inválido.")]
    public int ServiceId { get; set; }

    [Required(ErrorMessage = "Nome do cliente é obrigatório.")]
    [StringLength(100, ErrorMessage = "Nome muito longo (máx. 100 caracteres).")]
    public string CustomerName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email é obrigatório.")]
    [EmailAddress(ErrorMessage = "Email inválido.")]
    public string CustomerEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "Telefone é obrigatório.")]
    [Phone(ErrorMessage = "Telefone inválido.")]
    public string CustomerPhone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data/hora de início é obrigatória.")]
    public DateTime Start { get; set; }

    public List<int> AddonIds { get; set; } = new();
}

public class AdminUser
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Admin";
}

public class LoginDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class CreateUserDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
}

public class StatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public class SettingsDto
{
    public string? PixKey              { get; set; }
    public string? PixBeneficiario     { get; set; }
    public int?    ReminderHoursBefore { get; set; }
    public string? WhatsappApiUrl      { get; set; }
    public string? WhatsappApiToken    { get; set; }
    public string? WhatsappInstance    { get; set; }
    public int?    MinBookingAdvanceHours { get; set; }
}

public class AppSetting
{
    public int    Id    { get; set; }
    public string Key   { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public static class PasswordHasher
{
    public static bool IsStrong(string password, out string error)
    {
        if (password.Length < 8)              { error = "A senha deve ter no mínimo 8 caracteres."; return false; }
        if (!password.Any(char.IsUpper))      { error = "A senha deve conter ao menos 1 letra maiúscula."; return false; }
        if (!password.Any(char.IsDigit) && !password.Any(c => !char.IsLetterOrDigit(c)))
                                              { error = "A senha deve conter ao menos 1 número ou símbolo."; return false; }
        error = string.Empty; return true;
    }
    public static string Hash(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        byte[] salt = new byte[16];
        rng.GetBytes(salt);
        // Use the static Pbkdf2 API (non-obsolete)
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        var salted = new byte[48];
        Array.Copy(salt, 0, salted, 0, 16);
        Array.Copy(hash, 0, salted, 16, 32);
        return Convert.ToBase64String(salted);
    }

    public static bool Verify(string password, string stored)
    {
        var salted = Convert.FromBase64String(stored);
        var salt = new byte[16];
        Array.Copy(salted, 0, salt, 0, 16);
        var hash = new byte[32];
        Array.Copy(salted, 16, hash, 0, 32);
        var testHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(hash, testHash);
    }
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Barber> Barbers { get; set; } = null!;
    public DbSet<Service> Services { get; set; } = null!;
    public DbSet<ServiceAddon> ServiceAddons { get; set; } = null!;
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Appointment> Appointments { get; set; } = null!;
    public DbSet<AppointmentAddon> AppointmentAddons { get; set; } = null!;
    public DbSet<WorkingHour> WorkingHours { get; set; } = null!;
    public DbSet<Holiday> Holidays { get; set; } = null!;
    public DbSet<AdminUser> AdminUsers { get; set; } = null!;
    public DbSet<AppSetting> AppSettings { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Appointment>()
            .HasIndex(a => new { a.BarberId, a.Start })
            .IsUnique()
            .HasFilter("\"Status\" NOT IN ('Cancelled', 'Done')");

        modelBuilder.Entity<AppointmentAddon>()
            .HasKey(aa => new { aa.AppointmentId, aa.ServiceAddonId });

        modelBuilder.Entity<WorkingHour>()
            .HasIndex(w => new { w.BarberId, w.DayOfWeek });

        modelBuilder.Entity<AdminUser>()
            .HasIndex(u => u.Username)
            .IsUnique();
    }
}

public static class WhatsAppSender
{
    public static async Task SendAsync(HttpClient http, string apiToken, string instance, string phone, string text)
    {
        var number = new string(phone.Where(char.IsDigit).ToArray());
        if (!number.StartsWith("55")) number = "55" + number;
        var url = $"https://api.ultramsg.com/{instance}/messages/chat";
        var formData = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("token",    apiToken),
            new KeyValuePair<string, string>("to",       number),
            new KeyValuePair<string, string>("body",     text),
            new KeyValuePair<string, string>("priority", "1"),
        });
        var response = await http.PostAsync(url, formData);
        response.EnsureSuccessStatusCode();
    }
}

public class WhatsAppReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WhatsAppReminderService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public WhatsAppReminderService(IServiceScopeFactory scopeFactory, ILogger<WhatsAppReminderService> logger, IHttpClientFactory httpClientFactory)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await CheckAndSendReminders(); }
            catch (Exception ex) { _logger.LogError(ex, "WhatsApp reminder job failed"); }
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }

    private async Task CheckAndSendReminders()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var settings = await db.AppSettings.ToListAsync();
        string Get(string key) => settings.FirstOrDefault(s => s.Key == key)?.Value ?? "";

        var apiToken = Environment.GetEnvironmentVariable("WHATSAPP_API_TOKEN") ?? Get("whatsapp_api_token");
        var instance = Environment.GetEnvironmentVariable("WHATSAPP_INSTANCE") ?? Get("whatsapp_instance");
        if (string.IsNullOrWhiteSpace(apiToken) || string.IsNullOrWhiteSpace(instance)) return;

        int hoursBefore = int.TryParse(Get("reminder_hours_before"), out var h) ? h : 2;

        var now         = DateTime.UtcNow;
        var windowStart = now.AddHours(hoursBefore);
        var windowEnd   = windowStart.AddMinutes(15);

        var appts = await db.Appointments
            .Include(a => a.Addons).ThenInclude(aa => aa.ServiceAddon)
            .Where(a => a.Status == "Confirmed" && !a.ReminderSent
                     && a.Start >= windowStart && a.Start < windowEnd)
            .ToListAsync();

        if (!appts.Any()) return;

        var customerIds  = appts.Select(a => a.CustomerId).ToList();
        var customersMap = await db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id);
        var servicesMap  = await db.Services.ToDictionaryAsync(s => s.Id, s => s.Name);

        var http = _httpClientFactory.CreateClient("whatsapp");
        bool anyUpdated = false;
        foreach (var appt in appts)
        {
            if (!customersMap.TryGetValue(appt.CustomerId, out var customer)) continue;
            var serviceName = servicesMap.GetValueOrDefault(appt.ServiceId) ?? "servi\u00e7o";
            var localTime   = appt.Start.ToLocalTime();
            var frontendUrl = Environment.GetEnvironmentVariable("ALLOWED_ORIGIN") ?? "http://localhost:5173";
            var portalLink  = $"{frontendUrl}/meu-agendamento?id={appt.Id}&phone={Uri.EscapeDataString(customer.Phone)}";
            var msg = $"Ol\u00e1 {customer.Name}! \ud83d\udc4b\n"
                    + $"Lembrando do seu agendamento na *Barbearia Espa\u00e7o Vip* daqui a {hoursBefore}h.\n\n"
                    + $"\u2702\ufe0f Servi\u00e7o: {serviceName}\n"
                    + $"\ud83d\udd50 Hor\u00e1rio: {localTime:HH:mm} \u2013 {localTime:dd/MM/yyyy}\n\n"
                    + $"\ud83d\udd17 Consulte ou cancele seu agendamento: {portalLink}\n\n"
                    + "Em caso de d\u00favidas, entre em contato com a barbearia.";
            try
            {
                await WhatsAppSender.SendAsync(http, apiToken, instance, customer.Phone, msg);
                appt.ReminderSent = true;
                anyUpdated = true;
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to send reminder for appointment {Id}", appt.Id); }
        }

        if (anyUpdated) await db.SaveChangesAsync();
    }
}