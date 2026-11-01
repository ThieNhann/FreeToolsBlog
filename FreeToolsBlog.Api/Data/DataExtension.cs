using System;
using FreeToolsBlog.Api.Models;
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
        builder.Services.AddSqlite<AppDbContext>(
            connString,
            optionsAction: options => options.UseSeeding((context, _) =>
            {
                if (context.Set<User>().Any())
                {
                    return;
                }

                var admin = new User
                {
                    Username = "admin",
                    Email = "admin@freetoolsblog.local"
                };
                var toolsCategory = new Category
                {
                    Name = "Công cụ trực tuyến",
                    Slug = "cong-cu-truc-tuyen",
                    Description = "Giới thiệu các công cụ hữu ích miễn phí trên web."
                };
                var tipsCategory = new Category
                {
                    Name = "Mẹo công nghệ",
                    Slug = "meo-cong-nghe",
                    Description = "Thủ thuật giúp làm việc hiệu quả hơn với công nghệ."
                };
                var tags = new[]
                {
                    new Tag { Name = "Miễn phí", Slug = "mien-phi" },
                    new Tag { Name = "Năng suất", Slug = "nang-suat" },
                    new Tag { Name = "Hướng dẫn", Slug = "huong-dan" }
                };

                var posts = new[]
                {
                    new Post
                    {
                        Title = "5 công cụ trực tuyến miễn phí nên thử",
                        Slug = "5-cong-cu-truc-tuyen-mien-phi",
                        Summary = "Một số công cụ web miễn phí giúp xử lý công việc hằng ngày nhanh hơn.",
                        Content = "Bài viết giới thiệu các công cụ trực tuyến hữu ích cho công việc và học tập.",
                        IsPublished = true,
                        Category = toolsCategory,
                        User = admin,
                        PostTags =
                        {
                            new PostTag { Tag = tags[0] },
                            new PostTag { Tag = tags[2] }
                        }
                    },
                    new Post
                    {
                        Title = "Cách tối ưu ảnh trước khi đăng lên website",
                        Slug = "cach-toi-uu-anh-truoc-khi-dang-website",
                        Summary = "Giảm dung lượng ảnh để website tải nhanh mà vẫn giữ chất lượng tốt.",
                        Content = "Hãy chọn đúng định dạng, điều chỉnh kích thước ảnh và nén ảnh trước khi tải lên.",
                        IsPublished = true,
                        Category = toolsCategory,
                        User = admin,
                        PostTags =
                        {
                            new PostTag { Tag = tags[0] },
                            new PostTag { Tag = tags[1] },
                            new PostTag { Tag = tags[2] }
                        }
                    },
                    new Post
                    {
                        Title = "Mẹo quản lý công việc hiệu quả",
                        Slug = "meo-quan-ly-cong-viec-hieu-qua",
                        Summary = "Một vài cách đơn giản để sắp xếp công việc và tập trung tốt hơn.",
                        Content = "Chia nhỏ đầu việc, ưu tiên việc quan trọng và dành thời gian nghỉ hợp lý.",
                        Category = tipsCategory,
                        User = admin,
                        PostTags =
                        {
                            new PostTag { Tag = tags[1] }
                        }
                    }
                };

                context.AddRange(admin, toolsCategory, tipsCategory);
                context.AddRange(tags);
                context.AddRange(posts);
                context.SaveChanges();
            })
        );
    }
}
