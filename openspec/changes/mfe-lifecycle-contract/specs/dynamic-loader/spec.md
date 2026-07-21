## MODIFIED Requirements

### Requirement: Load micro-frontends dynamically by name

The system SHALL dynamically load Module Federation remotes using the name specified in the config AND SHALL drive each remote through the `MFELifecycle` contract (`bootstrap`, `mount`, `unmount`, optional `update`) into a caller-supplied DOM slot.

**(Previously: Loader returned a Module Federation container object for the caller to render manually as a React component)**

**Reason for change**: The Chrome MFE pattern and `mfe-lifecycle-contract` capability require the loader to own lifecycle orchestration rather than each shell doing it ad-hoc. This lets the loader manage per-slot mounts, validate MFE exports, and support both feature MFEs (route-based mount/unmount) and chrome MFEs (persistent mount with `update`).

#### Scenario: Remote loaded and mounted into slot

- **GIVEN** the loader is initialized
- **AND** the config includes an entry `mfe-widget` with a valid `entryUrl`
- **WHEN** caller invokes `loader.load('mfe-widget', 'main-slot', props)`
- **THEN** the loader SHALL fetch the remote's script and initialize Module Federation sharing
- **AND** the loader SHALL dynamically import the exposed `./lifecycle` module
- **AND** the loader SHALL validate that `bootstrap`, `mount`, `unmount` are exported functions
- **AND** the loader SHALL call `bootstrap(props)` once, then `mount(props)`
- **AND** the target `<div id="main-slot">` SHALL contain the MFE's rendered DOM

#### Scenario: Remote validation fails at first load

- **GIVEN** an MFE's exposed lifecycle module is missing `mount`
- **WHEN** `loader.load('mfe-broken', 'main-slot')` is called
- **THEN** the loader SHALL throw an error `MFE mfe-broken is missing required lifecycle exports: mount`
- **AND** the loader SHALL NOT invoke `bootstrap`
- **AND** the failure SHALL be recorded so callers can surface a slot-level error UI

#### Scenario: Slot reassignment unmounts previous MFE

- **GIVEN** `mfe-widget` is mounted in `main-slot`
- **WHEN** caller invokes `loader.load('mfe-dashboard', 'main-slot', props)`
- **THEN** the loader SHALL call `mfe-widget.unmount()`
- **AND** the loader SHALL clear the container element
- **AND** the loader SHALL then load and mount `mfe-dashboard`
- **AND** the chrome MFEs in other slots SHALL be untouched

#### Scenario: Repeat mount of the same MFE reuses bootstrap

- **GIVEN** `mfe-widget` was previously bootstrapped and later unmounted
- **WHEN** `loader.load('mfe-widget', 'main-slot')` is called again in the same page load
- **THEN** the loader SHALL NOT re-invoke `bootstrap`
- **AND** the loader SHALL invoke `mount` with the fresh props

#### Scenario: Remote is disabled in config

- **GIVEN** the config includes `mfe-analytics` with `enabled: false`
- **WHEN** caller invokes `loader.load('mfe-analytics', 'main-slot')`
- **THEN** the loader SHALL reject the call with `Remote 'mfe-analytics' is disabled`
- **AND** no lifecycle function SHALL be invoked

---

## ADDED Requirements

### Requirement: Loader SHALL expose `unload` and `update` operations

The loader SHALL expose `unload(name)` and `update(name, partialProps)` operations that drive the `MFELifecycle` `unmount` and `update` functions respectively.

#### Scenario: Unload calls unmount and clears slot state

- **GIVEN** `mfe-widget` is currently mounted in `main-slot`
- **WHEN** caller invokes `loader.unload('mfe-widget')`
- **THEN** the loader SHALL invoke `mfe-widget.unmount(currentProps)`
- **AND** the loader SHALL clear the target container element's inner HTML as a defense-in-depth
- **AND** the loader SHALL mark the instance as `mounted: false`

#### Scenario: Update calls `update` when available

- **GIVEN** `mfe-header` is mounted and its lifecycle exports `update`
- **WHEN** caller invokes `loader.update('mfe-header', { theme: 'dark' })`
- **THEN** the loader SHALL merge the partial props into the instance's stored props
- **AND** the loader SHALL invoke `update(mergedProps)` without unmounting
- **AND** the DOM identity SHALL be preserved

#### Scenario: Update falls back to unmount+mount when `update` missing

- **GIVEN** an MFE is mounted and does NOT export `update`
- **WHEN** caller invokes `loader.update(name, partialProps)`
- **THEN** the loader SHALL invoke `unmount(currentProps)` followed by `mount(mergedProps)`
- **AND** no error SHALL be raised

---

### Requirement: Loader SHALL emit lifecycle telemetry events

The loader SHALL emit lifecycle events on the shared event bus so shells and monitoring tools can observe MFE state transitions.

#### Scenario: Successful mount emits events

- **GIVEN** `loader.load(name, slot, props)` is invoked
- **WHEN** the lifecycle completes successfully
- **THEN** the loader SHALL emit `mfe:bootstrap:start`, `mfe:bootstrap:success` (first time only), `mfe:mount:start`, `mfe:mount:success`
- **AND** each event payload SHALL include `{ name, slot, timestamp }`

#### Scenario: Failure emits error events

- **GIVEN** any lifecycle step throws an error
- **WHEN** the loader catches the error
- **THEN** the loader SHALL emit `mfe:<phase>:error` (where `<phase>` is `bootstrap`, `mount`, `unmount`, or `update`)
- **AND** the payload SHALL include `{ name, slot, phase, error, timestamp }`
- **AND** the error SHALL then be surfaced to the caller (via thrown error or rejected promise)

#### Scenario: Unmount emits completion event

- **GIVEN** `loader.unload(name)` succeeds
- **WHEN** unmount completes
- **THEN** the loader SHALL emit `mfe:unmount:success` with `{ name, slot, timestamp }`

---

### Requirement: Loader SHALL export `MFELifecycle` and `MFEProps` types

The `@mf-mono/dynamic-loader` package SHALL publicly export the TypeScript interfaces used across the lifecycle contract so MFE authors can implement them.

#### Scenario: Type imports resolve

- **GIVEN** an MFE author imports `import type { MFELifecycle, MFEProps } from '@mf-mono/dynamic-loader'`
- **WHEN** the TypeScript compiler resolves the imports
- **THEN** the import SHALL succeed with no type errors
- **AND** the `MFELifecycle` type SHALL declare `bootstrap`, `mount`, `unmount`, and optional `update` all typed as `(props: MFEProps) => Promise<void>`
