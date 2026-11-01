using System;

namespace FreeToolsBlog.Api.Dtos;

public record TagDto
(
    int Id,
    string Name,
    string Slug
);
