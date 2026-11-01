
using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace FreeToolsBlog.Api.Endpoints;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/posts");

        // GET /posts
        group.MapGet("/", async (AppDbContext dbContext) => await dbContext.Posts
                                                                            .Include(post => post.Category)
                                                                            .Include(post => post.User)
                                                                            .Include(post => post.PostTags)
                                                                                .ThenInclude(postTag => postTag.Tag)
                                                                            .Select(post => new PostSummaryDto(
                                                                                post.Id,
                                                                                post.Title,
                                                                                post.Slug,
                                                                                post.Summary,
                                                                                post.Content,
                                                                                post.CoverImageUrl,
                                                                                post.CreatedAt,
                                                                                post.UpdatedAt,
                                                                                post.Category.Name,
                                                                                post.User.Username,
                                                                                post.PostTags.Select(pt => pt.Tag.Name).ToList()
                                                                            ))
                                                                            .AsNoTracking()
                                                                            .ToListAsync());

        // GET /posts/{slug}
        // POST /admin/posts
        // PUT /admin/posts/{id}
        // DELETE /admin/posts/{id}
    }
}
