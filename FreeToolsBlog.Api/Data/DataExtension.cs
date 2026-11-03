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
                            Title = "5 công cụ trực tuyến miễn phí nên thử",
                            Slug = "5-cong-cu-truc-tuyen-mien-phi",
                            Summary = "Một số công cụ web miễn phí giúp xử lý công việc hằng ngày nhanh hơn.",
                            Content = "Bài viết giới thiệu các công cụ trực tuyến hữu ích cho công việc và học tập.",
                            IsPublished = true,
                            User = admin
                        },
                        new Post
                        {
                            Title = "Cách tối ưu ảnh trước khi đăng lên website",
                            Slug = "cach-toi-uu-anh-truoc-khi-dang-website",
                            Summary = "Giảm dung lượng ảnh để website tải nhanh mà vẫn giữ chất lượng tốt.",
                            Content = "Hãy chọn đúng định dạng, điều chỉnh kích thước ảnh và nén ảnh trước khi tải lên.",
                            IsPublished = true,
                            User = admin
                        },
                        new Post
                        {
                            Title = "Mẹo quản lý công việc hiệu quả",
                            Slug = "meo-quan-ly-cong-viec-hieu-qua",
                            Summary = "Một vài cách đơn giản để sắp xếp công việc và tập trung tốt hơn.",
                            Content = "Chia nhỏ đầu việc, ưu tiên việc quan trọng và dành thời gian nghỉ hợp lý.",
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
                            new Comment { Name = "Minh Anh", Content = "Bài viết rất hữu ích, cảm ơn bạn!", Post = posts[0] },
                            new Comment { Name = "Hoàng", Content = "Mình sẽ thử các công cụ này.", Post = posts[0] },
                            new Comment { Name = "Lan", Content = "Hướng dẫn dễ hiểu và áp dụng được.", Post = posts[^1] }
                        );
                        context.SaveChanges();
                    }
                }
            })
        );
    }
}
