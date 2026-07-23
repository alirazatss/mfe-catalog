## ADDED Requirements

### Requirement: Every MFE SHALL export standardized lifecycle functions

Every micro-frontend loaded through the dynamic loader SHALL export `bootstrap`, `mount`, and `unmount` as async functions matching the `MFELifecycle` interface. MFEs MAY optionally export `update`.

#### Scenario: Lifecycle module exposes required exports

- **GIVEN** an MFE exposes `./lifecycle` via Module Federation
- **WHEN** the loader dynamically imports the module
- **THEN** the module SHALL provide `bootstrap`, `mount`, `unmount` as top-level named exports OR as properties of the default export
- **AND** each SHALL be an async function accepting `MFEProps`

#### Scenario: Loader validates exports at first load

- **GIVEN** an MFE is loaded for the first time in the current page
- **WHEN** the loader executes its validation step
- **THEN** the loader SHALL confirm each of `bootstrap`, `mount`, `unmount` is a function
- **AND** on failure the loader SHALL throw an error naming the MFE and listing the missing exports
- **AND** the loader SHALL NOT attempt to mount the MFE

#### Scenario: Optional `update` present

- **GIVEN** an MFE exports `update` as an async function
- **WHEN** the loader validates the module
- **THEN** validation SHALL pass
- **AND** the loader SHALL invoke `update` for subsequent prop changes instead of unmount+mount

#### Scenario: Optional `update` absent

- **GIVEN** an MFE does NOT export `update`
- **WHEN** the loader receives a prop-update request
- **THEN** the loader SHALL invoke `unmount` followed by `mount` with the merged props
- **AND** no error SHALL be raised

---

### Requirement: `MFEProps` SHALL be the shared prop shape between shell and MFEs

The `@mfe-runtine/dynamic-loader` package SHALL export a `MFEProps` TypeScript interface that captures the props flowing from the shell to every MFE.

#### Scenario: `MFEProps` provides required and optional fields

- **GIVEN** a developer imports `MFEProps` from `@mfe-runtine/dynamic-loader`
- **WHEN** the interface is inspected
- **THEN** the interface SHALL require `container: HTMLElement`
- **AND** SHALL optionally include `slot`, `user`, `isAuthenticated`, `theme`, `locale`, `basePath`, `config`, `onNavigate`
- **AND** SHALL allow additional custom fields via index signature `[key: string]: unknown`

#### Scenario: Shell passes `container` matching the target slot

- **GIVEN** the shell calls `loader.load('mfe-widget', 'main-slot', props)`
- **WHEN** the loader resolves `container`
- **THEN** `props.container` SHALL be the DOM element with `id="main-slot"`
- **AND** `props.slot` SHALL be `"main-slot"`

---

### Requirement: `bootstrap` SHALL run at most once per MFE per page load

The loader SHALL invoke `bootstrap` exactly once for each MFE instance across the lifetime of a page load. Re-mounts SHALL NOT re-invoke `bootstrap`.

#### Scenario: First mount triggers bootstrap

- **GIVEN** an MFE has not been loaded yet
- **WHEN** `loader.load(name, slot)` is called
- **THEN** the loader SHALL invoke `bootstrap(props)` and await its completion
- **AND** the loader SHALL then invoke `mount(props)`
- **AND** the internal instance record SHALL mark `bootstrapped: true`

#### Scenario: Subsequent mount skips bootstrap

- **GIVEN** an MFE has been bootstrapped in the current page load
- **AND** was later unmounted
- **WHEN** `loader.load(name, slot)` is called again
- **THEN** the loader SHALL NOT invoke `bootstrap`
- **AND** the loader SHALL invoke `mount(props)` directly

#### Scenario: `bootstrap` failure blocks mount

- **GIVEN** an MFE's `bootstrap` throws or rejects
- **WHEN** the loader catches the error
- **THEN** the loader SHALL NOT invoke `mount`
- **AND** the loader SHALL surface the error to callers (via return value or thrown error)
- **AND** the instance SHALL be recorded as failed (`bootstrapped: false`)

---

### Requirement: `mount`/`unmount` SHALL manage DOM ownership within their target slot

MFE `mount` SHALL render into the provided `container`; `unmount` SHALL fully clean up the container and any subscriptions.

#### Scenario: Mount populates the container

- **GIVEN** an MFE's `mount(props)` is invoked with `props.container = <div id="main-slot">`
- **WHEN** the function completes
- **THEN** `main-slot` SHALL contain the MFE's rendered DOM
- **AND** the MFE SHALL NOT modify other slots or the shell's HTML structure

#### Scenario: Unmount clears the container

- **GIVEN** an MFE was previously mounted into `main-slot`
- **WHEN** `unmount(props)` is invoked
- **THEN** any framework roots created during `mount` (e.g., React `Root`) SHALL be destroyed
- **AND** subscribers registered during `mount` SHALL be removed
- **AND** after the function resolves, `main-slot.innerHTML` SHALL be empty (loader clears it as a defense-in-depth)

#### Scenario: Repeated mount/unmount cycles do not leak

- **GIVEN** an MFE is mounted, unmounted, and mounted again
- **WHEN** the second mount completes
- **THEN** the container SHALL contain exactly one rendered tree
- **AND** no duplicate React roots or event listeners SHALL exist

---

### Requirement: `update` SHALL re-render without unmounting when supported

MFEs that export `update` SHALL re-render or reconfigure themselves with new props without tearing down their DOM or losing internal state.

#### Scenario: Update propagates new user

- **GIVEN** a mounted MFE receives `update({ user: newUser })`
- **WHEN** the function completes
- **THEN** the rendered DOM SHALL reflect the new user (e.g., updated user menu)
- **AND** the same React root SHALL remain (no unmount happened)

#### Scenario: Update propagates theme change

- **GIVEN** a mounted MFE receives `update({ theme: 'dark' })`
- **WHEN** the function completes
- **THEN** the rendered DOM SHALL apply dark-theme styles
- **AND** the DOM identity (e.g., existing form input focus) SHALL be preserved when possible
