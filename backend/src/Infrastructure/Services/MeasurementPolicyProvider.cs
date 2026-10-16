using AccessMapVN.Application.Common.Interfaces;

namespace AccessMapVN.Infrastructure.Services;

public class MeasurementPolicyProvider : IMeasurementPolicyProvider
{
    private static readonly Dictionary<string, FeatureUnitPolicy> Policies = new(StringComparer.OrdinalIgnoreCase)
    {
        ["door_clear_width"] = new FeatureUnitPolicy(
            "door_clear_width",
            new[] { "mm", "cm" },
            new Dictionary<string, (decimal Min, decimal Max)>(StringComparer.OrdinalIgnoreCase)
            {
                ["mm"] = (500m, 3000m),
                ["cm"] = (50m, 300m)
            }
        ),
        ["ramp_slope"] = new FeatureUnitPolicy(
            "ramp_slope",
            new[] { "percent" },
            new Dictionary<string, (decimal Min, decimal Max)>(StringComparer.OrdinalIgnoreCase)
            {
                ["percent"] = (1m, 50m)
            }
        ),
        ["step_height"] = new FeatureUnitPolicy(
            "step_height",
            new[] { "mm", "cm" },
            new Dictionary<string, (decimal Min, decimal Max)>(StringComparer.OrdinalIgnoreCase)
            {
                ["mm"] = (10m, 1000m),
                ["cm"] = (1m, 100m)
            }
        ),
        ["corridor_width"] = new FeatureUnitPolicy(
            "corridor_width",
            new[] { "mm", "cm" },
            new Dictionary<string, (decimal Min, decimal Max)>(StringComparer.OrdinalIgnoreCase)
            {
                ["mm"] = (600m, 5000m),
                ["cm"] = (60m, 500m)
            }
        )
    };

    public bool IsAllowedUnit(string featureName, string unit)
    {
        if (string.IsNullOrWhiteSpace(featureName) || string.IsNullOrWhiteSpace(unit))
            return false;

        return Policies.TryGetValue(featureName, out var policy) &&
               policy.AllowedUnits.Contains(unit, StringComparer.OrdinalIgnoreCase);
    }

    public bool IsWithinPhysicalRange(string featureName, string unit, decimal value)
    {
        if (string.IsNullOrWhiteSpace(featureName) || string.IsNullOrWhiteSpace(unit))
            return false;

        if (!Policies.TryGetValue(featureName, out var policy))
            return false;

        if (!policy.PhysicalBounds.TryGetValue(unit, out var bounds))
            return false;

        return value >= bounds.Min && value <= bounds.Max;
    }

    public FeatureUnitPolicy? GetPolicy(string featureName)
    {
        if (string.IsNullOrWhiteSpace(featureName))
            return null;

        Policies.TryGetValue(featureName, out var policy);
        return policy;
    }

    public IReadOnlyList<FeatureUnitPolicy> GetAllPolicies()
    {
        return Policies.Values.ToList();
    }
}
