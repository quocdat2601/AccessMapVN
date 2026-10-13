namespace AccessMapVN.Application.Common.Utils;

public record GeofenceEvaluationResult
{
    public string Policy { get; init; } = "category_fallback";
    public double AllowedRadiusMeters { get; init; } = 50.0;
    public double DistanceMeters { get; init; }
    public double EffectiveDistanceMeters { get; init; }
    public double MaxAllowedAccuracyMargin { get; init; } = 25.0;
    public bool IsPlausible { get; init; }
}

public static class GeofencePolicy
{
    public static double GetCategoryFallbackRadius(string? category)
    {
        var cat = (category ?? string.Empty).Trim().ToLowerInvariant();
        return cat switch
        {
            "hospital" or "university" or "school" or "mall" or "park" or "stadium" or "campus" => 250.0,
            "museum" or "cinema" or "office" or "government" or "station" => 100.0,
            _ => 50.0,
        };
    }

    public static GeofenceEvaluationResult Evaluate(
        double userLat,
        double userLng,
        double? accuracyMeters,
        double placeLat,
        double placeLng,
        double? entranceLat,
        double? entranceLng,
        double? customRadiusMeters,
        string? category)
    {
        // 1. Tầng Entrance: Đo tới cổng vào nếu có
        if (entranceLat.HasValue && entranceLng.HasValue)
        {
            var distToEntrance = GeoUtils.CalculateDistanceInMeters(userLat, userLng, entranceLat.Value, entranceLng.Value);
            var maxMargin = 20.0; // Margin tối đa 20m khi đo tới cổng
            var accuracyMargin = (accuracyMeters.HasValue && accuracyMeters.Value <= 50.0)
                ? Math.Min(maxMargin, Math.Max(0.0, accuracyMeters.Value))
                : 0.0;
            var effectiveDist = Math.Max(0.0, distToEntrance - accuracyMargin);
            var allowedRadius = 50.0;

            return new GeofenceEvaluationResult
            {
                Policy = "entrance",
                AllowedRadiusMeters = allowedRadius,
                DistanceMeters = distToEntrance,
                EffectiveDistanceMeters = effectiveDist,
                MaxAllowedAccuracyMargin = maxMargin,
                IsPlausible = effectiveDist <= allowedRadius,
            };
        }

        // 2. Tầng Fallback: Đo tới tâm POI (custom radius hoặc category fallback)
        var distToCentroid = GeoUtils.CalculateDistanceInMeters(userLat, userLng, placeLat, placeLng);
        string policy;
        double centroidAllowedRadius;

        if (customRadiusMeters.HasValue && customRadiusMeters.Value > 0)
        {
            policy = "custom_radius";
            centroidAllowedRadius = customRadiusMeters.Value;
        }
        else
        {
            policy = "category_fallback";
            centroidAllowedRadius = GetCategoryFallbackRadius(category);
        }

        var centroidMaxMargin = 25.0; // Margin tối đa 25m cho centroid fallback
        var centroidAccuracyMargin = (accuracyMeters.HasValue && accuracyMeters.Value <= 50.0)
            ? Math.Min(centroidMaxMargin, Math.Max(0.0, accuracyMeters.Value))
            : 0.0;
        var centroidEffectiveDist = Math.Max(0.0, distToCentroid - centroidAccuracyMargin);

        return new GeofenceEvaluationResult
        {
            Policy = policy,
            AllowedRadiusMeters = centroidAllowedRadius,
            DistanceMeters = distToCentroid,
            EffectiveDistanceMeters = centroidEffectiveDist,
            MaxAllowedAccuracyMargin = centroidMaxMargin,
            IsPlausible = centroidEffectiveDist <= centroidAllowedRadius,
        };
    }
}
