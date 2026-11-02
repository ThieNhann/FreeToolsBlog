using System.ComponentModel.DataAnnotations;

namespace FreeToolsBlog.Api.Dtos;

public record TagDto
(
    [property: Range(1, int.MaxValue, ErrorMessage = "ID must be greater than 0.")]
    int Id,
    [property: Required(ErrorMessage = "Name is required.")]
    [property: StringLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
    string Name,
    [property: Required(ErrorMessage = "Slug is required.")]
    [property: StringLength(200, ErrorMessage = "Slug cannot exceed 200 characters.")]
    string Slug
);
