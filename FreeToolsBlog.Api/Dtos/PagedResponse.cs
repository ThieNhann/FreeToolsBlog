using System;

namespace FreeToolsBlog.Api.Dtos;

public record PagedResponse<T> (
    IEnumerable<T> Data,
    int PageNumber,
    int PageSize,
    int TotalRecords
)
{
    public int TotalPages { get; } = (int)Math.Ceiling(TotalRecords / (double)PageSize);
}