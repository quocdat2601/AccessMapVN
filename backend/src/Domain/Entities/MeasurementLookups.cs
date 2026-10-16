namespace AccessMapVN.Domain.Entities;

public class MediaKind
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class MeasurementUnit
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class MeasurementMethod
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public decimal? TrustWeight { get; set; }
}

public class MeasurementFeature
{
    public string FeatureName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class MeasurementFeatureUnit
{
    public string FeatureName { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
}
