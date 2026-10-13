using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Common.Utils;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

internal record CanonicalMeasurementItem
{
    public string Status { get; init; } = "not_measured";
    public double? ValueMm { get; init; }
    public double? HeightCm { get; init; }
    public double? LengthCm { get; init; }
    public string? Method { get; init; }
}

internal record CanonicalMeasurements
{
    public CanonicalMeasurementItem? DoorClearWidth { get; init; }
    public CanonicalMeasurementItem? RampSlope { get; init; }
}

internal record CanonicalPayload
{
    public string LocationId { get; init; } = string.Empty;
    public List<string> MediaUrls { get; init; } = new();
    public List<string> Observations { get; init; } = new();
    public double Lat { get; init; }
    public double Lng { get; init; }
    public double? AccuracyMeters { get; init; }
    public string? Description { get; init; }
    public CanonicalMeasurements? Measurements { get; init; }
}

public class SubmitSurveyCommandHandler : IRequestHandler<SubmitSurveyCommand, SubmitSurveyResult>
{
    private readonly IPlaceRepository _placeRepository;
    private readonly ISubmissionRepository _submissionRepository;

    public SubmitSurveyCommandHandler(
        IPlaceRepository placeRepository,
        ISubmissionRepository submissionRepository)
    {
        _placeRepository = placeRepository;
        _submissionRepository = submissionRepository;
    }

