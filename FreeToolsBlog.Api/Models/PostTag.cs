using System.Formats.Asn1;

namespace FreeToolsBlog.Api.Models;

public class PostTag
{
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    
    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
