using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddValidation();
builder.AddAppDb();
var app = builder.Build();

app.MigrateDb();

app.MapPostEndpoints();

app.Run();
