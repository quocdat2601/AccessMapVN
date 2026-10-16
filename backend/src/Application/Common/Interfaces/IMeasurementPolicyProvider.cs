namespace AccessMapVN.Application.Common.Interfaces;

public record FeatureUnitPolicy(
    string FeatureName,
    IReadOnlyList<string> AllowedUnits,
    IReadOnlyDictionary<string, (decimal Min, decimal Max)> PhysicalBounds
);

public interface IMeasurementPolicyProvider
{
    bool IsAllowedUnit(string featureName, string unit);
    bool IsWithinPhysicalRange(string featureName, string unit, decimal value);
    FeatureUnitPolicy? GetPolicy(string featureName);
    IReadOnlyList<FeatureUnitPolicy> GetAllPolicies();
}
