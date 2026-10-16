using AccessMapVN.Application.Common.Interfaces;
using FluentValidation;

namespace AccessMapVN.Application.Features.Submissions.Commands.SubmitSurvey;

public class SubmitSurveyCommandValidator : AbstractValidator<SubmitSurveyCommand>
{
    public SubmitSurveyCommandValidator(IMeasurementPolicyProvider? policyProvider = null)
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

        When(x => x.Measurements != null && x.Measurements.DoorClearWidth != null && x.Measurements.DoorClearWidth.Status == "provided", () =>
        {
            RuleFor(x => x.Measurements!.DoorClearWidth!.ValueMm)
                .NotNull().WithMessage("Chiều rộng cửa (value_mm) phải có giá trị khi status là 'provided'.")
                .Must(v => policyProvider == null || policyProvider.IsWithinPhysicalRange("door_clear_width", "mm", (decimal)v!.Value))
                .WithMessage("Chiều rộng lọt lòng cửa (door_clear_width) không hợp lệ về mặt vật lý (phải từ 500mm đến 3000mm).");
        });

        When(x => x.Measurements != null && x.Measurements.RampSlope != null, () =>
        {
            RuleFor(x => x.Measurements!.RampSlope!)
                .Custom((r, context) =>
                {
                    if (r.Status != "provided")
                    {
                        return; // not measured is allowed
                    }

                    if (!r.HeightCm.HasValue || !r.LengthCm.HasValue)
                    {
                        context.AddFailure(nameof(r.HeightCm),
                            "Cần nhập cả chiều cao và chiều dài dốc để đánh giá độ dốc.");
                        return;
                    }

                    if (r.LengthCm.Value <= 0 || r.HeightCm.Value < 0)
                    {
                        context.AddFailure(nameof(r.LengthCm),
                            "Chiều dài dốc phải lớn hơn 0 và chiều cao không âm.");
                        return;
                    }

                    var slopePercent = (decimal)(r.HeightCm.Value / r.LengthCm.Value * 100.0);

                    if (policyProvider != null &&
                        !policyProvider.IsWithinPhysicalRange("ramp_slope", "percent", slopePercent))
                    {
                        context.AddFailure(nameof(r.HeightCm),
                            "Độ dốc tính toán nằm ngoài dải hợp lệ.");
                    }
                });
        });
    }
}
