## ADDED Requirements

### Requirement: Sample MFE SHALL demonstrate the lifecycle contract

`apps/mfe-widget` SHALL serve as the reference implementation of the MFE lifecycle contract, showing how a React MFE wraps its App component in `bootstrap`/`mount`/`unmount`/`update` functions.

#### Scenario: Reference lifecycle module exists

- **GIVEN** the sample MFE `apps/mfe-widget`
- **WHEN** the repository is inspected
- **THEN** the file `apps/mfe-widget/src/index.tsx` SHALL exist
- **AND** the file SHALL export `bootstrap`, `mount`, `unmount` as async functions (and MAY export `update`)
- **AND** the file SHALL be listed in `apps/mfe-widget/vite.config.ts` under `exposes` at key `./lifecycle`

#### Scenario: Reference wrapper renders App into container

- **GIVEN** the loader mounts `mfe-widget` into a container
- **WHEN** `mount(props)` executes
- **THEN** the wrapper SHALL use React 19 `createRoot(props.container)` (created once per mount)
- **AND** SHALL render `<StrictMode><App {...props} /></StrictMode>` into that root
- **AND** the container SHALL contain the rendered widget UI

#### Scenario: Reference wrapper unmounts cleanly

- **GIVEN** the widget was mounted
- **WHEN** `unmount(props)` executes
- **THEN** the wrapper SHALL call `root.unmount()`
- **AND** SHALL null the stored root reference
- **AND** any subscriptions registered inside `bootstrap` or `mount` SHALL be released

#### Scenario: Reference wrapper implements `update` for prop changes

- **GIVEN** the widget is mounted and receives new props via `loader.update`
- **WHEN** `update(props)` executes
- **THEN** the wrapper SHALL re-render into the existing React root without unmounting
- **AND** internal component state (e.g., counter value) SHALL be preserved when React reconciliation allows

#### Scenario: App component remains independently testable

- **GIVEN** the wrapper file wraps `App.tsx`
- **WHEN** unit tests import `App` directly from `./App.tsx`
- **THEN** existing tests SHALL continue to render the component in isolation
- **AND** SHALL NOT require any Module Federation runtime
