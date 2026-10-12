using FluentValidation;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public class SubmitSurveyCommandValidator : AbstractValidator<SubmitSurveyCommand>
{
    public SubmitSurveyCommandValidator()
    {
        RuleFor(x => x.ClientSubmissionId)
            .NotEmpty()
            .WithMessage("Mã định danh đóng góp (client_submission_id) không được để trống.")
            .MaximumLength(100);

        RuleFor(x => x.LocationId)
            .NotEmpty()
            .WithMessage("Mã địa điểm không được để trống.");

        RuleFor(x => x.MediaUrls)
            .NotEmpty()
            .WithMessage("Phải đính kèm ít nhất một hình ảnh hoặc video bằng chứng.");

        RuleFor(x => x.GpsLat)
            .InclusiveBetween(-90.0, 90.0)
            .WithMessage("Tọa độ vĩ độ (Latitude) không hợp lệ.");

        RuleFor(x => x.GpsLng)
            .InclusiveBetween(-180.0, 180.0)
            .WithMessage("Tọa độ kinh độ (Longitude) không hợp lệ.");

        RuleFor(x => x.AccuracyMeters)
            .Must(x => !x.HasValue || (double.IsFinite(x.Value) && x.Value >= 0.0 && x.Value <= 100.0))
            .WithMessage("Độ chính xác GPS (accuracy_meters) phải là số hữu hạn, không âm và không vượt quá 100m.");
    }
}
