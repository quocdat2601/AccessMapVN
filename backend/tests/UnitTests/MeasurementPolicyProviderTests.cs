using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Infrastructure.Services;
using FluentAssertions;
using Npgsql;
using Xunit;

namespace AccessMapVN.UnitTests;

public class MeasurementPolicyProviderTests
{
    private readonly IMeasurementPolicyProvider _policyProvider = new MeasurementPolicyProvider();

    [Theory]
    [InlineData("door_clear_width", "mm", true)]
    [InlineData("door_clear_width", "cm", true)]
    [InlineData("door_clear_width", "percent", false)]
    [InlineData("door_clear_width", "degree", false)]
    [InlineData("ramp_slope", "percent", true)]
    [InlineData("ramp_slope", "degree", false)] // Standardized on percent only in MVP
    [InlineData("ramp_slope", "mm", false)]
    [InlineData("step_height", "mm", true)]
    [InlineData("unknown_feature", "mm", false)]
    public void IsAllowedUnit_EnforcesFeatureUnitMatrix(string feature, string unit, bool expectedValid)
    {
        var isValid = _policyProvider.IsAllowedUnit(feature, unit);
        isValid.Should().Be(expectedValid);
    }

    [Theory]
    [InlineData("door_clear_width", "mm", 900, true)]
    [InlineData("door_clear_width", "mm", 400, false)] // Below 500mm threshold
    [InlineData("door_clear_width", "mm", 3500, false)] // Above 3000mm threshold
    [InlineData("ramp_slope", "percent", 8.33, true)]
    [InlineData("ramp_slope", "percent", 75, false)] // Above 50% physical gradient
    [InlineData("step_height", "cm", 15, true)]
    [InlineData("step_height", "cm", 150, false)] // 1.5m step is physically invalid
    public void IsWithinPhysicalRange_EnforcesQcvn10PhysicalBounds(string feature, string unit, decimal value, bool expectedValid)
    {
        var isValid = _policyProvider.IsWithinPhysicalRange(feature, unit, value);
        isValid.Should().Be(expectedValid);
    }

    [Fact]
    public async Task RealPostgreSql_CompositeFkAndPrivacyConstraints_EnforcedAtDbEngine()
    {
        var connStr = Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING")
                      ?? Environment.GetEnvironmentVariable("ConnectionStrings__SupabaseConnection");

        if (string.IsNullOrWhiteSpace(connStr))
        {
            // Skip real DB test if no connection string is provided in local env
            return;
        }

        await using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();

        var testApId = Guid.NewGuid();
        var testObsId = Guid.NewGuid();
        var testUserId = Guid.NewGuid();

        await using var trans = await conn.BeginTransactionAsync();
        try
        {
            // Seed a temporary access point
            await using (var seedApCmd = conn.CreateCommand())
            {
                seedApCmd.Transaction = trans;
                seedApCmd.CommandText = @"
                    INSERT INTO access_points (id, place_id, name, kind, location_source)
                    SELECT @apId, p.id, 'Test Entrance', 'entrance', 'user_pin'
                    FROM places p LIMIT 1;";
                seedApCmd.Parameters.AddWithValue("apId", testApId);
                await seedApCmd.ExecuteNonQueryAsync();
            }

            // 1. Attempt to insert door_clear_width with percent (must fail composite FK)
            await using (var badUnitCmd = conn.CreateCommand())
            {
                badUnitCmd.Transaction = trans;
                badUnitCmd.CommandText = @"
                    INSERT INTO measurement_observations (id, access_point_id, feature_name, contributor_id, reported_value, unit, method)
                    VALUES (@id, @apId, 'door_clear_width', @userId, 95.5, 'percent', 'tape_measure');";
                badUnitCmd.Parameters.AddWithValue("id", testObsId);
                badUnitCmd.Parameters.AddWithValue("apId", testApId);
                badUnitCmd.Parameters.AddWithValue("userId", testUserId);

                Func<Task> actBadUnit = async () => await badUnitCmd.ExecuteNonQueryAsync();
                await actBadUnit.Should().ThrowAsync<PostgresException>()
                    .Where(e => e.SqlState == "23503" /* foreign_key_violation */);
            }

            // 2. Attempt to insert evidence with invalid privacy_status (must fail CHECK constraint)
            await using (var badPrivacyCmd = conn.CreateCommand())
            {
                badPrivacyCmd.Transaction = trans;
                badPrivacyCmd.CommandText = @"
                    INSERT INTO measurement_evidence (observation_id, media_url, media_kind, privacy_status)
                    VALUES (@obsId, 'https://example.com/photo.jpg', 'photo', 'invalid_privacy_status');";
                badPrivacyCmd.Parameters.AddWithValue("obsId", testObsId);

                Func<Task> actBadPrivacy = async () => await badPrivacyCmd.ExecuteNonQueryAsync();
                await actBadPrivacy.Should().ThrowAsync<PostgresException>()
                    .Where(e => e.SqlState == "23514" /* check_violation */);
            }

            // 3. Insert valid observation, then attempt to delete parent access point (must fail ON DELETE RESTRICT)
            var validObsId = Guid.NewGuid();
            await using (var validObsCmd = conn.CreateCommand())
            {
                validObsCmd.Transaction = trans;
                validObsCmd.CommandText = @"
                    INSERT INTO measurement_observations (id, access_point_id, feature_name, contributor_id, reported_value, unit, method)
                    VALUES (@id, @apId, 'door_clear_width', @userId, 900.0, 'mm', 'tape_measure');";
                validObsCmd.Parameters.AddWithValue("id", validObsId);
                validObsCmd.Parameters.AddWithValue("apId", testApId);
                validObsCmd.Parameters.AddWithValue("userId", testUserId);
                await validObsCmd.ExecuteNonQueryAsync();
            }

            await using (var delApCmd = conn.CreateCommand())
            {
                delApCmd.Transaction = trans;
                delApCmd.CommandText = "DELETE FROM access_points WHERE id = @apId;";
                delApCmd.Parameters.AddWithValue("apId", testApId);

                Func<Task> actDelAp = async () => await delApCmd.ExecuteNonQueryAsync();
                await actDelAp.Should().ThrowAsync<PostgresException>()
                    .Where(e => e.SqlState == "23503" /* foreign_key_violation due to ON DELETE RESTRICT */);
            }
        }
        finally
        {
            await trans.RollbackAsync(); // Keep DB clean
        }
    }
}
