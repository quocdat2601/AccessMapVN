using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Application.Common.Options;
using AccessMapVN.Application.Common.Utils;
using AccessMapVN.Domain.Entities;
using AccessMapVN.Domain.Enums;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public class SubmitSurveyCommandHandler : IRequestHandler<SubmitSurveyCommand, SubmitSurveyResult>
{
    private readonly IPlaceRepository _placeRepository;
    private readonly ISubmissionRepository _submissionRepository;
    private readonly CommunityValidationOptions _options;

    public SubmitSurveyCommandHandler(
        IPlaceRepository placeRepository,
        ISubmissionRepository submissionRepository,
        CommunityValidationOptions? options = null)
    {
        _placeRepository = placeRepository;
        _submissionRepository = submissionRepository;
        _options = options ?? new CommunityValidationOptions();
    }

    public async Task<SubmitSurveyResult> Handle(SubmitSurveyCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra vị trí địa điểm mục tiêu
        var place = await _placeRepository.GetByIdAsync(request.LocationId, cancellationToken);
        if (place != null)
        {
            var distance = GeoUtils.CalculateDistanceInMeters(
                request.GpsLat,
                request.GpsLng,
                place.Lat,
                place.Lng);

            // Ràng buộc thẩm định hiện trường: Tính dung sai sai số GPS
            var accuracyMargin = request.AccuracyMeters.HasValue
                ? Math.Min(30.0, Math.Max(0.0, request.AccuracyMeters.Value))
                : 0.0;
            var effectiveDistance = Math.Max(0.0, distance - accuracyMargin);

            if (effectiveDistance > 50.0)
            {
                throw new ValidationException(new[]
                {
                    new ValidationFailure(
                        nameof(request.GpsLat),
                        $"Khoảng cách thực địa ({Math.Round(distance, 1)}m) vượt quá ngưỡng cho phép 50m so với địa điểm '{place.Name}'.")
                });
            }
        }

        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            throw new ValidationException("An authenticated user is required to submit a survey.");
        }

        // 2. Lọc rác đầu vào: Ngưỡng AI Confidence < RejectConfidenceThreshold (40%)
        if (request.ConfidenceScore.HasValue &&
            request.ConfidenceScore.Value < _options.Thresholds.RejectConfidenceThreshold)
        {
            var percent = Math.Round(request.ConfidenceScore.Value * 100);
            throw new ValidationException(new[]
            {
                new ValidationFailure(
                    nameof(request.ConfidenceScore),
                    $"Chất lượng nhận diện yếu tố tiếp cận quá thấp ({percent}% < {_options.Thresholds.RejectConfidenceThreshold * 100}%). Vui lòng chụp lại ảnh rõ nét, bao quát khu vực lối vào/ram dốc/thang máy trước khi gửi.")
            });
        }

        // 3. Tạo mã hồ sơ đóng góp theo định dạng chuẩn AMV-YYYY-XXXXX
        var code = $"AMV-{DateTimeOffset.UtcNow.Year}-{Random.Shared.Next(10000, 99999)}";
        var confidence = request.ConfidenceScore ?? 0.88;
        var now = DateTimeOffset.UtcNow;

        // 4. Kiểm tra điều kiện tự động xuất bản (Auto-Verified)
        // Áp dụng khi người dùng có điểm AI >= 80% VÀ có ít nhất 1 đóng góp đã duyệt trước đó
        var priorSubmissions = await _submissionRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        var priorPublishedCount = priorSubmissions?.Count(s =>
            s.Status == SubmissionStatus.Published || s.Status == SubmissionStatus.AutoVerified) ?? 0;

        var isAutoApproved = request.ConfidenceScore.HasValue &&
            request.ConfidenceScore.Value >= _options.Thresholds.AutoApproveConfidenceThreshold &&
            priorPublishedCount >= 1;

        var status = isAutoApproved ? SubmissionStatus.AutoVerified : SubmissionStatus.Submitted;
        var pointsAwarded = isAutoApproved ? 50 : 0;

        var submission = new Submission
        {
            SubmissionCode = code,
            PlaceId = request.LocationId,
            UserId = request.UserId,
            MediaUrls = request.MediaUrls,
            FeatureTags = request.FeatureTags,
            GpsLat = request.GpsLat,
            GpsLng = request.GpsLng,
            AccuracyMeters = request.AccuracyMeters,
            TextDescription = request.TextDescription,
            Status = status,
            ConfidenceScore = confidence,
            PointsAwarded = pointsAwarded,
            CreatedAt = now,
        };

        await _submissionRepository.AddAsync(submission, cancellationToken);

        // 5. Nếu được duyệt tự động: Chiếu đặc trưng tiếp cận lên Place và thưởng điểm ngay lập tức
        if (isAutoApproved)
        {
            if (place != null)
            {
                var hasRamp = request.FeatureTags.Any(t => t.Contains("ramp", StringComparison.OrdinalIgnoreCase)) ? true : place.HasRamp;
                var hasDoor = request.FeatureTags.Any(t => t.Contains("door", StringComparison.OrdinalIgnoreCase) || t.Contains("entrance", StringComparison.OrdinalIgnoreCase)) ? true : place.DoorWidthOk;
                var hasElevator = request.FeatureTags.Any(t => t.Contains("elevator", StringComparison.OrdinalIgnoreCase)) ? true : place.HasAccessibleElevator;
                var hasRestroom = request.FeatureTags.Any(t => t.Contains("restroom", StringComparison.OrdinalIgnoreCase)) ? true : place.HasAccessibleRestroom;
                var hasTactile = request.FeatureTags.Any(t => t.Contains("tactile", StringComparison.OrdinalIgnoreCase)) ? true : place.HasTactilePaving;

                var featureCount = (hasRamp == true ? 1 : 0) + (hasDoor == true ? 1 : 0) + (hasElevator == true ? 1 : 0) + (hasRestroom == true ? 1 : 0) + (hasTactile == true ? 1 : 0);
                var score = Math.Round((decimal)featureCount / 5.0m * 10.0m, 1);

                await _placeRepository.UpdateAccessibilityFeaturesAsync(
                    place.Id.ToString(),
                    hasRamp,
                    hasElevator,
                    hasTactile,
                    hasRestroom,
                    hasDoor,
                    score,
                    request.TextDescription,
                    cancellationToken);
            }

            await _submissionRepository.AddPointTransactionAsync(new PointTransaction
            {
                UserId = request.UserId,
                SubmissionId = code,
                Points = pointsAwarded,
                Reason = $"Xuất bản tự động đóng góp tiếp cận [{code}] (AI đạt {Math.Round(confidence * 100)}%)",
                CreatedAt = now,
            }, cancellationToken);
        }

        await _submissionRepository.SaveChangesAsync(cancellationToken);

        var message = isAutoApproved
            ? $"Đóng góp đạt chuẩn tiếp cận cao (AI {Math.Round(confidence * 100)}%). Hệ thống đã tự động xác minh và xuất bản lên bản đồ!"
            : "Đã tiếp nhận hồ sơ. Thông tin và điểm sẽ được cập nhật sau khi hồ sơ được xác minh và xuất bản.";

        return new SubmitSurveyResult
        {
            SubmissionId = code,
            Status = isAutoApproved ? "AutoVerified" : "Submitted",
            Message = message,
            PointsAwarded = pointsAwarded,
            CreatedAt = submission.CreatedAt,
        };
    }
}
