using System.Text;
using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Endpoints;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var jwtSettings = builder.Configuration.GetSection("Jwt");
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

builder.Services.AddValidation();
builder.AddAppDb();
var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MigrateDb();

app.MapPublicEndpoints();
app.MapAdminEndpoints();

app.Run();
