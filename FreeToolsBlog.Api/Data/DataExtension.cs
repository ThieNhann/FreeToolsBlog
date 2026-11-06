using FreeToolsBlog.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FreeToolsBlog.Api.Data;

public static class DataExtension
{
    public static void MigrateDb(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.Database.Migrate();
    }

    public static void AddAppDb(this WebApplicationBuilder builder)
    {
        var connString = builder.Configuration.GetConnectionString("ToolsBlog");
        var adminUsername = builder.Configuration["Admin:Username"];
        var adminPassword = builder.Configuration["Admin:Password"];
        if (string.IsNullOrWhiteSpace(adminUsername) != string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException("Configure both Admin:Username and Admin:Password to bootstrap an admin account.");
        }

        builder.Services.AddSqlite<AppDbContext>(
            connString,
            optionsAction: options => options.UseSeeding((context, _) =>
            {
                if (!context.Set<User>().Any())
                {
                    var admin = new User
                    {
                        Username = "admin",
                        Email = "admin@freetoolsblog.local"
                    };
                    var posts = new[]
                    {
                        new Post
                        {
                            Title = "5 Free Online Tools Worth Trying",
                            Slug = "5-free-online-tools-worth-trying",
                            Summary = "A handful of free web tools that make everyday tasks faster.",
                            Content = "Explore useful online tools for work and learning.",
                            IsPublished = true,
                            User = admin
                        },
                        new Post
                        {
                            Title = "How to Optimize Images Before Publishing on Your Website",
                            Slug = "how-to-optimize-images-before-publishing",
                            Summary = "Reduce image file sizes so your website loads quickly without sacrificing quality.",
                            Content = "Choose the right format, resize images, and compress them before uploading.",
                            IsPublished = true,
                            User = admin
                        },
                        new Post
                        {
                            Title = "Tips for Managing Your Work More Effectively",
                            Slug = "tips-for-managing-your-work-more-effectively",
                            Summary = "Simple ways to organize tasks and stay focused.",
                            Content = "Break tasks into smaller steps, prioritize important work, and schedule regular breaks.",
                            User = admin
                        }
                    };

                    context.Add(admin);
                    context.AddRange(posts);
                    context.SaveChanges();
                }

                if (!context.Set<Comment>().Any())
                {
                    var posts = context.Set<Post>().OrderBy(post => post.Id).Take(3).ToList();
                    if (posts.Count > 0)
                    {
                        context.AddRange(
                            new Comment { Name = "Alex", Content = "This was really helpful. Thank you!", Post = posts[0] },
                            new Comment { Name = "Jordan", Content = "I'll give these tools a try.", Post = posts[0] },
                            new Comment { Name = "Taylor", Content = "An easy-to-follow and practical guide.", Post = posts[^1] }
                        );
                        context.SaveChanges();
                    }
                }

                if (!string.IsNullOrWhiteSpace(adminUsername))
                {
                    var admin = context.Set<User>().SingleOrDefault(user => user.Username == adminUsername);
                    if (admin is null)
                    {
                        admin = new User
                        {
                            Username = adminUsername,
                            Email = $"{adminUsername}@freetoolsblog.local",
                            IsAdmin = true
                        };
                        admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, adminPassword!);
                        context.Add(admin);
                    }
                    else
                    {
                        admin.IsAdmin = true;
                        if (string.IsNullOrEmpty(admin.PasswordHash))
                        {
                            admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, adminPassword!);
                        }
                    }

                    context.SaveChanges();
                }
            })
        );
    }
}
