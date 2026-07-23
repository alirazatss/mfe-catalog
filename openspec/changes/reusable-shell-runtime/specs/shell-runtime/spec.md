## ADDED Requirements

### Requirement: REQ-SR-001 Runtime configuration SHALL be adapter-driven

The Shell Runtime SHALL accept Shell-supplied adapters for manifest acquisition, authentication, navigation, Slot resolution, and failure presentation. It SHALL NOT require a specific authentication provider, client router, DOM identifier convention, or UI framework.

#### Scenario: Runtime starts with custom adapters

- **GIVEN** a Shell supplies valid adapters backed by its own authentication provider, router, Slot layout, and error UI
- **WHEN** the Shell starts the runtime
- **THEN** the runtime SHALL orchestrate MFEs through those adapters
- **AND** SHALL NOT access repository-specific authentication or Shell presentation APIs directly

#### Scenario: Required adapter is missing

- **GIVEN** runtime configuration omits a required adapter operation
- **WHEN** the Shell creates or starts the runtime
- **THEN** the runtime SHALL reject the invalid configuration with an error naming the missing operation
- **AND** SHALL NOT request a Manifest or load an MFE

#### Scenario: Package is imported outside a browser

- **GIVEN** application code imports the Shell Runtime package in an environment without a DOM
- **WHEN** module evaluation completes
- **THEN** the import SHALL complete without accessing browser globals
- **AND** starting the runtime SHALL fail with a browser-environment error before invoking any adapter

### Requirement: REQ-SR-002 Runtime startup SHALL follow a deterministic sequence

`start` SHALL acquire and validate the Manifest, initialize authentication, mount enabled Chrome MFEs, activate the Feature MFE matching the current URL, and subscribe to navigation changes in that order. A successful `start` SHALL resolve only after initial MFE activation has settled.

#### Scenario: Successful initial startup

- **GIVEN** all required adapters are valid and the Manifest contains enabled Chrome and Feature MFEs
- **WHEN** the Shell awaits `start`
- **THEN** the runtime SHALL validate the Manifest before initializing authentication
- **AND** SHALL settle all initial Chrome mounts before activating the current Feature MFE
- **AND** SHALL subscribe to navigation changes after initial activation
- **AND** `start` SHALL resolve with the runtime in a started state

#### Scenario: Manifest acquisition fails

- **GIVEN** the Manifest Provider rejects or returns an invalid Manifest
- **WHEN** the Shell awaits `start`
- **THEN** the runtime SHALL report a critical manifest failure to the Failure Renderer
- **AND** SHALL NOT initialize authentication, subscribe to navigation, or load any MFE
- **AND** `start` SHALL reject with the failure cause

#### Scenario: Authentication initialization fails

- **GIVEN** the Manifest is valid and the Auth Adapter fails to initialize
- **WHEN** startup continues
- **THEN** the runtime SHALL report an authentication initialization failure to the Failure Renderer and through observability
- **AND** SHALL treat the initial authentication state as unauthenticated
- **AND** SHALL continue mounting Chrome MFEs and evaluating the current route

#### Scenario: Start is called while startup is in progress

- **GIVEN** a runtime instance is already starting
- **WHEN** `start` is called again before the first call settles
- **THEN** both calls SHALL observe the same startup result
- **AND** adapters, subscriptions, and MFE lifecycle functions SHALL NOT be invoked more than once because of the duplicate call

### Requirement: REQ-SR-003 Manifest acquisition SHALL be provider-independent

The runtime SHALL obtain its Manifest through an asynchronous Manifest Provider and SHALL reject data that does not satisfy the supported Manifest schema. The package SHALL also expose a browser URL Manifest Provider with configurable request and retry behavior as an optional convenience.

#### Scenario: Custom provider supplies a valid Manifest

- **GIVEN** a Shell configures a Manifest Provider that reads configuration from an embedded host API
- **WHEN** the runtime starts
- **THEN** the runtime SHALL use the returned Manifest without requiring a public URL
- **AND** SHALL expose manifest acquisition and validation outcomes through observability

#### Scenario: Provider returns malformed data

