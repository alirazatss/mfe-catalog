# config-generation Delta

## MODIFIED Requirements

### Requirement: Support environment-specific URL generation

The system SHALL generate different entry URLs based on environment. The localhost-URL mode SHALL be named `local` (renamed from `development`); `development` SHALL be rejected with an error directing the caller to `local`, so the mode name cannot be confused with the deployed `dev` environment.

#### Scenario: Local URLs use localhost

- **WHEN** environment is "local" and MicroFrontend has port 5174
- **THEN** entryUrl is `http://localhost:5174/remoteEntry.js`

#### Scenario: Development URLs use localhost

- **WHEN** environment is "development" and MicroFrontend has port 5174
- **THEN** generateConfig throws an error (mode superseded)
- **AND** the error message states that the mode was renamed to "local"

#### Scenario: Production URLs use base URL and versioning

- **WHEN** environment is "production" with baseUrl "https://cdn.example.com" and gitHash "abc123"
- **THEN** entryUrl is `https://cdn.example.com/mfe-{name}/vabc123/remoteEntry.js`

#### Scenario: Production defaults to latest when no git hash

- **WHEN** environment is "production" without gitHash
- **THEN** entryUrl includes `/vlatest/`

## ADDED Requirements

### Requirement: Generator SHALL honor the shell's root MFE designation

The system SHALL accept a root MFE designation from the shell's configuration. The designated MFE's route key SHALL be `"/"`; all other MFEs SHALL keep their default base paths. When no root MFE is designated, all MFEs SHALL use their default base paths.

#### Scenario: Designated root MFE maps to "/"

- **WHEN** generateConfig runs with rootMfe "mfe-landing-page" and MFEs "mfe-landing-page" (basePath "/landing-page") and "mfe-widget" (basePath "/widget")
- **THEN** the generated config maps route `"/"` to mfe-landing-page
- **AND** maps route `"/widget"` to mfe-widget
- **AND** no route key `"/landing-page"` exists

#### Scenario: Unknown root MFE designation fails

- **WHEN** generateConfig runs with rootMfe "mfe-missing" and no discovered MFE named "mfe-missing"
- **THEN** it throws an error naming the unknown MFE

### Requirement: Generator SHALL produce the local override manifest

The system SHALL provide a documented command that writes a schema-valid `remotes.config.local.json` (environment `local`, localhost URLs from the local port map) to the shell directory, and SHALL support a dry-run mode that prints the config without writing.

#### Scenario: Local override file generated

- **WHEN** the generate command runs with `--environment local` targeting the website shell
- **THEN** `apps/shells/website/remotes.config.local.json` is written
- **AND** its content validates against the `remote-config-schema` JSON Schema
- **AND** every entryUrl uses `http://localhost:{port}` with ports from the local port map

#### Scenario: Dry run writes nothing

- **WHEN** the generate command runs with `--environment local --dry-run`
- **THEN** the resulting config is printed to stdout
- **AND** no file is created or modified
