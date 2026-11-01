using FreeToolsBlog.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FreeToolsBlog.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostTag> PostTags => Set<PostTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<PostTag>()
            .HasKey(pt => new { pt.PostId, pt.TagId });

        modelBuilder.Entity<PostTag>()
            .HasOne(pt => pt.Post)
            .WithMany(p => p.PostTags)
            .HasForeignKey(pt => pt.PostId);

        modelBuilder.Entity<PostTag>()
            .HasOne(pt => pt.Tag)
            .WithMany(t => t.PostTags)
            .HasForeignKey(pt => pt.TagId);


        modelBuilder.Entity<Post>().HasIndex(p => p.Slug).IsUnique();
        modelBuilder.Entity<Category>().HasIndex(c => c.Slug).IsUnique();
        modelBuilder.Entity<Tag>().HasIndex(t => t.Slug).IsUnique();
    }
}
