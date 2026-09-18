# AccessMapVN Mobile

This directory contains the Expo React Native application for discovering and contributing
accessibility information about places in Vietnam. It is currently a minimal foundation with one
home screen and no backend, map, authentication, camera, or contribution flow yet.

This guide explains where code belongs so multiple frontend developers can work consistently.

## Tech stack

- Expo SDK 57 and Expo Go
- React Native 0.86 and React 19
- TypeScript in strict mode
- Expo Router for file-based navigation
- npm for dependency management

The future backend is a separate service under `../backend`. The mobile app will communicate with
it through HTTP APIs rather than importing backend source code.

## Install and run

Requirements: Node.js 22.13 or newer, npm, and Expo Go on a mobile device.

From the repository root:

```bash
cd mobile
npm install
npm start
```

Connect the computer and phone to the same network, then scan the QR code with Expo Go.

Other available commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit
```

## Project structure

All paths in this guide are relative to `mobile/` unless stated otherwise.

Only create a folder when it has a real file. The tree below is the intended structure, not a
request to create every folder in advance.

```text
src/
  app/                              Expo Router routes and layouts only
  features/
    home/                           Existing minimal feature
      index.ts                      Public feature exports
      presentation/
        screens/HomeScreen.tsx
    <feature>/                      Add feature folders when needed
      index.ts                      Public exports and dependency wiring
      presentation/
        screens/                    Route-level UI
        components/                 UI used only by this feature
        hooks/                      Feature UI state and orchestration
      domain/
        models/                     Business entities and value types
        repositories/               Backend-independent interfaces
        use-cases/                  Business operations
      data/
        api/                        Calls to this feature's endpoints
        dto/                        API request and response shapes
        mappers/                    DTO-to-domain conversion
        repositories/               Repository implementations
  shared/                           Code reused by multiple features
    ui/                             Business-agnostic UI components
    hooks/                          Reusable hooks
    utils/                          Pure general-purpose helpers
    constants/                      App-wide constants
    types/                          Truly cross-cutting types
    theme/                          Colors, spacing, and typography
  infrastructure/
    api/                            Shared HTTP client and API configuration
assets/
  images/                           App and feature images
  icons/                            Shared static icons, when needed
  fonts/                            Custom fonts, when needed
