namespace AccessMapVN.WebApi.Authorization;

public sealed class SupabaseAuthOptions
{
    public const string SectionName = "Supabase";

    public string Url { get; set; } = string.Empty;
    public string Audience { get; set; } = "authenticated";
    public string? JwtSecret { get; set; }
}
