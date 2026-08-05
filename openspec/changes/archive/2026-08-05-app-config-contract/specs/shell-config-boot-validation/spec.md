## ADDED Requirements

### Requirement: Shell bootstrap loads and validates app config before starting the runtime

The website shell SHALL fetch `/app-config.json` during bootstrap and validate it with `parseAppConfig` (the Zod schema baked into the bundle) before initializing the shell runtime. The validated `AppConfig` SHALL be the only source of runtime app configuration for the shell.

#### Scenario: Valid config boots the shell

- **WHEN** `/app-config.json` returns a document valid for the bundled schema
- **THEN** the shell runtime starts and the parsed config values are used (e.g., auth endpoints come from the config, not hardcoded constants)

#### Scenario: Invalid config renders a configuration error screen

- **WHEN** `/app-config.json` returns JSON that fails schema validation (missing key, wrong `schemaVersion`, malformed URL)
- **THEN** the shell renders an explicit configuration-error screen naming the violating fields, and does not attempt to mount MFEs

### Requirement: Development fallback config

In development mode, when `/app-config.json` is unreachable, the shell SHALL fall back to a built-in default config (mirroring the `FALLBACK_REMOTES` pattern) and log a console warning. In production builds, an unreachable config SHALL render the configuration-error screen instead of silently falling back.

#### Scenario: Dev fallback on missing file

- **WHEN** the shell runs in dev mode and the config fetch fails
- **THEN** the built-in fallback config is used, a warning is logged, and the shell boots normally

#### Scenario: Production refuses to boot without config

- **WHEN** a production build's config fetch fails or returns non-OK
- **THEN** the configuration-error screen is rendered and no fallback is applied

### Requirement: Served app config document exists and is valid

The website shell SHALL serve an `app-config.json` document (from its public directory in the MVP) that validates against the current schema.

#### Scenario: Repo config document is schema-valid

- **WHEN** the repo's `apps/shells/website/public/app-config.json` is validated against the generated `app-config.schema.json`
- **THEN** validation passes
