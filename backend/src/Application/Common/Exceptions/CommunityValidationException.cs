namespace AccessMapVN.Application.Common.Exceptions;

public class CommunityValidationException : Exception
{
    public CommunityValidationException(string code, string message, int statusCode, object? details = null)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
        Details = details;
    }

    public string Code { get; }
    public int StatusCode { get; }
    public object? Details { get; }
}
