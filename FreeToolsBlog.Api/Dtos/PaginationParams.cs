using System;

namespace FreeToolsBlog.Api.Dtos;

public record PaginationParams(int PageNumber = 1, int PageSize = 10)
{
    private const int MaxPageSize = 50;
    public int PageSize {get; init; } = PageSize > MaxPageSize ? MaxPageSize : PageSize;
}

