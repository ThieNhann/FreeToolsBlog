using System.ComponentModel.DataAnnotations;

namespace FreeToolsBlog.Api.Dtos;

public record PostSummaryDto
(
    [property: Range(1, int.MaxValue, ErrorMessage = "ID must be greater than 0.")]
    int Id,
    [property: Required(ErrorMessage = "Title is required.")]
    [property: StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
    string Title,
    [property: Required(ErrorMessage = "Slug is required.")]
    [property: StringLength(200, ErrorMessage = "Slug cannot exceed 200 characters.")]
    string Slug,
    [property: Required(ErrorMessage = "Summary is required.")]
    [property: StringLength(500, ErrorMessage = "Summary cannot exceed 500 characters.")]
    string Summary,
    [property: Required(ErrorMessage = "Content is required.")]
    string Content,
    string? CoverImageUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    [property: Required(ErrorMessage = "Category name is required.")]
    string CategoryName,
    [property: Required(ErrorMessage = "User name is required.")]
    string UserName,
    List<string> Tags
);