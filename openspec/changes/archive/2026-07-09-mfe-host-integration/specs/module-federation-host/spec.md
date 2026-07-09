# Module Federation Host Integration Specification

## MODIFIED Requirements

### Requirement: Host application SHALL load federated modules

The host application SHALL dynamically load remote federated modules at runtime using the dynamic loader and generated configuration.

**(Previously: Hardcoded remote URLs in vite.config.ts)**

**Reason for change**: Enable dynamic discovery and configuration of micro-frontends without rebuilding the host.

#### Scenario: Host initializes dynamic loader at startup

- **GIVEN** the host application is starting
- **WHEN** the app initialization runs
- **THEN** the dynamic loader SHALL fetch `/remotes.config.json`
- **AND** the config SHALL be validated against JSON Schema
- **AND** the loader SHALL cache the config in memory
- **AND** initialization success SHALL be logged to console

#### Scenario: Host loads remote via dynamic loader

- **GIVEN** the dynamic loader is initialized
- **WHEN** the host requests remote "mfe-widget"
- **THEN** the loader SHALL look up "mfe-widget" in cached config
- **AND** the loader SHALL inject the remote's script tag
- **AND** the loader SHALL initialize Module Federation sharing
- **AND** the remote container SHALL be returned
- **AND** remote load success SHALL be logged to console

#### Scenario: Config fetch fails with retry

- **GIVEN** the host application is starting
- **WHEN** config fetch returns HTTP 500
- **THEN** the loader SHALL retry after 1 second
- **AND** SHALL retry again after 2 seconds
- **AND** SHALL fail after 3 total attempts
- **AND** error SHALL be logged to console
- **AND** app SHALL continue (graceful degradation)

#### Scenario: Remote not found in config

- **GIVEN** the dynamic loader is initialized with valid config
- **WHEN** the host requests remote "unknown-remote"
- **THEN** the loader SHALL throw error "Remote 'unknown-remote' not found in config"
- **AND** error boundary SHALL catch the error
- **AND** user SHALL see fallback UI with helpful message

#### Scenario: Remote is disabled in config

- **GIVEN** config contains "mfe-analytics" with enabled: false
- **WHEN** the host requests remote "mfe-analytics"
- **THEN** the loader SHALL throw error "Remote 'mfe-analytics' is disabled"
- **AND** error boundary SHALL display "Remote is currently disabled"
- **AND** error SHALL be logged to console

---

### Requirement: Remote loading SHALL use mfe-\* naming convention

The host application SHALL reference remotes using the `mfe-*` naming convention that matches auto-discovered package names.

**(Previously: Used "remoteWidget" naming)**

**Reason for change**: Consistency with monorepo naming convention and auto-discovery system.

#### Scenario: Host references remote by mfe-\* name

- **GIVEN** a micro-frontend package named `@mf-mono/mfe-widget`
- **WHEN** the host loads the remote
- **THEN** the remote SHALL be referenced as "mfe-widget"
- **AND** the loader SHALL find it in config by that name

#### Scenario: Old naming convention fails

- **GIVEN** the host attempts to load remote "remoteWidget"
- **WHEN** the loader searches the config
- **THEN** the loader SHALL NOT find a matching remote
- **AND** SHALL throw "Remote 'remoteWidget' not found in config"

---

### Requirement: Error boundaries SHALL display specific loader errors

The host application SHALL catch and display specific error messages for different loader failure scenarios.

**(Previously: Generic error boundary messages)**

**Reason for change**: Better developer experience and easier debugging.

#### Scenario: Config fetch error displayed

- **GIVEN** config fetch fails after retries
- **WHEN** error boundary catches the error
- **THEN** UI SHALL display "Failed to load remote configuration"
- **AND** SHALL include retry instruction
- **AND** error details SHALL be logged to console

#### Scenario: Remote not found error displayed

- **GIVEN** remote "mfe-dashboard" is not in config
- **WHEN** host attempts to load it
- **THEN** error boundary SHALL display "Remote 'mfe-dashboard' not found"
- **AND** SHALL suggest checking config file

#### Scenario: Remote disabled error displayed

- **GIVEN** remote is disabled in config
- **WHEN** host attempts to load it
- **THEN** error boundary SHALL display "Remote is currently disabled"
- **AND** SHALL suggest checking feature flags

#### Scenario: Script load error displayed

- **GIVEN** remote script URL returns 404
- **WHEN** loader attempts to inject script
- **THEN** error boundary SHALL display "Failed to load remote from {url}"
- **AND** error SHALL include network details

---

## ADDED Requirements

### Requirement: Loader events SHALL be logged in development

