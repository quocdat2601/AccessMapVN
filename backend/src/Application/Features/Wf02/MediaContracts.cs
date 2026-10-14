namespace AccessMapVN.Application.Features.Wf02;

public sealed record CreateUploadIntentRequest(string MimeType, long SizeBytes, string Sha256);

public sealed record CreateUploadIntentResponse(
    Guid UploadIntentId,
    Guid OwnedMediaId,
    string UploadUrl,
    IReadOnlyDictionary<string, string> RequiredHeaders,
    DateTimeOffset ExpiresAt);

public sealed record CompleteUploadIntentResponse(
    Guid UploadIntentId,
    Guid OwnedMediaId,
    string Status,
    DateTimeOffset CompletedAt);

public sealed record AdminEvidenceAccessResponse(
    Guid EvidenceId,
    string AccessUrl,
    string ContentType,
    DateTimeOffset ExpiresAt);

public interface IWf02MediaService
{
    Task<CreateUploadIntentResponse> CreateIntentAsync(
        Guid actorId, Guid locationId, string idempotencyKey, CreateUploadIntentRequest request,
        CancellationToken cancellationToken = default);
    Task<CompleteUploadIntentResponse> CompleteIntentAsync(
        Guid actorId, Guid uploadIntentId, string idempotencyKey,
        CancellationToken cancellationToken = default);
    Task<AdminEvidenceAccessResponse> CreateAdminEvidenceAccessAsync(
        Guid reportId, Guid evidenceId,
        CancellationToken cancellationToken = default);
}
