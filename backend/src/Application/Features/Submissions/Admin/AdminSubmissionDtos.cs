using System.Text.Json.Serialization;

namespace AccessMapVN.Application.Features.Submissions.Admin;

public class ContributionPlaceDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("district")]
    public string District { get; set; } = "Quận 1";

    [JsonPropertyName("city")]
    public string City { get; set; } = "TP.HCM";
}

public class ContributorSummaryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("initials")]
    public string Initials { get; set; } = "AM";

    [JsonPropertyName("reputationScore")]
    public decimal ReputationScore { get; set; }

    [JsonPropertyName("avatarTone")]
    public string AvatarTone { get; set; } = "teal";
}

public class ContributionVerificationDto
{
    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("outcome")]
    public string Outcome { get; set; } = "needs_review";

    [JsonPropertyName("checkedItems")]
    public int? CheckedItems { get; set; }

    [JsonPropertyName("totalItems")]
    public int? TotalItems { get; set; }

    [JsonPropertyName("note")]
    public string Note { get; set; } = string.Empty;
}

public class ContributionRecordDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("submittedAt")]
    public string SubmittedAt { get; set; } = string.Empty;

    [JsonPropertyName("attemptLabel")]
    public string AttemptLabel { get; set; } = "Lần gửi 1";

    [JsonPropertyName("type")]
    public string Type { get; set; } = "place_update";

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = "new_accessibility_data";

    [JsonPropertyName("place")]
    public ContributionPlaceDto Place { get; set; } = new();

    [JsonPropertyName("contributor")]
    public ContributorSummaryDto Contributor { get; set; } = new();

    [JsonPropertyName("categories")]
    public List<string> Categories { get; set; } = new();

    [JsonPropertyName("verification")]
    public ContributionVerificationDto Verification { get; set; } = new();

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "normal";

    [JsonPropertyName("waitingMinutes")]
    public int WaitingMinutes { get; set; }

    [JsonPropertyName("evidenceCount")]
    public int EvidenceCount { get; set; }
}

public class EvidenceAiFindingDto
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public double? Confidence { get; set; }

    [JsonPropertyName("tone")]
    public string Tone { get; set; } = "positive";
}

public class ContributionEvidenceDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "image";

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("capturedAt")]
    public string CapturedAt { get; set; } = string.Empty;

    [JsonPropertyName("device")]
    public string Device { get; set; } = "Mobile Camera";

    [JsonPropertyName("resolution")]
    public string Resolution { get; set; } = "1920 × 1080";

    [JsonPropertyName("fileSize")]
    public string FileSize { get; set; } = "2,5 MB";

    [JsonPropertyName("exifStatus")]
    public string ExifStatus { get; set; } = "valid";

    [JsonPropertyName("geotagStatus")]
    public string GeotagStatus { get; set; } = "valid";

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("aiFindings")]
    public List<EvidenceAiFindingDto> AiFindings { get; set; } = new();
}

public class AiClaimAssessmentDto
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = "Phù hợp";

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("details")]
    public string Details { get; set; } = string.Empty;

    [JsonPropertyName("advisoryOnly")]
    public bool AdvisoryOnly { get; set; } = true;
}

public class AccessibilityClaimDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("feature")]
    public string Feature { get; set; } = string.Empty;

    [JsonPropertyName("standard")]
    public string Standard { get; set; } = string.Empty;

    [JsonPropertyName("contributorClaim")]
    public string ContributorClaim { get; set; } = string.Empty;

    [JsonPropertyName("aiAssessment")]
    public AiClaimAssessmentDto AiAssessment { get; set; } = new();

    [JsonPropertyName("currentPublishedValue")]
    public string? CurrentPublishedValue { get; set; }

    [JsonPropertyName("evidenceIds")]
    public List<string> EvidenceIds { get; set; } = new();

    [JsonPropertyName("eligibleForApproval")]
    public bool EligibleForApproval { get; set; } = true;

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = "pending";

    [JsonPropertyName("decisionNote")]
    public string? DecisionNote { get; set; }
}

public class LocationIntegrityDto
{
    [JsonPropertyName("poiCode")]
    public string PoiCode { get; set; } = string.Empty;

    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }

    [JsonPropertyName("gpsAccuracyMeters")]
    public double GpsAccuracyMeters { get; set; }

    [JsonPropertyName("surveyArea")]
    public string SurveyArea { get; set; } = string.Empty;

    [JsonPropertyName("mismatchMeters")]
    public double? MismatchMeters { get; set; }

    [JsonPropertyName("warning")]
    public string? Warning { get; set; }

    [JsonPropertyName("mapHref")]
    public string? MapHref { get; set; }
}

public class ContributionTimelineEventDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("occurredAt")]
    public string OccurredAt { get; set; } = string.Empty;

    [JsonPropertyName("actor")]
    public string Actor { get; set; } = string.Empty;
}

