## Why

Each deployable Shell currently implements its own startup sequencing, MFE lifecycle coordination, route activation, navigation handling, and cleanup. Extracting those behaviors into an independent runtime will keep Shells thin, make orchestration consistent, and allow fixes to be delivered through a versioned shared package without coupling consumers to one Shell's authentication, layout, or presentation choices.

## What Changes

- Add a reusable `@mfe-runtine/shell-runtime` package that coordinates manifest loading, authentication initialization, Chrome MFE mounting, route-based Feature MFE activation, and runtime teardown.
- Define provider-independent adapter contracts for authentication, manifest acquisition, navigation, slot resolution, failure presentation, and observability.
- Require MFEs managed by the runtime to expose the standard lifecycle contract; direct React component mounting is not supported.
- Define restartable `start` and `stop` behavior, permanent `dispose` behavior, slot-level failure isolation, and latest-route-wins transition semantics.
- Migrate the website Shell to consume the runtime while retaining ownership of its layout, fallback manifest policy, branding, and rendered error UI.
- Add focused contract, concurrency, failure, lifecycle, and Shell integration tests.

## Capabilities

### New Capabilities

- `shell-runtime`: Reusable, adapter-driven browser orchestration for manifest-configured Chrome and Feature MFEs across independent Shell applications.

### Modified Capabilities

None.

## Impact

- Adds a new workspace package and public TypeScript API under `packages/shell-runtime`.
- Refactors `apps/shells/website` to configure the shared runtime instead of owning orchestration logic.
- Reuses `@mfe-runtine/dynamic-loader`, `@mfe-runtine/remote-config`, and the accepted MFE lifecycle contract without changing their requirements.
- Requires consuming MFEs to expose lifecycle modules and consuming Shells to provide the required adapters.
- Affects package build, type-check, unit-test, and website integration-test configuration; package publication remains outside this change.
