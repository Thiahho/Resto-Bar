using Back.Data;
using Back.Hubs;
using Back.Middleware;
using Back.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IO.Compression;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<ImageService>();
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddHttpClient<ITelegramService, TelegramService>();

// Configurar límite de tamaño de archivos (10MB)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB
});

// Configurar límite en Kestrel
builder.Services.Configure<Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions>(options =>
{
    options.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10MB
});

builder.Services.AddControllers();

// Compresión de respuestas (gzip + brotli)
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;
    opts.Providers.Add<BrotliCompressionProvider>();
    opts.Providers.Add<GzipCompressionProvider>();
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "image/webp"
    });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(opts =>
    opts.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(opts =>
    opts.Level = CompressionLevel.Fastest);

// Output Cache para endpoints públicos
builder.Services.AddOutputCache(opts =>
{
    opts.AddBasePolicy(b => b.Expire(TimeSpan.FromSeconds(120)));
    opts.AddPolicy("catalog", b => b.Expire(TimeSpan.FromSeconds(120)).Tag("catalog"));
});

// Configurar SignalR con opciones para WebSockets
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true; // Habilitar errores detallados para debugging
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "backend", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter a valid token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key no configurada");
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudiences = new[]
            {
                builder.Configuration["Jwt:Audience"]!,
                "TableOrder"  // Audience para tokens QR de mesa
            },
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/admin-orders"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Política que acepta tokens de admin o de mesa (scope: table_order)
    options.AddPolicy("AdminOrTableOrder", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(ctx =>
        {
            var audience = ctx.User.FindFirst("aud")?.Value;
            var scope = ctx.User.FindFirst("scope")?.Value;
            return audience == builder.Configuration["Jwt:Audience"] || scope == "table_order";
        });
    });
});

// Configurar CORS desde appsettings
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?
    .Split(',')
    .Select(origin => origin.Trim().TrimEnd('/'))
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .ToArray()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfiguredOrigins",
        corsBuilder =>
        {
            corsBuilder.WithOrigins(allowedOrigins)
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        });
});

// Configurar Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    // Política para endpoints de autenticación (más restrictiva)
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 5; // 5 intentos
        opt.Window = TimeSpan.FromMinutes(15); // cada 15 minutos
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0; // No encolar requests
    });

    // Política general para API (menos restrictiva)
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 100; // 100 requests
        opt.Window = TimeSpan.FromMinutes(1); // por minuto
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });

    // Política por defecto - EXCLUIR SignalR
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        // Excluir hubs de SignalR del rate limiting
        if (context.Request.Path.StartsWithSegments("/hubs"))
        {
            return RateLimitPartition.GetNoLimiter<string>("signalr");
        }

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1)
            });
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var app = builder.Build();

// Middleware global de manejo de excepciones (debe ir primero)
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Aplicar migraciones pendientes al iniciar (necesario en Render y otros entornos cloud)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Error aplicando migraciones de base de datos.");
        throw;
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // En producción, agregar HSTS para seguridad HTTPS
    app.UseHsts();
}

// UseHttpsRedirection se omite cuando hay un reverse proxy (Render, etc.) que maneja HTTPS
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseResponseCompression();

app.UseStaticFiles(); // To serve images from wwwroot

app.UseCors("AllowConfiguredOrigins");

// Habilitar WebSockets después de CORS
app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

app.UseRateLimiter(); // Rate limiting debe ir antes de Authentication

app.UseAuthentication();
app.UseAuthorization();
app.UseOutputCache();

app.MapControllers();
app.MapHub<AdminOrdersHub>("/hubs/admin-orders");
app.Run();
