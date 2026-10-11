using AccessMapVN.Application.Common.Interfaces;
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

    public SubmitSurveyCommandHandler(
        IPlaceRepository placeRepository,
        ISubmissionRepository submissionRepository)
    {
        _placeRepository = placeRepository;
        _submissionRepository = submissionRepository;
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

        // 2. Tạo mã hồ sơ đóng góp theo định dạng chuẩn AMV-YYYY-XXXXX
        var code = $"AMV-{DateTimeOffset.UtcNow.Year}-{Random.Shared.Next(10000, 99999)}";
        var submission = new Submission
        {
            SubmissionCode = code,
            PlaceId = request.LocationId,
            UserId = request.UserId ?? "anonymous-contributor",
            MediaUrls = request.MediaUrls,
            FeatureTags = request.FeatureTags,
            GpsLat = request.GpsLat,
            GpsLng = request.GpsLng,
            AccuracyMeters = request.AccuracyMeters,
            TextDescription = request.TextDescription,
            Status = SubmissionStatus.Submitted,
            ConfidenceScore = request.ConfidenceScore ?? 0.88,
            PointsAwarded = 50,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _submissionRepository.AddAsync(submission, cancellationToken);

        // 3. Ghi nhận sổ cái điểm EXP
        var transaction = new PointTransaction
        {
            UserId = submission.UserId,
            SubmissionId = code,
            Points = 50,
            Reason = $"Đóng góp khảo sát tiếp cận [{code}]",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _submissionRepository.AddPointTransactionAsync(transaction, cancellationToken);
        await _submissionRepository.SaveChangesAsync(cancellationToken);

        // 4. Cập nhật trực tiếp các đặc tính tiếp cận vào bảng Master Data Places
        if (place != null)
        {
            bool? newHasRamp = null;
            bool? newHasElevator = null;
            bool? newHasTactile = null;
            bool? newHasRestroom = null;
            bool? newDoorWidthOk = null;

            var tags = request.FeatureTags ?? new List<string>();
            foreach (var tag in tags)
            {
                var lower = tag.ToLowerInvariant();
                if (lower.Contains("ramp") && !lower.Contains("no_ramp"))
                    newHasRamp = true;
                if (lower.Contains("elevator") || lower.Contains("lift"))
                    newHasElevator = true;
                if (lower.Contains("tactile"))
                    newHasTactile = true;
                if (lower.Contains("restroom") || lower.Contains("toilet") || lower.Contains("wc"))
                    newHasRestroom = true;
                if (lower.Contains("door_width_ok") || lower.Contains("wide_entry_door") || lower.Contains("door_threshold_flat"))
                    newDoorWidthOk = true;
            }

            var isOutdoorOrParking = string.Equals(place.Category, "parking", StringComparison.OrdinalIgnoreCase) ||
                                     (place.FloorLevel == 0 && !place.BuildingId.HasValue);
            if (isOutdoorOrParking && newHasElevator == null)
            {
                newHasElevator = false;
            }

            var resolvedHasRamp = newHasRamp ?? place.HasRamp ?? false;
            var resolvedDoorOk = newDoorWidthOk ?? place.DoorWidthOk ?? false;
            var resolvedElevator = newHasElevator ?? place.HasAccessibleElevator ?? false;
            var resolvedRestroom = newHasRestroom ?? place.HasAccessibleRestroom ?? false;
            var resolvedTactile = newHasTactile ?? place.HasTactilePaving ?? false;

            decimal calculatedScore = 0;
            if (resolvedHasRamp) calculatedScore += 30;
            if (resolvedDoorOk) calculatedScore += 25;
            if (resolvedElevator) calculatedScore += 15;
            if (resolvedRestroom) calculatedScore += 15;
            if (resolvedTactile) calculatedScore += 15;

            var finalScore = request.ConfidenceScore.HasValue && request.ConfidenceScore.Value > 0
                ? Math.Round((decimal)request.ConfidenceScore.Value, 2)
                : (calculatedScore > 0 ? Math.Round(calculatedScore / 100m, 2) : 0.50m);

            var summaryParts = new List<string>();
            if (resolvedHasRamp) summaryParts.Add("Có ram dốc");
            if (resolvedDoorOk) summaryParts.Add("Cửa đạt chuẩn");
            if (resolvedElevator) summaryParts.Add("Thang máy tiếp cận");
            if (resolvedRestroom) summaryParts.Add("WC tiếp cận");
            if (resolvedTactile) summaryParts.Add("Lối đi xúc giác");

            var note = summaryParts.Count > 0
                ? $"Khảo sát tiếp cận: {string.Join(", ", summaryParts)}"
                : "Đã cập nhật dữ liệu tiếp cận";

            await _placeRepository.UpdateAccessibilityFeaturesAsync(
                place.Id.ToString(),
                newHasRamp,
                newHasElevator,
                newHasTactile,
                newHasRestroom,
                newDoorWidthOk,
                finalScore,
                note,
                cancellationToken);
        }

        return new SubmitSurveyResult
        {
            SubmissionId = code,
            Status = "Submitted",
            Message = "Đã tiếp nhận và cập nhật thông tin tiếp cận địa điểm thành công.",
            PointsAwarded = 50,
            CreatedAt = submission.CreatedAt,
        };
    }
}
