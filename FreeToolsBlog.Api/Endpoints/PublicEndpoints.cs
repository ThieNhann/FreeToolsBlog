using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Dtos;
using FreeToolsBlog.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.RateLimiting;

namespace FreeToolsBlog.Api.Endpoints;

public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/posts");

        // GET /posts
        // group.MapGet("/", async (AppDbContext dbContext) => await dbContext.Posts
        //                                                                     .Select(post => new PostSummaryDto(
        //                                                                         post.Id,
        //                                                                         post.Title,
        //                                                                         post.Slug,
        //                                                                         post.Summary,
        //                                                                         post.Content,
        //                                                                         post.CoverImageUrl,
        //                                                                         post.CreatedAt,
        //                                                                         post.UpdatedAt,
        //                                                                         post.User.Username,
        //                                                                         post.Comments
        //                                                                             .OrderBy(comment => comment.CreatedAt)
        //                                                                             .Select(comment => new CommentDto(comment.Name, comment.Content, comment.CreatedAt))
        //                                                                             .ToList()
        //                                                                     ))
        //                                                                     .AsNoTracking()
        //                                                                     .ToListAsync());

        // GET /posts?pageNumber={x}&pageSize={y}
        group.MapGet("/", async (
            [AsParametersAttribute] PaginationParams validFilter,
            AppDbContext dbContext,
            string? search = null) =>
        {
            var posts = dbContext.Posts.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();
                if (search.Length > 100)
                {
                    return Results.BadRequest(new { message = "Search text cannot exceed 100 characters." });
                }

                var escapedSearch = search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
                var pattern = $"%{escapedSearch}%";
                posts = posts.Where(post => post.IsPublished &&
                    (EF.Functions.Like(post.Title, pattern, "\\") ||
                     EF.Functions.Like(post.Summary, pattern, "\\")));
            }

            var skip = (validFilter.PageNumber - 1) * validFilter.PageSize;
            var totalRecords = await posts.CountAsync();

            var data = await (string.IsNullOrWhiteSpace(search)
                ? posts.OrderBy(post => post.Id)
                : posts.OrderByDescending(post => post.Id))
                .Where(post => post.IsPublished == true)
                .Skip(skip)
                .Take(validFilter.PageSize)
                .ToListAsync();

            var response = new PagedResponse<Post>(data, validFilter.PageNumber, validFilter.PageSize, totalRecords);
            return Results.Ok(response);
        }).RequireRateLimiting("public-read");

        // GET /posts/{slug}
        group.MapGet("/{slug}", async (string slug, AppDbContext dbContext, IMemoryCache cache, HttpContext httpContext) =>
        {
            var post = await dbContext.Posts
                                        .Where(post => post.Slug == slug)
                                        .Include(post => post.User)
                                        .Include(post => post.Comments)
                                        .FirstOrDefaultAsync();

            if (post is null || post.IsPublished == false)
            {
                return Results.NotFound();
            }

            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            string cacheKey = $"view-post-{post.Id}-{clientIp}";

            if (!cache.TryGetValue(cacheKey, out _))
            {
                post.ViewCount++;
                await dbContext.SaveChangesAsync();
                cache.Set(cacheKey, true, TimeSpan.FromMinutes(30));
            }

            var response = new PostSummaryDto(
                post.Id,
                post.Title,
                post.Slug,
                post.Summary,
                post.Content,
                post.CoverImageUrl,
                post.CreatedAt,
                post.UpdatedAt,
                post.User.Username,
                post.Comments
                    .OrderBy(comment => comment.CreatedAt)
                    .Select(comment => new CommentDto(comment.Name, comment.Content, comment.CreatedAt))
                    .ToList(),
                post.ViewCount
            );

            return Results.Ok(response);
        }).RequireRateLimiting("public-read");

        // GET /posts/
        group.MapGet("/{postId:int}/comments/", async (
            int postId,
            [AsParametersAttribute] PaginationParams validFilter,
            AppDbContext dbContext) =>
        {
            var existing = await dbContext.Posts.AnyAsync();
            if (existing == false) return Results.NotFound();

            var comments = dbContext.Comments
                                                    .AsNoTracking()
                                                    .Where(c => c.PostId == postId);

            var totalRecords = await comments.CountAsync();

            var skip = (validFilter.PageNumber - 1) * validFilter.PageSize;

            var data = await comments
                                .OrderBy(c => c.CreatedAt)
                                .Skip(skip)
                                .Take(validFilter.PageSize)
                                .ToListAsync();

            var response = new PagedResponse<Comment>(data, validFilter.PageNumber, validFilter.PageSize, totalRecords);
            return Results.Ok(response);
        }).RequireRateLimiting("public-read");

        // POST /posts/{postId}/comments
        group.MapPost("/{postId:int}/comments", async (int postId, CreateCommentDto newComment, AppDbContext dbContext) =>
        {
            var post = await dbContext.Posts.FindAsync(postId);
            if (post is null || post.IsPublished == false)
            {
                return Results.NotFound();
            }

            var comment = new Comment
            {
                Name = newComment.Name,
                Content = newComment.Content,
                PostId = postId,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Comments.Add(comment);
            await dbContext.SaveChangesAsync();

            return Results.Created($"/posts/{post.Slug}", new CommentDto(comment.Name, comment.Content, comment.CreatedAt));
        }).RequireRateLimiting("comment-write");
    }
}
