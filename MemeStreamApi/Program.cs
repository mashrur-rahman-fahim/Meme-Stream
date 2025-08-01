using MemeStreamApi.data;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
Env.Load();
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
builder.Services.AddDbContext<MemeStreamDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("MemeStreamDb")));

var app = builder.Build();

app.MapControllers();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
}

// app.UseHttpsRedirection();



app.Run();

