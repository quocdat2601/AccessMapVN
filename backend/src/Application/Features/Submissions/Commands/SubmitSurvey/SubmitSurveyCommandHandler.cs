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

            // Ràng buộc thẩm định hiện trường: Sai số GPS <= 50m
            if (distance > 50.0)
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
            ConfidenceScore = 0.88,
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

        return new SubmitSurveyResult
        {
            SubmissionId = code,
            Status = "Submitted",
            Message = "Đã tiếp nhận hồ sơ đóng góp thành công. Đang đưa vào hàng đợi thẩm định AI.",
            PointsAwarded = 50,
            CreatedAt = submission.CreatedAt,
        };
    }
}
