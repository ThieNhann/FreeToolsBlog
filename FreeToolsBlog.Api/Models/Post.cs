namespace FreeToolsBlog.Api.Models;

public class Post
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsPublished { get; set; } = false;
    public string? CoverImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Foreign Key: 1 Category
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    // Foreign Key: 1 User
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Many many with Tag
    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
}
