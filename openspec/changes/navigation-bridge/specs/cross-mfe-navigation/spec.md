## MODIFIED Requirements

### Requirement: MFEs SHALL emit navigation events for cross-MFE routing

Micro-frontends SHALL request cross-MFE navigation by calling `window.__MFE_NAVIGATION__.navigate(path, options?)` when the bridge is available. MFEs MAY dispatch a `mfe:navigate` custom event via `@mfe-runtine/events` as a fallback when the bridge is not yet initialized.

**(Previously: MFEs SHALL dispatch the `mfe:navigate` custom event as the only mechanism)**

**Reason for change**: The Navigation Bridge (`navigation-bridge` capability, ADR-0005) provides richer functionality (query params, imperative back/forward, active-route detection, subscribers). The event bus remains as a backward-compatible fallback so existing MFEs continue to work without modification.

#### Scenario: MFE prefers the bridge when available

- **GIVEN** an MFE handles a user action to navigate to `/checkout/cart`
- **AND** `window.__MFE_NAVIGATION__` is defined
- **WHEN** the MFE invokes its navigation helper
- **THEN** the helper SHALL call `window.__MFE_NAVIGATION__.navigate('/checkout/cart')`
- **AND** the helper SHALL NOT emit an `mfe:navigate` event

#### Scenario: MFE falls back to event bus when bridge missing

- **GIVEN** an MFE handles a user action to navigate to `/checkout/cart`
- **AND** `window.__MFE_NAVIGATION__` is `undefined` (older shell)
- **WHEN** the MFE invokes its navigation helper
- **THEN** the helper SHALL call `emitMFEEvent('mfe:navigate', { path: '/checkout/cart' })`
- **AND** the helper SHALL not throw

#### Scenario: MFE emits event with query parameters

- **GIVEN** an MFE wants to navigate to `/checkout/cart?productId=123&qty=2`
- **AND** the bridge is available
- **WHEN** the MFE invokes navigation
- **THEN** the MFE MAY call `window.__MFE_NAVIGATION__.navigate('/checkout/cart', { query: { productId: '123', qty: '2' } })`
- **AND** the resulting URL SHALL be `/checkout/cart?productId=123&qty=2`

---

### Requirement: Shell SHALL listen for navigation events and route

The shell SHALL route based on the Navigation Bridge. The bridge SHALL also subscribe to the legacy `mfe:navigate` event bus and forward those events to itself, so MFEs using the event bus continue to work identically to MFEs using the bridge.

**(Previously: The shell listened for `mfe:navigate` events directly and called React Router's `useNavigate`)**

**Reason for change**: Consolidating routing into the bridge (ADR-0005) makes chrome MFEs, analytics, and history controls first-class. Preserving the event-bus path ensures zero-break migration.

#### Scenario: Shell handles bridge navigation

- **GIVEN** the bridge is set up
- **WHEN** any MFE calls `window.__MFE_NAVIGATION__.navigate('/widget')`
- **THEN** the bridge SHALL push to history, notify subscribers, and drive the loader to swap the feature MFE in `main-slot`
- **AND** the browser URL SHALL update to `/widget`

#### Scenario: Shell handles legacy event bus navigation

- **GIVEN** the bridge is set up
- **AND** the bridge internally subscribes to `mfe:navigate` events
- **WHEN** an MFE dispatches `mfe:navigate` with `{ path: '/checkout/cart' }`
- **THEN** the bridge SHALL receive the event
- **AND** the bridge SHALL call its own `navigate('/checkout/cart')` method
- **AND** the observable behavior SHALL be identical to a direct bridge call

#### Scenario: Shell listener registered before MFEs load

- **GIVEN** the shell is initializing
- **WHEN** `setupNavigationBridge(loader)` runs during bootstrap
- **THEN** the bridge SHALL register both a `popstate` listener AND an `mfe:navigate` bus subscription
- **AND** both SHALL be active BEFORE any MFE mounts
- **AND** all subsequent navigation attempts SHALL be captured

---

### Requirement: MFEs SHALL NOT import shell router

Micro-frontends SHALL remain decoupled from the shell's routing implementation. MFEs SHALL use `window.__MFE_NAVIGATION__` (with event-bus fallback) rather than importing the shell's routing code.

#### Scenario: MFE navigates without router dependency

- **GIVEN** an MFE wants to navigate to `/checkout`
- **WHEN** implementing navigation logic
- **THEN** the MFE SHALL NOT import from the shell package
- **AND** the MFE SHALL NOT import React Router configuration from the shell
- **AND** the MFE SHALL use `window.__MFE_NAVIGATION__` OR `emitMFEEvent('mfe:navigate', ...)`

#### Scenario: MFE internal routing remains

- **GIVEN** an MFE uses React Router internally for its own sub-routes (`/widget/:id`)
- **WHEN** the MFE's `Link` is clicked
- **THEN** the internal React Router SHALL handle the sub-route change without involving the bridge
- **AND** the bridge SHALL still receive `popstate` events for browser back/forward affecting the URL
