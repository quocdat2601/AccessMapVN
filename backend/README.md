# AccessMapVN Backend

ASP.NET Core Web API backend implementing Clean Architecture for AccessMapVN (.NET 8).

## Solution Structure

```text
backend/
├── AccessMapVN.sln
├── src/
│   ├── Domain/
│   │   ├── Common/
│   │   ├── Entities/
│   │   ├── Enums/
│   │   └── Exceptions/
│   ├── Application/
│   │   ├── Common/
│   │   │   ├── Behaviors/
│   │   │   └── Interfaces/
│   │   └── Features/
│   │       ├── Places/Queries/
│   │       └── Surveys/
│   │           ├── Commands/SubmitSurvey/
│   │           └── Queries/
│   ├── Infrastructure/
│   │   ├── Persistence/Configurations/
│   │   └── Services/
│   └── WebApi/
│       ├── Controllers/
│       └── Middlewares/
└── tests/
    └── UnitTests/
```

## Dependency Rules

- **Domain**: Zero external dependencies. Houses core enterprise entities and rules.
- **Application**: Depends only on Domain. Orchestrates use cases via MediatR and FluentValidation.
- **Infrastructure**: Depends on Application and Domain. Implements data persistence (EF Core with PostgreSQL) and external integrations.
- **WebApi**: Entry point. Depends on Application and Infrastructure for dependency registration and exposes HTTP controllers.
- **UnitTests**: References all projects to provide isolated unit and architecture verification.

## Build and Run

From the `backend/` directory:

```bash
# Restore dependencies
dotnet restore

# Build solution
dotnet build

# Run unit tests
dotnet test

# Run WebApi
dotnet run --project src/WebApi/AccessMapVN.WebApi.csproj
```
