using FreeToolsBlog.Api.Data;
using FreeToolsBlog.Api.Dtos;
using FreeToolsBlog.Api.Models;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.EntityFrameworkCore;

namespace FreeToolsBlog.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/");

        // login 
        group.MapPost("/login", (LoginRequest login) =>
        {
            
        });
        // GET /admin/posts
        // GET /admin/posts/{id}

        // POST /admin/posts
        group.MapPost("/", async (CreatePostDto newPost, AppDbContext dbContext) =>
        {
            if (await dbContext.Posts.AnyAsync(post => post.Slug == newPost.Slug))
            {
                return Results.Conflict(new { message = $"A post with slug '{newPost.Slug}' already exists." });
            }

            var post = new Post
            {
                Title = newPost.Title,
                Slug = newPost.Slug,
                Summary = newPost.Summary,
                Content = newPost.Content,
                IsPublished = false,
                CoverImageUrl = newPost.CoverImageUrl,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UserId = newPost.UserId,
            };

            dbContext.Posts.Add(post);
            await dbContext.SaveChangesAsync();

            return Results.Created($"/posts/{post.Slug}", new { post.Id, post.Slug });
        });

        // PUT /admin/posts/{id}
        group.MapPut("/{id:int}", async (int id, EditPostDto newPost, AppDbContext dbContext) =>
        {
            var post = await dbContext.Posts.FindAsync(id);
            if (post is null)
            {
                return Results.NotFound();
            }

            if (await dbContext.Posts.AnyAsync(existingPost => existingPost.Id != id && existingPost.Slug == newPost.Slug))
            {
                return Results.Conflict(new { message = $"A post with slug '{newPost.Slug}' already exists." });
            }

            post.Title = newPost.Title;
            post.Slug = newPost.Slug;
            post.Summary = newPost.Summary;
            post.Content = newPost.Content;
            post.IsPublished = newPost.IsPublished;
            post.CoverImageUrl = newPost.CoverImageUrl;
            post.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok();
        });

        // DELETE /admin/posts/{id}
        group.MapDelete("/{id:int}", async (int id, AppDbContext dbContext) =>
        {
            var post = await dbContext.Posts.FindAsync(id);
            if (post is null)
            {
                return Results.NotFound();
            }

            dbContext.Posts.Remove(post);
            await dbContext.SaveChangesAsync();

            return Results.NoContent();
        });
    }
}