```

Do not use `shared` as a miscellaneous folder. Code belongs there only after it is genuinely
reused or is clearly app-wide. Do not create `infrastructure/api` until backend integration begins.

## Feature boundaries

Each feature owns one user-facing capability:

- `map`: map screen, markers, and map-specific presentation behavior.
- `location-details`: accessible-location details and related business rules.
- `contribution`: the WF1 contribution form and submission workflow.
- `submissions`: contribution status and submission history.
- `auth`: sign-in, sign-out, and session contracts.
- `profile`: viewing and editing the user's profile.

Keep `auth` and `profile` separate: session lifecycle and profile management are different
responsibilities. A feature does not need all three layers. A static screen may have only
`presentation`; add `domain` or `data` only when the feature needs them.

### Presentation

Presentation contains screens, feature-only components, and UI hooks. It may display domain
models and call use cases. It must not call `fetch`, know endpoint paths, or use API DTOs.

### Domain

Domain contains business models, repository contracts, and use cases. It is plain TypeScript and
must not depend on React, React Native, Expo, HTTP, storage, or backend response formats.

### Data

Data communicates with external sources. It owns endpoint functions, request/response DTOs,
mappers, and repository implementations. Convert backend DTOs into domain models before returning
data to the presentation layer.

### Feature entry point

`features/<feature>/index.ts` is the feature's public boundary. It exports route-facing screens and
the small set of types or operations other features are allowed to use. It may wire domain
interfaces to data implementations when integration exists. Do not put business logic there.

## Where should new code go?

| Code | Location |
| --- | --- |
| Expo route or navigation layout | `src/app` |
| Route-level feature screen | `features/<feature>/presentation/screens` |
| Component used by one feature | `features/<feature>/presentation/components` |
| UI hook used by one feature | `features/<feature>/presentation/hooks` |
| Business model, rule, or use case | `features/<feature>/domain` |
| Repository interface | `features/<feature>/domain/repositories` |
| Endpoint call, API DTO, or DTO mapper | `features/<feature>/data` |
| Shared HTTP setup | `src/infrastructure/api` |
| Reusable business-agnostic component | `src/shared/ui` |
| Reusable hook or utility | `src/shared/hooks` or `src/shared/utils` |
| App-wide type, constant, or design token | matching folder under `src/shared` |
| Static image, icon, or font | matching folder under `assets` |

## Dependency rules

Dependencies point toward the domain:

```text
app -> feature public entry point
feature index -> presentation + domain + data
presentation -> domain + shared
data -> domain + infrastructure + non-UI shared code
infrastructure -> shared
domain -> plain TypeScript only
```

Additional rules:

- `app` contains routing only. It may read route parameters and render a feature entry point.
- `shared` and `infrastructure` never import from `features` or `app`.
- `domain` never imports from `presentation`, `data`, `infrastructure`, React Native, or Expo.
- Do not deep-import another feature. Import only from `@/features/<feature>`.
- Do not call APIs from screens or presentation hooks.
- If two features need one concept, keep a clear owning feature and export it publicly. Move it to
  `shared` only when it is truly business-agnostic.

The aliases `@/*` and `@/assets/*` are configured in `tsconfig.json`. Prefer imports such as:

```ts
import { HomeScreen } from '@/features/home';
```

## Naming conventions

- Feature folders and route segments: kebab-case, for example `location-details`.
- React components, screens, and domain models: PascalCase, for example `LocationCard.tsx`.
- Hooks: `use` plus PascalCase, for example `useSubmissionHistory.ts`.
- Utilities and use cases: camelCase verb names, for example `formatAddress.ts` or
  `getLocationDetails.ts`.
- API modules: descriptive camelCase names, for example `locationApi.ts`.
- DTO types: PascalCase with a `Dto` suffix, for example `LocationResponseDto`.
- Constants: `UPPER_SNAKE_CASE` for fixed values.
- Tests: colocate `*.test.ts` or `*.test.tsx` beside the code they test.

## Adding a feature

1. Create `src/features/<feature>` and only the subfolders needed now.
2. Define domain models, repository interfaces, and use cases if there are business rules.
3. If the backend is involved, add feature endpoint calls, DTOs, mappers, and repository
   implementations under `data`.
4. Build screens and feature-only UI under `presentation`.
5. Export the route-facing screen from the feature's `index.ts`.
6. Add a thin Expo Router file that imports only the public feature entry point:

```ts
export { MapScreen as default } from '@/features/map';
```

7. Add or update tests when test tooling is available, then run TypeScript and Expo checks.

## Frontend and backend boundary

- The backend team owns endpoint behavior and the agreed API contract.
- The frontend feature's `data` layer owns endpoint calls, DTOs, and mapping into domain models.
- A future `infrastructure/api` module will use the built-in `fetch` API for the base URL, common
  headers, JSON handling, and shared network errors. Add a library only if the team agrees it is
  necessary.
- The base URL will come from `EXPO_PUBLIC_API_URL` when a backend exists. Values with the
  `EXPO_PUBLIC_` prefix are visible in the app and must never contain secrets.
- Do not make screens match raw backend responses. Update the DTO and mapper when an API response
  changes, while keeping domain and UI types stable where possible.
- Agree on request fields, response fields, status codes, and error shapes before implementing an
  endpoint. Record breaking contract changes in the related ticket or pull request.

## Tests

No test framework is configured yet. Do not add empty test folders or a testing dependency for a
feature that has no tests. When the team selects a test runner, colocate unit and component tests
with their source files. Add a root `e2e` folder only if end-to-end testing is introduced.

## Team workflow

- Use one ticket and one focused branch per change, such as `feature/wf1-form`.
- Keep pull requests small and avoid unrelated refactoring or formatting.
- Pull the latest target branch before starting and before opening a pull request.
- Coordinate before changing shared code, route layouts, dependencies, or `package-lock.json`.
- Prefer feature-local code until reuse is proven; shared changes affect the whole team.
- Discuss new dependencies first. Use `npx expo install <package>` for Expo-compatible packages.
- Never commit secrets, private keys, production credentials, or personal `.env` files.
- Coordinate API contract changes with the backend team before merging frontend code that depends
  on them.
- Run `npx tsc --noEmit` and confirm Expo starts before requesting review.