The host application SHALL log all dynamic loader lifecycle events to the console when running in development mode.

#### Scenario: Config load logged

- **GIVEN** app is running in development mode
- **WHEN** config loads successfully
- **THEN** console SHALL log "Remotes config loaded: {config}"
- **AND** log level SHALL be "log" (not error)

#### Scenario: Remote load success logged

- **GIVEN** app is running in development mode
- **WHEN** remote loads successfully
- **THEN** console SHALL log "Remote '{name}' loaded successfully"
- **AND** SHALL include remote name

#### Scenario: Remote load error logged

- **GIVEN** app is running in development mode
- **WHEN** remote fails to load
- **THEN** console SHALL log "Failed to load remote '{name}': {error}"
- **AND** log level SHALL be "error"
- **AND** SHALL include error details

#### Scenario: Production mode has no event logging

- **GIVEN** app is running in production mode
- **WHEN** loader events occur
- **THEN** console SHALL NOT log event messages
- **AND** only errors SHALL be logged

---

### Requirement: Static config SHALL be preserved as fallback

The host application SHALL maintain static Module Federation configuration (commented) as a documented fallback.

#### Scenario: Static config documented

- **GIVEN** vite.config.ts file
- **WHEN** developer reviews configuration
- **THEN** static remotes configuration SHALL be present
- **AND** SHALL be commented out
- **AND** SHALL include comment explaining fallback purpose

#### Scenario: Fallback can be activated

- **GIVEN** dynamic loader is failing
- **WHEN** developer uncomments static config
- **AND** rebuilds application
- **THEN** static config SHALL be used
- **AND** remotes SHALL load via hardcoded URLs

---

### Requirement: Remote initialization SHALL happen before app render

The host application SHALL initialize the dynamic loader before rendering React components.

#### Scenario: Loader initialized before render

- **GIVEN** app is starting
- **WHEN** initialization sequence runs
- **THEN** loader.init() SHALL complete
- **AND** config SHALL be cached
- **THEN** React root SHALL render
- **AND** components can safely call loader.loadRemote()

#### Scenario: Initialization error handled

- **GIVEN** loader.init() throws error
- **WHEN** initialization sequence runs
- **THEN** error SHALL be caught
- **AND** SHALL be logged to console
- **AND** app SHALL render anyway (graceful degradation)
- **AND** remote loads will fail with helpful error

---

### Requirement: Loader instance SHALL be exported for component use

The host application SHALL export the loader instance so components can call loadRemote().

#### Scenario: Components import loader

- **GIVEN** a React component needs to load a remote
- **WHEN** component imports loader from config module
- **THEN** import SHALL succeed
- **AND** loader SHALL be the initialized singleton instance

#### Scenario: Multiple components use same loader

- **GIVEN** multiple components import the loader
- **WHEN** each component calls loader.loadRemote()
- **THEN** all SHALL use the same loader instance
- **AND** config SHALL be fetched only once
- **AND** remote containers SHALL be cached

---

### Requirement: Hot module reloading SHALL continue to work

The host application SHALL maintain hot module reload (HMR) functionality after dynamic loader integration.

#### Scenario: Host code changes trigger HMR

- **GIVEN** app is running in development mode
- **WHEN** developer edits host component code
- **THEN** HMR SHALL update the component
- **AND** page SHALL NOT full reload
- **AND** remote modules SHALL remain loaded

#### Scenario: Remote code changes trigger reload

- **GIVEN** app is running in development mode
- **WHEN** developer edits remote component code
- **THEN** remote SHALL rebuild
- **AND** HMR SHALL update the remote
- **AND** host SHALL reflect the changes

---

### Requirement: Integration tests SHALL verify end-to-end flow

The host application SHALL have integration tests verifying dynamic loading works correctly.

#### Scenario: Test config loads

- **GIVEN** integration test suite
- **WHEN** test runs loader initialization
- **THEN** config SHALL load without error
- **AND** test SHALL assert config structure is valid

#### Scenario: Test remote loads

- **GIVEN** integration test suite
- **WHEN** test loads "mfe-widget" remote
- **THEN** remote SHALL load successfully
- **AND** test SHALL assert container is returned
- **AND** test SHALL assert remote exports are accessible

#### Scenario: Test error scenarios

- **GIVEN** integration test suite
- **WHEN** test attempts to load non-existent remote
- **THEN** loader SHALL throw expected error
- **AND** test SHALL assert error message is correct

#### Scenario: Test widget renders

- **GIVEN** integration test suite
- **WHEN** test renders host with remote widget
- **THEN** widget component SHALL render
- **AND** test SHALL assert widget content is visible