public class InformationRequestDto
{
    [JsonPropertyName("requestedClaimIds")]
    public List<string> RequestedClaimIds { get; set; } = new();

    [JsonPropertyName("evidenceItems")]
    public List<string> EvidenceItems { get; set; } = new();

    [JsonPropertyName("instructions")]
    public string Instructions { get; set; } = string.Empty;

    [JsonPropertyName("requestedAt")]
    public string RequestedAt { get; set; } = string.Empty;

    [JsonPropertyName("requestedBy")]
    public string RequestedBy { get; set; } = string.Empty;

    [JsonPropertyName("dueAt")]
    public string DueAt { get; set; } = string.Empty;

    [JsonPropertyName("reminderSentAt")]
    public string? ReminderSentAt { get; set; }

    [JsonPropertyName("responseStatus")]
    public string ResponseStatus { get; set; } = "waiting";
}

public class ModerationDecisionDto
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "published";

    [JsonPropertyName("selectedClaimIds")]
    public List<string> SelectedClaimIds { get; set; } = new();

    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;

    [JsonPropertyName("decidedAt")]
    public string DecidedAt { get; set; } = string.Empty;

    [JsonPropertyName("decidedBy")]
    public string DecidedBy { get; set; } = string.Empty;
}

public class ContributorHistorySummaryDto
{
    [JsonPropertyName("approved")]
    public int Approved { get; set; } = 1;

    [JsonPropertyName("supplements")]
    public int Supplements { get; set; } = 0;

    [JsonPropertyName("violations")]
    public int Violations { get; set; } = 0;

    [JsonPropertyName("reputationDelta")]
    public decimal? ReputationDelta { get; set; } = 50;
}

public class ContributionDetailDto : ContributionRecordDto
{
    [JsonPropertyName("locationIntegrity")]
    public LocationIntegrityDto LocationIntegrity { get; set; } = new();

    [JsonPropertyName("evidence")]
    public List<ContributionEvidenceDto> Evidence { get; set; } = new();

    [JsonPropertyName("claims")]
    public List<AccessibilityClaimDto> Claims { get; set; } = new();

    [JsonPropertyName("timeline")]
    public List<ContributionTimelineEventDto> Timeline { get; set; } = new();

    [JsonPropertyName("informationRequest")]
    public InformationRequestDto? InformationRequest { get; set; }

    [JsonPropertyName("moderationDecision")]
    public ModerationDecisionDto? ModerationDecision { get; set; }

    [JsonPropertyName("contributorHistory")]
    public ContributorHistorySummaryDto ContributorHistory { get; set; } = new();

    [JsonPropertyName("technicalNotes")]
    public List<string> TechnicalNotes { get; set; } = new();

    [JsonPropertyName("applicableStandards")]
    public List<string> ApplicableStandards { get; set; } = new();
}

public class ContributionQueueSummaryDto
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("awaitingDecision")]
    public int AwaitingDecision { get; set; }

    [JsonPropertyName("needsSupplement")]
    public int NeedsSupplement { get; set; }

    [JsonPropertyName("processed")]
    public int Processed { get; set; }

    [JsonPropertyName("published")]
    public int Published { get; set; }

    [JsonPropertyName("rejected")]
    public int Rejected { get; set; }

    [JsonPropertyName("active")]
    public int Active { get; set; }

    [JsonPropertyName("warnings")]
    public int Warnings { get; set; }

    [JsonPropertyName("waitingOverSla")]
    public int WaitingOverSla { get; set; }

    [JsonPropertyName("newPlaces")]
    public int NewPlaces { get; set; }
}

public class ContributionQueueResponseDto
{
    [JsonPropertyName("items")]
    public List<ContributionRecordDto> Items { get; set; } = new();

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }

    [JsonPropertyName("summary")]
    public ContributionQueueSummaryDto Summary { get; set; } = new();

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = string.Empty;

    [JsonPropertyName("slaTargetMinutes")]
    public int SlaTargetMinutes { get; set; } = 120;
}

public class ContributionNavigationDto
{
    [JsonPropertyName("previousId")]
    public string? PreviousId { get; set; }

    [JsonPropertyName("nextId")]
    public string? NextId { get; set; }

    [JsonPropertyName("current")]
    public int Current { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }
}

public class ApproveSubmissionRequest
{
    [JsonPropertyName("claimIds")]
    public List<string> ClaimIds { get; set; } = new();

    [JsonPropertyName("note")]
    public string Note { get; set; } = string.Empty;
}

public class RejectSubmissionRequest
{
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public class RequestMoreInfoSubmissionRequest
{
    [JsonPropertyName("claimIds")]
    public List<string> ClaimIds { get; set; } = new();

    [JsonPropertyName("evidenceItems")]
    public List<string> EvidenceItems { get; set; } = new();

    [JsonPropertyName("instructions")]
    public string Instructions { get; set; } = string.Empty;
}
