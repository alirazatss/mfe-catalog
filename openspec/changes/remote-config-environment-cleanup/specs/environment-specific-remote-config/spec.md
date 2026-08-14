# environment-specific-remote-config Delta

## MODIFIED Requirements

### Requirement: Shell repo SHALL contain one remote config file per supported environment

The system SHALL maintain `apps/shells/website/config/remotes.config.dev.json` and `apps/shells/website/config/remotes.config.prod.json` in git. Both files SHALL conform to the existing `remote-config-schema`. Neither file SHALL live under `public/` (files in `public/` are copied verbatim into every build output). Neither file SHALL be generated at runtime; both SHALL be committed source.

#### Scenario: Env config files exist outside public and validate against schema

- **WHEN** the repository is inspected
- **THEN** `apps/shells/website/config/remotes.config.dev.json` and `apps/shells/website/config/remotes.config.prod.json` exist
- **AND** both validate against the `remote-config-schema` JSON Schema
- **AND** no file matching `remotes.config*.json` exists under `apps/shells/website/public/`

## ADDED Requirements

### Requirement: Build SHALL emit exactly one manifest selected by DEPLOY_ENV

The shell build SHALL copy `config/remotes.config.${DEPLOY_ENV}.json` (default `dev`) to `dist/remotes.config.json`. The build SHALL fail when the selected env config file does not exist. The build output SHALL NOT contain any other `remotes.config*.json` file.

#### Scenario: Default build emits dev manifest

- **WHEN** `vp build` runs for the shell without `DEPLOY_ENV` set
- **THEN** `dist/remotes.config.json` exists with content identical to `config/remotes.config.dev.json`
- **AND** no other file matching `remotes.config*.json` exists in `dist/`

#### Scenario: Prod build emits prod manifest

- **WHEN** the shell builds with `DEPLOY_ENV=prod`
- **THEN** `dist/remotes.config.json` content is identical to `config/remotes.config.prod.json`

#### Scenario: Unknown environment fails the build

- **WHEN** the shell builds with `DEPLOY_ENV=staging` and `config/remotes.config.staging.json` does not exist
- **THEN** the build exits non-zero
- **AND** the error message names the missing file path

### Requirement: Dev server SHALL serve a gitignored local override manifest when present

The shell dev server SHALL respond to `GET /remotes.config.json` with the content of `apps/shells/website/remotes.config.local.json` when that file exists, and otherwise with the content of `config/remotes.config.dev.json`. The local override file SHALL be ignored by git.

#### Scenario: Local override present

- **GIVEN** `apps/shells/website/remotes.config.local.json` exists
- **WHEN** the dev server receives `GET /remotes.config.json`
- **THEN** the response body is the local file's content
- **AND** the dev server logs that the local override is active

#### Scenario: Local override absent

- **GIVEN** `apps/shells/website/remotes.config.local.json` does not exist
- **WHEN** the dev server receives `GET /remotes.config.json`
- **THEN** the response body is the content of `config/remotes.config.dev.json`

#### Scenario: Local override cannot be committed

- **WHEN** `git check-ignore apps/shells/website/remotes.config.local.json` runs
- **THEN** it exits 0 (the path is ignored)
