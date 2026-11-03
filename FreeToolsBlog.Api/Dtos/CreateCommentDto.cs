using System.ComponentModel.DataAnnotations;

namespace FreeToolsBlog.Api.Dtos;

public record CreateCommentDto(
    [property: Required(ErrorMessage = "Name is required.")]
    [property: StringLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
    string Name,
    [property: Required(ErrorMessage = "Content is required.")]
    string Content
);