    public async Task<SubmitSurveyResult> Handle(SubmitSurveyCommand request, CancellationToken cancellationToken)
    {
        // 1. Xác thực danh tính: Bắt buộc access token, loại bỏ fallback anonymous để tránh va chạm namespace idempotency
        if (string.IsNullOrWhiteSpace(request.AuthenticatedUserId))
        {
            throw new UnauthorizedAccessException("Yêu cầu xác thực tài khoản (Access Token) để gửi khảo sát đóng góp.");
        }
        var effectiveUserId = request.AuthenticatedUserId;
        var clientSubmissionId = request.ClientSubmissionId?.Trim() ?? string.Empty;

        // 2. Tính payload hash chuẩn hóa (Canonical JSON SHA-256) tránh nhập nhằng ký tự phân cách
        var tags = (request.ClientObservations?.Count > 0 ? request.ClientObservations : request.FeatureTags) ?? new List<string>();

        CanonicalMeasurements? canonicalMeasurements = null;
        if (request.Measurements != null)
        {
            var door = request.Measurements.DoorClearWidth != null
                ? new CanonicalMeasurementItem
                {
                    Status = string.IsNullOrWhiteSpace(request.Measurements.DoorClearWidth.Status)
                        ? "not_measured"
                        : request.Measurements.DoorClearWidth.Status.Trim().ToLowerInvariant(),
                    ValueMm = request.Measurements.DoorClearWidth.ValueMm.HasValue
                        ? Math.Round(request.Measurements.DoorClearWidth.ValueMm.Value, 1)
                        : null,
                    Method = string.IsNullOrWhiteSpace(request.Measurements.DoorClearWidth.Method)
                        ? null
                        : request.Measurements.DoorClearWidth.Method.Trim().ToLowerInvariant(),
                }
                : null;

            var ramp = request.Measurements.RampSlope != null
                ? new CanonicalMeasurementItem
                {
                    Status = string.IsNullOrWhiteSpace(request.Measurements.RampSlope.Status)
                        ? "not_measured"
                        : request.Measurements.RampSlope.Status.Trim().ToLowerInvariant(),
                    HeightCm = request.Measurements.RampSlope.HeightCm.HasValue
                        ? Math.Round(request.Measurements.RampSlope.HeightCm.Value, 1)
                        : null,
                    LengthCm = request.Measurements.RampSlope.LengthCm.HasValue
                        ? Math.Round(request.Measurements.RampSlope.LengthCm.Value, 1)
                        : null,
                    Method = string.IsNullOrWhiteSpace(request.Measurements.RampSlope.Method)
                        ? null
                        : request.Measurements.RampSlope.Method.Trim().ToLowerInvariant(),
                }
                : null;

            if (door != null || ramp != null)
            {
                canonicalMeasurements = new CanonicalMeasurements
                {
                    DoorClearWidth = door,
                    RampSlope = ramp,
                };
            }
        }

        var canonicalObj = new CanonicalPayload
        {
            LocationId = request.LocationId.Trim(),
            MediaUrls = (request.MediaUrls ?? new()).Select(m => m.Trim()).Where(m => !string.IsNullOrEmpty(m)).OrderBy(m => m, StringComparer.Ordinal).ToList(),
            Observations = tags.Select(t => t.Trim().ToLowerInvariant()).Where(t => !string.IsNullOrEmpty(t)).Distinct().OrderBy(t => t, StringComparer.Ordinal).ToList(),
            Lat = Math.Round(request.GpsLat, 5),
            Lng = Math.Round(request.GpsLng, 5),
            AccuracyMeters = request.AccuracyMeters.HasValue ? Math.Round(request.AccuracyMeters.Value, 1) : null,
            Description = string.IsNullOrWhiteSpace(request.TextDescription) ? null : request.TextDescription.Trim(),
            Measurements = canonicalMeasurements,
        };

        var serializerOpts = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
        };
        var canonicalJson = JsonSerializer.Serialize(canonicalObj, serializerOpts);
        var currentHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalJson)));

        var measurementsJson = request.Measurements != null ? JsonSerializer.Serialize(request.Measurements) : null;
        var clientObsJson = tags.Count > 0 ? JsonSerializer.Serialize(tags) : null;

        // 3. Kiểm tra Idempotency trước khi ghi
        var existing = await _submissionRepository.GetByClientSubmissionIdAsync(effectiveUserId, clientSubmissionId, cancellationToken);
        if (existing != null)
        {
            if (string.Equals(existing.PayloadHash, currentHash, StringComparison.OrdinalIgnoreCase))
            {
                return new SubmitSurveyResult
                {
                    SubmissionId = existing.SubmissionCode,
                    ClientSubmissionId = existing.ClientSubmissionId,
                    Status = existing.Status.ToString(),
                    ExpStatus = existing.ExpStatus,
                    PointsAwarded = existing.PointsAwarded,
                    Message = "Hồ sơ đã được tiếp nhận trước đó. EXP sẽ được tính sau khi khảo sát được duyệt.",
                    CreatedAt = existing.CreatedAt,
                };
            }

            throw new SubmissionConflictException(
                $"Trùng lặp ClientSubmissionId '{clientSubmissionId}' nhưng dữ liệu payload khác nhau (Conflict). Vui lòng sử dụng submission ID mới.");
        }

        // 4. Kiểm tra vị trí địa điểm mục tiêu (phân cấp Entrance -> Custom Radius -> Category Fallback)
        GeofenceEvaluationResult? geofenceResult = null;
        var place = await _placeRepository.GetByIdAsync(request.LocationId, cancellationToken);
        if (place != null)
        {
            geofenceResult = GeofencePolicy.Evaluate(
                request.GpsLat,
                request.GpsLng,
                request.AccuracyMeters,
                place.Lat,
                place.Lng,
                place.EntranceLat,
                place.EntranceLng,
                place.GeofenceRadiusMeters,
                place.Category);

            if (!geofenceResult.IsPlausible)
            {
                throw new ValidationException(new[]
                {
                    new ValidationFailure(
                        nameof(request.GpsLat),
                        $"Khoảng cách thực địa ({Math.Round(geofenceResult.DistanceMeters, 1)}m) vượt quá ngưỡng cho phép {geofenceResult.AllowedRadiusMeters}m (chính sách {geofenceResult.Policy}) so với địa điểm '{place.Name}'.")
                });
            }
        }

        // 5. Tạo hồ sơ khảo sát ở trạng thái Chờ duyệt (PendingModeration)
        var code = $"AMV-{DateTimeOffset.UtcNow.Year}-{Random.Shared.Next(10000, 99999)}";
        var submission = new Submission
        {
            SubmissionCode = code,
            ClientSubmissionId = clientSubmissionId,
            PayloadHash = currentHash,
            PlaceId = request.LocationId,
            UserId = effectiveUserId,
            MediaUrls = request.MediaUrls ?? new(),
            FeatureTags = tags,
            MeasurementsJson = measurementsJson,
            ClientObservationsJson = clientObsJson,
            GpsLat = request.GpsLat,
            GpsLng = request.GpsLng,
            AccuracyMeters = request.AccuracyMeters,
            DistanceMeters = geofenceResult != null ? Math.Round(geofenceResult.DistanceMeters, 1) : null,
            EffectiveDistanceMeters = geofenceResult != null ? Math.Round(geofenceResult.EffectiveDistanceMeters, 1) : null,
            GeofencePolicy = geofenceResult?.Policy,
            AllowedRadiusMeters = geofenceResult?.AllowedRadiusMeters,
            IsMocked = request.IsMocked,
            TextDescription = request.TextDescription,
            Status = SubmissionStatus.PendingModeration,
            ExpStatus = "pending_review",
            ConfidenceScore = request.ConfidenceScore ?? 0.88,
            PointsAwarded = 0,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        try
        {
            await _submissionRepository.AddAsync(submission, cancellationToken);
            await _submissionRepository.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) when (ex.GetType().Name.Contains("DbUpdate") || ex.GetType().Name.Contains("Unique"))
        {
            // Xử lý race condition: Đọc lại bản ghi vừa được commit đồng thời bởi request song song
            var concurrentRecord = await _submissionRepository.GetByClientSubmissionIdAsync(effectiveUserId, clientSubmissionId, cancellationToken);
            if (concurrentRecord != null)
            {
                if (string.Equals(concurrentRecord.PayloadHash, currentHash, StringComparison.OrdinalIgnoreCase))
                {
                    return new SubmitSurveyResult
                    {
                        SubmissionId = concurrentRecord.SubmissionCode,
                        ClientSubmissionId = concurrentRecord.ClientSubmissionId,
                        Status = concurrentRecord.Status.ToString(),
                        ExpStatus = concurrentRecord.ExpStatus,
                        PointsAwarded = concurrentRecord.PointsAwarded,
                        Message = "Hồ sơ đã được tiếp nhận trước đó. EXP sẽ được tính sau khi khảo sát được duyệt.",
                        CreatedAt = concurrentRecord.CreatedAt,
                    };
                }

                throw new SubmissionConflictException(
                    $"Trùng lặp ClientSubmissionId '{clientSubmissionId}' nhưng dữ liệu payload khác nhau (Conflict). Vui lòng sử dụng submission ID mới.");
            }

            throw;
        }

        return new SubmitSurveyResult
        {
            SubmissionId = code,
            ClientSubmissionId = clientSubmissionId,
            Status = "PendingModeration",
            ExpStatus = "pending_review",
            PointsAwarded = 0,
            Message = "Hồ sơ đã được tiếp nhận. EXP sẽ được tính sau khi khảo sát được duyệt.",
            CreatedAt = submission.CreatedAt,
        };
    }
}
