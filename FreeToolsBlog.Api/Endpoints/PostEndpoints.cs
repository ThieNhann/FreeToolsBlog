
using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Dtos;
using FreeToolsBlog.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FreeToolsBlog.Api.Endpoints;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/posts");

        // GET /posts
        group.MapGet("/", async (AppDbContext dbContext) => await dbContext.Posts
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
                                            post.Category.Name,
                                            post.User.Username,
                                            post.PostTags.Select(pt => pt.Tag.Name).ToList()
                                        ))
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync();
    
            return post is null ? Results.NotFound() : Results.Ok(post);
        });

        // POST /admin/posts
        group.MapPost("/", async (CreatePostDto newPost, AppDbContext dbContext) =>
        {
            if (await dbContext.Posts.AnyAsync(post => post.Slug == newPost.Slug))
            {
                return Results.Conflict(new { message = $"A post with slug '{newPost.Slug}' already exists." });
            }

            Post post = new () 
            {
                Title = newPost.Title,
                Slug = newPost.Slug,
                Summary = newPost.Summary,
                Content = newPost.Content,
                IsPublished = false,
                CoverImageUrl = newPost.CoverImageUrl,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CategoryId = newPost.CategoryId,
                UserId = newPost.UserId,
            };

            if (newPost.TagIds != null && newPost.TagIds.Any())
            {
                post.PostTags = newPost.TagIds
                                            .Select(tagId => new PostTag
                                            {
                                                TagId = tagId
                                            })
                                            .ToList();
            }

            dbContext.Posts.Add(post);
            await dbContext.SaveChangesAsync();

            return Results.Created($"/posts/{post.Slug}", new { post.Id, post.Slug });
        });

        // PUT /admin/posts/{id}
        group.MapPut("/{id}", async (int id, EditPostDto newPost, AppDbContext dbContext) =>
        {

            if (await dbContext.Posts.AnyAsync(post => post.Slug == newPost.Slug))
            {
                return Results.Conflict(new { message = $"A post with slug '{newPost.Slug}' already exists." });
            }
            var post = await dbContext.Posts.FindAsync(id);

            if (post is null) return Results.NotFound();

            post.Title = newPost.Title;
            post.Slug = newPost.Slug;
            post.Summary = newPost.Summary;
            post.Content = newPost.Content;
            post.IsPublished = newPost.IsPublished;
            post.CoverImageUrl = newPost.CoverImageUrl;
            post.UpdatedAt = DateTime.UtcNow;
            post.CategoryId = newPost.CategoryId;

            await dbContext.SaveChangesAsync();

            return Results.Ok();
        });
        // DELETE /admin/posts/{id}
    }
}