- **GIVEN** the Manifest Provider resolves with data missing required MFE fields
- **WHEN** the runtime validates the data
- **THEN** startup SHALL reject before any MFE is loaded
- **AND** the critical failure context SHALL identify manifest validation as the failed phase

#### Scenario: URL provider retries a transient failure

- **GIVEN** a Shell configures the URL Manifest Provider with a retry policy
- **AND** the first request fails with a retryable error
- **WHEN** a later configured attempt returns a valid Manifest
- **THEN** the provider SHALL resolve with the validated Manifest
- **AND** the runtime SHALL continue startup without rendering a critical failure

### Requirement: REQ-SR-004 Managed MFEs SHALL use the standard lifecycle contract

The runtime SHALL manage only MFEs exposing the standardized `bootstrap`, `mount`, and `unmount` lifecycle functions, with optional `update`. It SHALL NOT mount framework components on behalf of an MFE.

#### Scenario: Valid lifecycle module is mounted

- **GIVEN** a configured MFE exposes all required lifecycle functions
- **WHEN** the runtime activates that MFE
- **THEN** the runtime SHALL await its lifecycle functions in the required order
- **AND** SHALL pass the existing shared MFE prop shape, including the resolved container and Slot

#### Scenario: Remote exposes a React component without lifecycle functions

- **GIVEN** a configured remote exposes a React component but omits one or more required lifecycle functions
- **WHEN** the runtime attempts to activate the remote
- **THEN** activation SHALL fail with an error naming the MFE and missing lifecycle functions
- **AND** the runtime SHALL NOT create a framework root or render the component

#### Scenario: Mounted MFE receives changed shared props

- **GIVEN** a mounted MFE exposes `update`
- **WHEN** its user, authentication, locale, theme, or configuration props change
- **THEN** the runtime SHALL invoke `update` with the current shared props
- **AND** SHALL NOT unmount the MFE solely to apply that update

### Requirement: REQ-SR-005 Chrome MFEs SHALL be long-lived and isolated by Slot

The runtime SHALL mount each enabled Chrome MFE into the Slot identified by its Manifest key and SHALL keep successful Chrome MFEs mounted across Feature route changes. Failure of one Chrome MFE SHALL NOT prevent independent Chrome or Feature MFEs from activating.

#### Scenario: Chrome MFEs mount into explicit Slots

- **GIVEN** a Manifest defines enabled `header` and `sidebar` Chrome MFEs
- **AND** the Slot Resolver maps both names to distinct DOM elements
- **WHEN** startup reaches Chrome activation
- **THEN** each MFE SHALL receive the element resolved for its Manifest Slot key
- **AND** both successful mounts SHALL remain active during Feature navigation

#### Scenario: Chrome Slot cannot be resolved

- **GIVEN** the Slot Resolver returns no element for the `sidebar` Slot
- **WHEN** the runtime activates Chrome MFEs
- **THEN** the runtime SHALL report a Slot-level failure for `sidebar`
- **AND** SHALL continue activating other resolvable Chrome Slots and the current Feature route

#### Scenario: Chrome MFE mount fails

- **GIVEN** the `header` MFE rejects during mount while the `sidebar` MFE can mount
- **WHEN** Chrome activation settles
- **THEN** the Failure Renderer SHALL receive failure context for the `header` Slot
- **AND** the `sidebar` MFE and eligible Feature MFE SHALL remain available

### Requirement: REQ-SR-006 Feature activation SHALL follow Manifest routes and access policy

The runtime SHALL select Feature MFEs using the supported Manifest route semantics, evaluate authentication and role requirements before remote loading, and mount at most one Feature MFE in the configured Feature Slot.

#### Scenario: Authorized route activates a Feature MFE

- **GIVEN** the current URL matches an enabled Feature MFE and the Auth Adapter satisfies its access requirements
- **WHEN** the runtime evaluates the route
- **THEN** the runtime SHALL resolve the Feature Slot
- **AND** SHALL mount the matched MFE with the route base path and current shared props

#### Scenario: Protected route is evaluated for an unauthenticated user

