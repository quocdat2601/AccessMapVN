using System.Text.Json.Serialization;

namespace AccessMapVN.Application.Features.Submissions.Admin;

public class DashboardSummaryDto
{
    [JsonPropertyName("received")]
    public int Received { get; set; }

    [JsonPropertyName("resolved")]
    public int Resolved { get; set; }

    [JsonPropertyName("pendingSubmissions")]
    public int PendingSubmissions { get; set; }

    [JsonPropertyName("pendingDisputes")]
    public int PendingDisputes { get; set; }

    [JsonPropertyName("locationsPublished")]
    public int LocationsPublished { get; set; }

    [JsonPropertyName("coverageDistricts")]
    public int CoverageDistricts { get; set; }

    [JsonPropertyName("coverageDistrictsTotal")]
    public int CoverageDistrictsTotal { get; set; } = 24;
}

public class DashboardMetricDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public double Value { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("supportingText")]
    public string SupportingText { get; set; } = string.Empty;

    [JsonPropertyName("comparison")]
    public string Comparison { get; set; } = string.Empty;

    [JsonPropertyName("trend")]
    public double Trend { get; set; }

    [JsonPropertyName("trendDirection")]
    public string TrendDirection { get; set; } = "flat";

    [JsonPropertyName("tone")]
    public string Tone { get; set; } = "normal";

    [JsonPropertyName("icon")]
    public string Icon { get; set; } = "inbox";
}

public class PriorityItemDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "submission";

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("context")]
    public string Context { get; set; } = string.Empty;

    [JsonPropertyName("waitingTime")]
    public string WaitingTime { get; set; } = string.Empty;

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "medium";

    [JsonPropertyName("actionLabel")]
    public string ActionLabel { get; set; } = "Xem hồ sơ";

    [JsonPropertyName("href")]
    public string Href { get; set; } = string.Empty;
}

public class TrendPointDto
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("submissions")]
    public int Submissions { get; set; }

    [JsonPropertyName("disputes")]
    public int Disputes { get; set; }

    [JsonPropertyName("resolved")]
    public int Resolved { get; set; }

    [JsonPropertyName("backlog")]
    public int Backlog { get; set; }
}

public class WorkflowSliceDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public int Value { get; set; }

    [JsonPropertyName("color")]
    public string Color { get; set; } = string.Empty;
}

public class DistributionItemDto
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public int Value { get; set; }

    [JsonPropertyName("percentage")]
    public double Percentage { get; set; }

    [JsonPropertyName("tone")]
    public string Tone { get; set; } = "teal";
}

public class AiOutcomeDto
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public int Value { get; set; }

    [JsonPropertyName("percentage")]
    public double Percentage { get; set; }

    [JsonPropertyName("color")]
    public string Color { get; set; } = string.Empty;
}

public class PublishedLocationDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("district")]
    public string District { get; set; } = string.Empty;

    [JsonPropertyName("accessibilityScore")]
    public decimal AccessibilityScore { get; set; }

    [JsonPropertyName("publishedAt")]
    public string PublishedAt { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;
}

public class DashboardDataDto
{
    [JsonPropertyName("range")]
    public string Range { get; set; } = "7d";

    [JsonPropertyName("rangeLabel")]
    public string RangeLabel { get; set; } = "7 ngày qua";

    [JsonPropertyName("generatedAt")]
    public string GeneratedAt { get; set; } = string.Empty;

    [JsonPropertyName("summary")]
    public DashboardSummaryDto Summary { get; set; } = new();

    [JsonPropertyName("metrics")]
    public List<DashboardMetricDto> Metrics { get; set; } = new();

    [JsonPropertyName("priorities")]
    public List<PriorityItemDto> Priorities { get; set; } = new();

    [JsonPropertyName("trends")]
    public List<TrendPointDto> Trends { get; set; } = new();

    [JsonPropertyName("workflow")]
    public List<WorkflowSliceDto> Workflow { get; set; } = new();

    [JsonPropertyName("backlogAging")]
    public List<DistributionItemDto> BacklogAging { get; set; } = new();

    [JsonPropertyName("aiOutcomes")]
    public List<AiOutcomeDto> AiOutcomes { get; set; } = new();

    [JsonPropertyName("recentLocations")]
    public List<PublishedLocationDto> RecentLocations { get; set; } = new();
}
