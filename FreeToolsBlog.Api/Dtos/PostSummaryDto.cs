using System;

namespace FreeToolsBlog.Api.Dtos;

public record PostSummaryDto
(
    int Id,
    string Title,
    string Slug,
    string Summary,
    string Content,
    string CoverImageUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string CategoryName,
    string UserName,
    List<string> Tags
);