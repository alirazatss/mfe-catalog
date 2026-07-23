## ADDED Requirements

### Requirement: Shell SHALL expose `window.__MFE_NAVIGATION__` global bridge

The shell bootstrap SHALL create a Navigation Bridge instance and expose it at `window.__MFE_NAVIGATION__` matching the `MFENavigationAPI` interface exported from `@mfe-runtine/dynamic-loader`.

#### Scenario: Bridge exposed at bootstrap

- **GIVEN** the shell finishes bootstrap
- **WHEN** any script queries `window.__MFE_NAVIGATION__`
- **THEN** the value SHALL be an object with `version: "1.0.0"`
- **AND** the object SHALL expose `navigate`, `back`, `forward`, `go`, `getCurrentPath`, `getCurrentQuery`, `onNavigate`, `isActive` as functions

#### Scenario: Bridge set up before any MFE mounts

- **GIVEN** the shell bootstrap sequence
- **WHEN** ordering setup steps
- **THEN** `setupNavigationBridge(loader)` SHALL run AFTER `tokenManager.initialize()` and BEFORE the first `loader.load(...)` call
- **AND** every MFE mounted during bootstrap SHALL see `window.__MFE_NAVIGATION__` defined

#### Scenario: Idempotent setup

- **GIVEN** `setupNavigationBridge(loader)` has been called
- **WHEN** it is called a second time in the same page load
- **THEN** the second call SHALL be a no-op
- **AND** `window.__MFE_NAVIGATION__` SHALL retain the original instance so existing subscribers are unaffected

---

### Requirement: Bridge `navigate` SHALL update history and trigger MFE load

Calling `window.__MFE_NAVIGATION__.navigate(path, options?)` SHALL update the browser history AND cause the shell to mount the matching feature MFE in `main-slot`.

#### Scenario: Push navigation

- **GIVEN** the current URL is `/dashboard`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.navigate('/widget')`
- **THEN** the bridge SHALL call `history.pushState(null, '', '/widget')`
- **AND** the bridge SHALL notify all `onNavigate` subscribers with a `{ path: '/widget', type: 'push' }` event
- **AND** the bridge SHALL invoke the loader to swap the feature MFE in `main-slot`
- **AND** the browser URL SHALL be `/widget`

#### Scenario: Replace navigation

- **GIVEN** the current URL is `/widget`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.navigate('/widget/list', { replace: true })`
- **THEN** the bridge SHALL call `history.replaceState(null, '', '/widget/list')`
- **AND** subscribers SHALL be notified with `type: 'replace'`
- **AND** the browser history stack SHALL NOT grow

#### Scenario: Navigate with query params

- **GIVEN** an MFE calls `window.__MFE_NAVIGATION__.navigate('/search', { query: { q: 'foo', page: '2' } })`
- **WHEN** the bridge builds the target URL
- **THEN** the resulting URL SHALL be `/search?q=foo&page=2`
- **AND** subscribers SHALL receive `event.query` as an `URLSearchParams` object

#### Scenario: Same-path navigation is a no-op

- **GIVEN** the current URL is `/widget`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.navigate('/widget')`
- **THEN** the bridge SHALL NOT push a new history entry
- **AND** the loader SHALL NOT swap MFEs
- **AND** subscribers SHALL NOT be notified

#### Scenario: Popstate handling

- **GIVEN** the user has navigated `/widget` → `/dashboard`
- **WHEN** the user clicks the browser back button
- **THEN** `popstate` fires with the new URL `/widget`
- **AND** the bridge SHALL notify subscribers with `type: 'pop'`
- **AND** the bridge SHALL invoke the loader to swap the feature MFE

---

### Requirement: Bridge SHALL expose imperative history controls

The bridge SHALL provide `back()`, `forward()`, and `go(delta)` methods that delegate to `window.history` and internally cause a `popstate` event.

#### Scenario: `back()` navigates one step back

- **GIVEN** history contains `/widget` and current is `/dashboard`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.back()`
- **THEN** the bridge SHALL call `window.history.back()`
- **AND** popstate SHALL fire
- **AND** the URL SHALL become `/widget`
- **AND** subscribers SHALL be notified with `type: 'pop'`