- **GIVEN** the current URL matches a Feature MFE requiring authentication
- **AND** the Auth Adapter reports that the user is unauthenticated
- **WHEN** the runtime evaluates the route
- **THEN** the runtime SHALL NOT request or mount the protected MFE
- **AND** SHALL send an unauthenticated route outcome, including the attempted URL, to the Failure Renderer

#### Scenario: User lacks a required role

- **GIVEN** the current URL matches a Feature MFE with required roles
- **AND** the Auth Adapter reports that the user has none of those roles
- **WHEN** the runtime evaluates the route
- **THEN** the runtime SHALL NOT request or mount the Feature MFE
- **AND** SHALL send a forbidden route outcome to the Failure Renderer

#### Scenario: Auth Adapter does not report roles

- **GIVEN** the current URL matches a Feature MFE with required roles
- **AND** the Auth Adapter does not implement role reporting
- **WHEN** the runtime evaluates the route
- **THEN** the runtime SHALL treat the user as having no roles
- **AND** SHALL NOT request or mount the Feature MFE
- **AND** SHALL send a forbidden route outcome to the Failure Renderer

#### Scenario: No Feature route matches

- **GIVEN** no enabled Feature MFE matches the current URL
- **WHEN** the runtime evaluates the route
- **THEN** the runtime SHALL ensure the Feature Slot has no active MFE
- **AND** SHALL send a not-found route outcome to the Failure Renderer

#### Scenario: Navigation remains within the active Feature MFE

- **GIVEN** the current and next URLs both match the same active Feature MFE
- **WHEN** the Navigation Adapter reports the next URL
- **THEN** the runtime SHALL keep that Feature MFE mounted
- **AND** SHALL invoke its `update` lifecycle when available with the latest route-derived props

### Requirement: REQ-SR-007 Route transitions SHALL converge on the latest URL

The runtime SHALL serialize Feature transitions and SHALL prevent completed work for an obsolete URL from becoming the active Feature state. When multiple route changes arrive during activation, the final mounted Feature SHALL correspond to the newest observed URL.

#### Scenario: New route arrives while a Feature is loading

- **GIVEN** Feature A is loading for one URL
- **WHEN** the Navigation Adapter reports a newer URL matching Feature B before Feature A mounts
- **THEN** the runtime SHALL prevent Feature A from becoming the committed active Feature
- **AND** SHALL activate Feature B after required cleanup
- **AND** the Feature Slot SHALL ultimately contain only Feature B

#### Scenario: Obsolete mount completes after a newer route

- **GIVEN** Feature A completes mount after its route has become obsolete
- **WHEN** the runtime observes the stale completion
- **THEN** the runtime SHALL unmount Feature A
- **AND** SHALL NOT report Feature A as the active Slot occupant

#### Scenario: Several route changes occur during one transition

- **GIVEN** route changes for Features B, C, and D arrive while Feature A is transitioning
- **WHEN** transition processing catches up
- **THEN** the runtime SHALL converge on the newest URL for Feature D
- **AND** SHALL NOT require intermediate Features B and C to become visibly active

### Requirement: REQ-SR-008 Navigation SHALL be controlled through an adapter

The runtime SHALL read the current URL, subscribe to route changes, and initiate MFE-requested navigation through a Navigation Adapter. The package SHALL provide an optional browser History API adapter without requiring it for custom host routers.

#### Scenario: Host router supplies navigation

- **GIVEN** a Shell provides a Navigation Adapter backed by its host router
- **WHEN** the host router reports a new URL
- **THEN** the runtime SHALL evaluate that URL without patching browser history methods

#### Scenario: MFE requests navigation

- **GIVEN** a mounted MFE invokes the navigation callback from its shared props
- **WHEN** the runtime receives a valid application-relative destination
- **THEN** the runtime SHALL delegate the request to the Navigation Adapter
- **AND** SHALL process the resulting route notification through the normal transition flow

#### Scenario: MFE requests an invalid destination

- **GIVEN** a mounted MFE requests an external or malformed destination not accepted by the Navigation Adapter contract
- **WHEN** the runtime validates the request
- **THEN** the runtime SHALL reject the navigation request
- **AND** SHALL keep the current Feature MFE active
- **AND** SHALL expose the rejection through observability

### Requirement: REQ-SR-009 Failures SHALL be classified and rendered by the Shell

