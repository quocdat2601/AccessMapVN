using AccessMapVN.Application;
using AccessMapVN.Application.Common.Interfaces;
using AccessMapVN.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AccessMapVN.UnitTests;

public class DependencyInjectionTests
{
    [Fact]
    public void AddApplicationServices_RegistersServicesSuccessfully()
    {
        var services = new ServiceCollection();

        services.AddApplicationServices();

        services.Should().NotBeEmpty();
    }

    [Fact]
    public void AddInfrastructureServices_RegistersServicesSuccessfully()
    {
        var initialData = new Dictionary<string, string?>
        {
            ["ConnectionStrings:SupabaseConnection"] = "Host=localhost;Database=postgres;Username=postgres;Password=test"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(initialData).Build();
        var services = new ServiceCollection();

        services.AddInfrastructureServices(configuration);

        services.Any(sd => sd.ServiceType == typeof(IApplicationDbContext)).Should().BeTrue();
    }
}
