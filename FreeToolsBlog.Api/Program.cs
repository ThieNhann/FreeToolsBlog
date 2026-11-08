using System.Globalization;
using System.Threading.RateLimiting;
using System.Text;
using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Endpoints;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var jwtSettings = builder.Configuration.GetSection("Jwt");
var frontendAllowedOrigins = builder.Configuration.GetSection("Frontend:AllowedOrigins").Get<string[]>() ?? [];
var configuredSecretKey = jwtSettings["SecretKey"];
if (string.IsNullOrWhiteSpace(configuredSecretKey) || Encoding.UTF8.GetByteCount(configuredSecretKey) < 32)
{
    throw new InvalidOperationException("Jwt:SecretKey must be configured with at least 32 bytes.");
}

var secretKey = Encoding.UTF8.GetBytes(configuredSecretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        RoleClaimType = ClaimTypes.Role,
        ClockSkew = TimeSpan.Zero 
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
{
    if (frontendAllowedOrigins.Length > 0)
    {
        policy.WithOrigins(frontendAllowedOrigins).AllowAnyHeader().AllowAnyMethod();
    }
}));
builder.Services.AddRateLimiter(options =>
{
    options.OnRejected = async (context, cancellationToken) =>
    {
        var response = context.HttpContext.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            response.Headers.RetryAfter = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds))
                .ToString(CultureInfo.InvariantCulture);
        }

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many requests.",
            Detail = "Please wait before trying again.",
            Instance = context.HttpContext.Request.Path
        };
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        await response.WriteAsJsonAsync(
            problem,
            options: null,
            contentType: "application/problem+json",
            cancellationToken: cancellationToken);
    };

    options.AddPolicy("public-read", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown",
            _ => CreateFixedWindowOptions(120, TimeSpan.FromMinutes(1))));
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown",
            _ => CreateFixedWindowOptions(5, TimeSpan.FromMinutes(5))));
    options.AddPolicy("comment-write", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown",
            _ => CreateFixedWindowOptions(3, TimeSpan.FromMinutes(1))));
    options.AddPolicy("admin-write", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.Connection.RemoteIpAddress?.MapToIPv6().ToString()
                ?? "unknown",
            _ => CreateFixedWindowOptions(60, TimeSpan.FromMinutes(1))));
});
builder.Services.AddMemoryCache();
builder.Services.AddValidation();
builder.AddAppDb();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowCloudflarePages", policy =>
    {
        policy.WithOrigins(
                "https://your-app.pages.dev",       // URL mặc định của Cloudflare Pages
                "https://yourcustomdomain.com"     // Tên miền tùy chỉnh (nếu có)
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
}); 

var app = builder.Build();

app.UseCors("AllowCloudflarePages");
app.UseRouting();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MigrateDb();

app.MapPublicEndpoints();
app.MapAdminEndpoints();

app.Run();

static FixedWindowRateLimiterOptions CreateFixedWindowOptions(int permitLimit, TimeSpan window) => new()
{
    PermitLimit = permitLimit,
    Window = window,
    QueueLimit = 0,
    AutoReplenishment = true
};
