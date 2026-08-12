# multi-shell-tooling Specification

## Purpose

This specification defines shell-agnostic monorepo tooling: config generation, size checks, script assertions, and E2E configuration that operate on any shell under `apps/shells/*` instead of hardcoding the `website` shell. It complements `reusable-shell-deploy-workflow` by ensuring build/dev tooling (not just CI/CD) scales to multiple shells.

## Requirements

### Requirement: Config generation SHALL operate per shell

The system SHALL generate `remotes.config.json` into each shell's `public/` directory. The Turborepo `generate:config` task outputs SHALL match every shell (`apps/shells/*/public/remotes.config.json`) rather than a single hardcoded shell path, and `scripts/generate-config.ts` SHALL accept the target shell (via argument or invocation from the shell's own `prebuild`) instead of assuming `website`.

#### Scenario: Config generation writes to the invoking shell

- **GIVEN** shells `website` and `ccis` each define a `prebuild` that runs config generation
- **WHEN** `ccis` is built
- **THEN** `apps/shells/ccis/public/remotes.config.json` is generated
- **AND** `apps/shells/website/public/remotes.config.json` is not modified by that build

#### Scenario: Turborepo caches per-shell config outputs correctly

- **WHEN** `turbo build` runs for any shell
- **THEN** the declared `generate:config` outputs cover that shell's generated config file
- **AND** cache restoration reproduces the config for the correct shell

### Requirement: Shell validation scripts SHALL accept a shell parameter

The system SHALL parameterize shell-coupled scripts (`check-shell-size.ts`, `assert-package-test-scripts.ts`, `test-integration.ts`, `validate-app-config.ts`) so each accepts an explicit shell name or path, defaulting to iterating all directories under `apps/shells/*`. No script SHALL hardcode the literal shell name `website` as its only target.

#### Scenario: Size check runs against a named shell

- **WHEN** the size check script is invoked with shell `ccis`
- **THEN** it measures `apps/shells/ccis/dist` against the size budget
- **AND** exits non-zero if the budget is exceeded

#### Scenario: Scripts default to all shells

- **GIVEN** `apps/shells/` contains `website` and `ccis`
- **WHEN** a parameterized validation script is invoked with no shell argument
- **THEN** it validates both shells
- **AND** fails if any shell fails validation

### Requirement: E2E configuration SHALL select the shell under test via environment variable

The system SHALL parameterize the Playwright configuration so the shell directory used by `webServer` commands is resolved from an environment variable (e.g., `E2E_SHELL_DIR`), defaulting to the current `website` shell path when unset.

#### Scenario: E2E suite runs against a different shell

- **WHEN** the E2E suite is invoked with `E2E_SHELL_DIR=apps/shells/ccis`
- **THEN** the Playwright web server starts the `ccis` shell
- **AND** no configuration file edit is required

#### Scenario: Default remains the website shell

- **WHEN** the E2E suite is invoked without `E2E_SHELL_DIR`
- **THEN** the Playwright web server starts the `website` shell as before
