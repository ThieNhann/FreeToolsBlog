using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Dtos;
using FreeToolsBlog.Api.Models;
using Microsoft.EntityFrameworkCore;

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
            AppDbContext dbContext) => 
        {
            var skip = (validFilter.PageNumber - 1) * validFilter.PageSize;
            var totalRecords = await dbContext.Posts.CountAsync();

            var data = await dbContext.Posts
                                        .AsNoTracking()
                                        .OrderBy(post => post.Id)
                                        .Skip(skip)
                                        .Take(validFilter.PageSize)
                                        .ToListAsync();

            var response = new PagedResponse<Post>(data, validFilter.PageNumber, validFilter.PageSize, totalRecords);
            return Results.Ok(response);
        });

        // GET /posts/{slug}
        group.MapGet("/{slug}", async (string slug, AppDbContext dbContext) =>
        {
            var post = await dbContext.Posts
                                        .Where(post => post.Slug == slug)
                                        .Select(post => new PostSummaryDto(
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
                                                .ToList()
                                        ))
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync();

            return post is null ? Results.NotFound() : Results.Ok(post);
        });

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
        });

        // POST /posts/{postId}/comments
        group.MapPost("/{postId:int}/comments", async (int postId, CreateCommentDto newComment, AppDbContext dbContext) =>
        {
            var post = await dbContext.Posts.FindAsync(postId);
            if (post is null)
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
        });
    }
}
