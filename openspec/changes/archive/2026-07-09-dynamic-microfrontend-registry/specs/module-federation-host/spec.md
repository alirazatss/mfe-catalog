# module-federation-host Specification (Delta)

## MODIFIED Requirements

### Requirement: Host application SHALL load federated modules

The host application SHALL dynamically load remote federated modules at runtime using configuration from JSON files instead of build-time static configuration.

**(Previously: The host application SHALL be configured to dynamically load remote federated modules at runtime.)**

**Reason for change**: Enable adding/updating remotes without rebuilding the host application by using runtime JSON configuration.

#### Scenario: Host application loads successfully

- **WHEN** the host application starts in development mode
- **THEN** the application SHALL start without errors
- **AND** the Module Federation plugin SHALL be initialized
- **AND** the dynamic loader SHALL fetch and validate remote configuration from JSON file

#### Scenario: Remote module loaded from JSON config

- **WHEN** the host application requests a federated remote module
- **THEN** the system SHALL look up the remote in loaded JSON configuration
- **AND** the system SHALL fetch the remote entry from the configured URL
- **AND** the module SHALL load without blocking the main application

**(Previously: Scenario "Remote module loaded at runtime" did not specify config source)**

#### Scenario: Remote module fails to load

- **WHEN** a federated remote module fails to load (network error or module not found)
- **THEN** the system SHALL display an error boundary fallback UI
- **AND** the error SHALL be logged to the console
- **AND** the rest of the host application SHALL continue to function

#### Scenario: Config file unavailable falls back to static config

- **WHEN** JSON config file fails to load or is invalid
- **THEN** the system SHALL fall back to static configuration from vite.config.ts
- **AND** the system SHALL emit warning event about fallback
- **AND** the system SHALL log fallback reason to console

**(New scenario for backward compatibility)**

## ADDED Requirements

### Requirement: Host SHALL load remote configuration at runtime

The host application SHALL fetch remote configurations from JSON files deployed as static assets.

#### Scenario: Config loaded on application init

- **WHEN** the host application initializes
- **THEN** the dynamic loader SHALL fetch `/remotes.config.json` (or environment-specific variant)
- **AND** the loader SHALL parse and validate the JSON
- **AND** validated config SHALL be cached for subsequent remote loads

#### Scenario: Environment-specific config preferred

- **WHEN** application runs in development environment
- **THEN** the loader SHALL attempt `/remotes.config.dev.json` first
- **AND** if not found, the loader SHALL fall back to `/remotes.config.json`

#### Scenario: Invalid config logged and ignored

- **WHEN** fetched config fails validation
- **THEN** the loader SHALL log validation errors to console
- **AND** the loader SHALL fall back to static configuration
- **AND** the loader SHALL emit "config-invalid" event

### Requirement: Host SHALL support adding remotes without rebuild

The host application SHALL allow operations teams to add or update remotes by deploying new config files without rebuilding the application bundle.

#### Scenario: New remote added via config update

- **WHEN** operations team deploys updated `/remotes.config.json` with new remote
- **AND** user refreshes the application
- **THEN** the new remote SHALL be available for loading
- **AND** no host application rebuild SHALL be required

#### Scenario: Remote URL updated via config

- **WHEN** operations team updates existing remote's entryUrl in config
- **AND** users load the application with new config
- **THEN** the updated URL SHALL be used for loading the remote
- **AND** no host application rebuild SHALL be required

### Requirement: Host SHALL emit telemetry events for remote loading

The host application SHALL emit events throughout remote loading lifecycle for monitoring and debugging.

#### Scenario: Config load events emitted

- **WHEN** loader fetches remote configuration
- **THEN** the system SHALL emit "config-load-start" and "config-load-success" events
- **AND** events SHALL include duration and remote count

#### Scenario: Remote load events emitted

- **WHEN** loading a remote module
- **THEN** the system SHALL emit "remote-load-start", "remote-load-success", or "remote-load-failed" events
- **AND** events SHALL include remoteName, duration, and source URL

#### Scenario: Event listeners registered

- **WHEN** developer registers event listener via `loader.on('remote-load-success', handler)`
- **THEN** handler SHALL be called when corresponding event occurs
- **AND** handler SHALL receive event data object

### Requirement: Host SHALL maintain backward compatibility with static config

The host application SHALL support both runtime JSON config and static vite.config.ts remotes for gradual migration.

#### Scenario: Static config used when JSON unavailable

- **WHEN** JSON config file returns 404 or fails validation
- **THEN** the system SHALL use remotes defined in vite.config.ts
- **AND** the system SHALL log that static fallback is active

#### Scenario: JSON config overrides static config

- **WHEN** both JSON config and static config define remotes
- **THEN** the system SHALL use JSON config
- **AND** static config SHALL only be used as fallback

### Requirement: Host build SHALL integrate with Turborepo pipeline

The host application SHALL use Turborepo for incremental builds with automatic config generation.

#### Scenario: Host build triggers config regeneration

- **WHEN** running `turbo build --filter website`
- **THEN** Turborepo SHALL run `generate:config` task first (depends on all mfe builds)
- **AND** Turborepo SHALL build host after config generated
- **AND** host SHALL include fresh config in build output

#### Scenario: Host uses cached build when nothing changed

- **WHEN** running `turbo build --filter website` with no code changes
- **THEN** Turborepo SHALL detect no changes via content hashing
- **AND** Turborepo SHALL serve host build from cache
- **AND** build SHALL complete in <1 second

#### Scenario: Host rebuilds when micro-frontend changes

- **WHEN** micro-frontend code changes
- **AND** running `turbo build`
- **THEN** Turborepo SHALL rebuild changed micro-frontend
- **AND** Turborepo SHALL regenerate config (depends on all mfes)
- **AND** Turborepo SHALL rebuild host (config changed)

#### Scenario: Host rebuilds when own code changes

- **WHEN** host application code changes (not micro-frontends)
- **AND** running `turbo build`
- **THEN** Turborepo SHALL rebuild host only
- **AND** micro-frontends SHALL be served from cache
- **AND** config generation SHALL be served from cache (if mfes unchanged)