#### Scenario: `forward()` navigates one step forward

- **GIVEN** the user has just gone back from `/dashboard` to `/widget`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.forward()`
- **THEN** the bridge SHALL call `window.history.forward()`
- **AND** the URL SHALL become `/dashboard`

#### Scenario: `go(delta)` navigates by offset

- **GIVEN** the user has navigated `/a` → `/b` → `/c`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.go(-2)`
- **THEN** the bridge SHALL call `window.history.go(-2)`
- **AND** the URL SHALL become `/a`

---

### Requirement: Bridge SHALL provide synchronous path and query accessors

MFEs SHALL be able to synchronously read the current URL path and query parameters via bridge methods without subscribing to events.

#### Scenario: `getCurrentPath` returns pathname

- **GIVEN** the URL is `/widget/list?q=foo`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.getCurrentPath()`
- **THEN** the return value SHALL be `/widget/list`

#### Scenario: `getCurrentQuery` returns URLSearchParams

- **GIVEN** the URL is `/search?q=foo&page=2`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.getCurrentQuery()`
- **THEN** the return value SHALL be an `URLSearchParams` instance
- **AND** `params.get('q')` SHALL equal `'foo'`
- **AND** `params.get('page')` SHALL equal `'2'`

---

### Requirement: Bridge SHALL support reactive subscriptions

The bridge SHALL provide `onNavigate(callback)` that returns a cleanup function; the callback SHALL be invoked on every navigation.

#### Scenario: Subscriber receives events

- **GIVEN** an MFE calls `const cleanup = window.__MFE_NAVIGATION__.onNavigate(handler)`
- **WHEN** a subsequent navigation to `/widget` occurs (via `navigate`, `back`, `forward`, or `popstate`)
- **THEN** `handler` SHALL be invoked with an event object containing `{ path: '/widget', query, state, type }`

#### Scenario: Cleanup unsubscribes

- **GIVEN** an MFE received a `cleanup` function from `onNavigate(handler)`
- **WHEN** the MFE calls `cleanup()`
- **AND** a further navigation occurs
- **THEN** `handler` SHALL NOT be invoked

#### Scenario: Multiple subscribers all notified

- **GIVEN** subscribers `A`, `B`, `C` are all registered
- **WHEN** navigation to `/widget` occurs
- **THEN** all three subscribers SHALL be invoked exactly once
- **AND** invocation order SHALL match registration order

---

### Requirement: Bridge SHALL provide `isActive` route matching

The bridge SHALL expose `isActive(path, options?)` that reports whether the current URL matches the given path via prefix (default) or exact matching.

#### Scenario: Prefix match by default

- **GIVEN** the current URL is `/widget/list`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.isActive('/widget')`
- **THEN** the return value SHALL be `true`

#### Scenario: Exact match when requested

- **GIVEN** the current URL is `/widget/list`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.isActive('/widget', { exact: true })`
- **THEN** the return value SHALL be `false`

#### Scenario: Root path handling

- **GIVEN** the current URL is `/dashboard`
- **WHEN** an MFE calls `window.__MFE_NAVIGATION__.isActive('/')`
- **THEN** the return value SHALL be `true` (prefix match) but `false` if `{ exact: true }` is passed

---

### Requirement: Bridge SHALL emit `mfe:navigation:changed` events

The bridge SHALL dispatch a `mfe:navigation:changed` `CustomEvent` on `window` for every navigation, in addition to invoking `onNavigate` subscribers.

#### Scenario: Observability event fired

- **GIVEN** any listener registered via `window.addEventListener('mfe:navigation:changed', handler)`
- **WHEN** the bridge processes a navigation
- **THEN** the event SHALL fire with `event.detail = { path, query, state, type }`
- **AND** the event SHALL fire regardless of `onNavigate` subscriber count
