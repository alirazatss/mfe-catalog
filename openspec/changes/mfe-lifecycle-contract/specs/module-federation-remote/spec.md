## MODIFIED Requirements

### Requirement: Remote application SHALL expose components as federated modules

The remote application SHALL expose a `./lifecycle` module as its primary Module Federation entry point. The `./lifecycle` module SHALL implement the `MFELifecycle` contract from `@mfe-runtine/dynamic-loader`. Remotes MAY additionally expose framework-specific artefacts (e.g., `./App` React component) for testing or ad-hoc usage.

**(Previously: Remotes exposed React components directly via `./App`, and hosts imported them with `React.lazy`)**

**Reason for change**: Aligning remotes with the MFE lifecycle contract (ADR-0007) makes them mountable by any lifecycle-aware loader, not just React-plus-Suspense hosts. It also enables chrome-style persistent mounts, controlled unmounts, and prop updates.

#### Scenario: Remote application builds successfully

- **WHEN** running the build command for the remote application
- **THEN** the system SHALL generate a `remoteEntry.js` file
- **AND** the build output SHALL include the `./lifecycle` module and any additional exposes declared in vite config
- **AND** the build SHALL complete without errors

#### Scenario: Remote exposes lifecycle module

- **GIVEN** the remote's `vite.config.ts` declares `exposes: { './lifecycle': './src/index.tsx' }`
- **WHEN** the host loader dynamically imports `./lifecycle` from the remote
- **THEN** the imported module SHALL provide `bootstrap`, `mount`, `unmount` as top-level named exports OR as properties of the default export
- **AND** the loader validation SHALL succeed

#### Scenario: Remote optionally exposes framework artefacts

- **GIVEN** the remote's `vite.config.ts` declares an additional exposure `'./App': './src/App.tsx'`
- **WHEN** the build completes
- **THEN** both `./lifecycle` and `./App` SHALL be reachable via Module Federation
- **AND** consumers MAY import `./App` directly for testing without triggering the lifecycle

#### Scenario: Remote application runs independently

- **WHEN** starting the remote application in standalone mode (`pnpm dev` inside the MFE package)
- **THEN** the application SHALL start on its configured port
- **AND** a local demo page SHALL invoke the lifecycle wrapper against a container element to visualize the MFE
- **AND** the `remoteEntry.js` SHALL be accessible via HTTP

#### Scenario: Missing lifecycle exports fail the build

- **GIVEN** an MFE fails to export `bootstrap`, `mount`, or `unmount` from its lifecycle module
- **WHEN** the loader attempts to load the remote in production
- **THEN** the loader SHALL raise a validation error
- **AND** the MFE SHOULD have caught the mistake at build time via a workspace lint/type check (recommended: run a strict TypeScript check on `src/index.tsx`)
