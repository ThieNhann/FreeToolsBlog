using System;

namespace FreeToolsBlog.Api.Dtos;

public record EditPostDto
(
    string Title,
    string Slug,
    string Summary,
    string Content,
    bool IsPublished,
    string CoverImageUrl,
    int CategoryId,
    List<int> TagIds
);