The runtime SHALL classify failures as critical startup, authentication, route outcome, Slot resolution, remote loading, lifecycle, navigation, or cleanup failures. It SHALL pass typed failure context to the Shell-supplied Failure Renderer and SHALL NOT prescribe fallback markup.

#### Scenario: Shell renders a Slot fallback

- **GIVEN** a Feature MFE fails to load
- **WHEN** the runtime reports the failure
- **THEN** the Failure Renderer SHALL receive the failed phase, MFE name, Slot name, URL when applicable, and failure cause
- **AND** the Shell SHALL be able to render fallback UI without the runtime writing fallback markup

#### Scenario: Failure is cleared after recovery

- **GIVEN** a Slot has a rendered failure and a later activation succeeds in that Slot
- **WHEN** the successful MFE becomes active
- **THEN** the runtime SHALL ask the Failure Renderer to clear the failure for that Slot
- **AND** SHALL report the recovery through observability

#### Scenario: Failure Renderer throws

- **GIVEN** the Failure Renderer throws while handling one failure
- **WHEN** the runtime catches the renderer error
- **THEN** unrelated Slots and navigation processing SHALL continue
- **AND** the renderer error SHALL be exposed through observability without recursively invoking the renderer

### Requirement: REQ-SR-010 Runtime instances SHALL support restart and permanent disposal

Each runtime instance SHALL expose `start`, `stop`, and `dispose`. `stop` SHALL unsubscribe navigation and unmount all active MFEs while preserving restartable instance configuration. `dispose` SHALL perform cleanup and permanently prevent future starts.

#### Scenario: Started runtime is stopped

- **GIVEN** a runtime has active Chrome and Feature MFEs and a navigation subscription
- **WHEN** the Shell awaits `stop`
- **THEN** the runtime SHALL stop accepting new transitions
- **AND** SHALL unsubscribe navigation
- **AND** SHALL unmount each active MFE and clear its Slot bookkeeping
- **AND** `stop` SHALL resolve with the runtime in a stopped state

#### Scenario: Stopped runtime restarts

- **GIVEN** a runtime has completed `stop`
- **WHEN** the Shell calls `start` again
- **THEN** the runtime SHALL reacquire the Manifest and current adapter state
- **AND** SHALL create one new navigation subscription
- **AND** SHALL activate MFEs for the current URL without duplicate mounts

#### Scenario: Runtime is disposed

- **GIVEN** a runtime is started or stopped
- **WHEN** the Shell awaits `dispose`
- **THEN** the runtime SHALL complete required cleanup
- **AND** SHALL release adapter and listener references owned by the instance
- **AND** any later `start` call SHALL reject with a disposed-instance error

#### Scenario: Cleanup of one MFE fails

- **GIVEN** multiple MFEs are active and one rejects during unmount
- **WHEN** `stop` or `dispose` performs cleanup
- **THEN** the runtime SHALL attempt cleanup for every other active MFE
- **AND** SHALL report each cleanup failure through the Failure Renderer and observability
- **AND** SHALL finish in the requested stopped or disposed state

### Requirement: REQ-SR-011 Runtime behavior SHALL be observable without a mandatory telemetry vendor

The runtime SHALL expose typed observation hooks for state changes, transition phases, MFE lifecycle outcomes, route outcomes, failures, and recovery. Observer failures SHALL NOT alter orchestration outcomes.

#### Scenario: Observer receives a successful transition

- **GIVEN** a Shell registers an observer
- **WHEN** navigation activates a different Feature MFE successfully
- **THEN** the observer SHALL receive events identifying the transition, URL, MFE, Slot, and successful outcome
- **AND** event ordering SHALL reflect the externally visible transition order

#### Scenario: No observer is configured

- **GIVEN** a Shell does not configure observability hooks
- **WHEN** runtime operations succeed or fail
- **THEN** orchestration and failure rendering SHALL behave the same as when an observer is present

#### Scenario: Observer throws

- **GIVEN** an observer throws while processing an event
- **WHEN** the runtime catches the observer error
- **THEN** the active transition SHALL continue to its normal outcome
- **AND** other registered observers SHALL still receive subsequent events
