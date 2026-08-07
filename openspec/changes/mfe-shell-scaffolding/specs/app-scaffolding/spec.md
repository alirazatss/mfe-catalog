# app-scaffolding Delta

## ADDED Requirements

### Requirement: An MFE generator SHALL scaffold a conformant MFE from the shared template

The system SHALL provide a `turbo gen mfe` generator that, given an MFE short name, creates `apps/mfes/mfe-<name>/` from a maintained template. The scaffolded MFE SHALL conform to platform conventions: package name `@mfe-runtime/mfe-<name>`, lifecycle exports `bootstrap`/`mount`/`unmount` in `src/bootstrap.ts`, a standalone dev entry (`index.html` + `src/main.ts`), vite config with Module Federation, vitest config with the shared coverage thresholds, strict tsconfig, and a passing starter test. The generator SHALL reject names that do not match `^[a-z][a-z0-9-]*$` or that collide with an existing app.

#### Scenario: Scaffolded MFE builds and tests green immediately

- **WHEN** `turbo gen mfe` is run with name `orders`
- **THEN** `apps/mfes/mfe-orders/` exists with the template file set
- **AND** `pnpm turbo run build test typecheck --filter=@mfe-runtime/mfe-orders` succeeds without any manual edit

#### Scenario: Scaffolded MFE satisfies the lifecycle contract

- **WHEN** the scaffolded MFE's `remoteEntry` module is imported
- **THEN** it exports `bootstrap`, `mount`, and `unmount` functions conforming to the `mfe-lifecycle-contract` spec

#### Scenario: Invalid or duplicate name is rejected

- **WHEN** `turbo gen mfe` is run with name `Widget!` or with the name of an existing MFE
- **THEN** the generator exits with a validation error before creating any file

### Requirement: The MFE generator SHALL assign the next free dev-server port

The generator SHALL determine the dev-server port by scanning existing MFEs via the monorepo-tools discovery logic and assigning the lowest unused port at or above 5174, writing it consistently into the scaffolded `vite.config.ts` (`server.port`, `server.origin`, `preview.port`).

#### Scenario: Port does not collide with existing MFEs

- **GIVEN** existing MFEs occupy ports 5174 and 5175
- **WHEN** a new MFE is scaffolded
- **THEN** its vite config uses port 5176 in `server.port`, `server.origin`, and `preview.port`
- **AND** `discoverMicroFrontends()` reports the same port for the new MFE

### Requirement: The MFE generator SHALL auto-wire all MFE registration points

After scaffolding, the generator SHALL register the new MFE everywhere the platform requires: an entry (URL, scope, base path, version) in `remotes.config.dev.json` and `remotes.config.prod.json` of every shell under `apps/shells/*`, and the MFE fallback list in `.github/workflows/cleanup-previews.yml`. Generated list sections in YAML SHALL be delimited by marker comments so patching is idempotent. The generator SHALL finish by printing a summary of every file created or modified and any remaining manual steps.

#### Scenario: Shell configs gain the new MFE entry

- **GIVEN** shells `website` and `ccis` exist
- **WHEN** MFE `orders` is scaffolded
- **THEN** all four `remotes.config.{dev,prod}.json` files contain an `mfe-orders` entry with the dev localhost URL (dev) and the prod blob URL pattern (prod)
- **AND** each patched config still validates against the manifest schema

#### Scenario: Cleanup fallback list includes the new MFE

- **WHEN** MFE `orders` is scaffolded
- **THEN** the MFE fallback list in `cleanup-previews.yml` contains `mfe-orders`
- **AND** running the generator twice does not duplicate the entry

#### Scenario: Run summary reports all touched files

- **WHEN** the generator completes
- **THEN** stdout lists every created and modified file path and any manual follow-ups

### Requirement: A shell generator SHALL scaffold a conformant shell and its caller workflow

The system SHALL provide a `turbo gen shell` generator that, given a shell name, creates `apps/shells/<name>/` from a maintained template matching the thin-shell anatomy (no Module Federation; shell-runtime boot in `src/main.ts`; slot layout; `public/app-config.json`, `remotes.config.dev.json`, `remotes.config.prod.json` pre-populated with all discovered MFEs; `generate:config` and `check:size` package scripts) AND a thin caller workflow `.github/workflows/deploy-<name>.yml` invoking the reusable `deploy-shell.yml` with `shell-name`, `shell-path`, `package-name`, and `tag-prefix: <name>-v`, including `main`, `release-*`, and `<name>-v*` tag triggers with path filters scoped to the shell and its shared packages. The generator SHALL also add the shell to the shell fallback list in `cleanup-previews.yml`.

#### Scenario: Scaffolded shell builds within budget

- **WHEN** `turbo gen shell` is run with name `ccis`
- **THEN** `apps/shells/ccis/` exists and `pnpm turbo run build test typecheck --filter=ccis` succeeds
- **AND** `check-shell-size.ts ccis` passes

#### Scenario: Caller workflow conforms to the thin-caller contract

- **WHEN** the shell `ccis` is scaffolded
- **THEN** `.github/workflows/deploy-ccis.yml` exists, passes actionlint/YAML parsing, and calls `deploy-shell.yml` with `shell-name: ccis` and `tag-prefix: ccis-v`
- **AND** its triggers include `main`, `release-*`, and tags `ccis-v*` with path filters covering `apps/shells/ccis/**`

#### Scenario: New shell is deployable without manual edits

- **GIVEN** a scaffolded shell is committed and pushed to `main`
- **WHEN** the caller workflow runs
- **THEN** the shell deploys to `dev-shell/<name>/` using only generator-produced files

### Requirement: A CI drift guard SHALL prove the templates stay scaffoldable

The system SHALL provide a CI workflow that runs when `turbo/generators/**` (or the workflow itself) changes: it scaffolds a throwaway MFE and a throwaway shell in the checkout, runs install, typecheck, build, and tests for both, and fails if any step fails. Throwaway apps SHALL NOT be committed or deployed.

#### Scenario: Template regression is caught in CI

- **GIVEN** a PR edits an MFE template file introducing a type error
- **WHEN** the drift guard workflow runs
- **THEN** the job fails at the typecheck step for the throwaway MFE

#### Scenario: Guard runs only on relevant changes

- **WHEN** a PR touches only `apps/mfes/mfe-widget/**`
- **THEN** the drift guard workflow does not run
