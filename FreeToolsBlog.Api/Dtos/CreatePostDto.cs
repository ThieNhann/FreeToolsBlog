using System;

namespace FreeToolsBlog.Api.Dtos;

public record CreatePostDto
(
    int Id,
    string Title,
    string Slug,
    string Summary,
    string Content,
    string CoverImageUrl,
    int CategoryId,
    int UserId,
    List<int> TagIds
);
