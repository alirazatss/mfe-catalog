# Dynamic Loader Specification (Delta)

## ADDED Requirements

### Requirement: Loader SHALL integrate with React Router lazy loading

The dynamic loader SHALL work seamlessly with React's lazy() function and React Router's route loaders.

#### Scenario: Loader used with React.lazy()

- **GIVEN** route configuration uses React.lazy()
- **WHEN** lazy component factory calls `loader.loadRemote("mfe-products")`
- **THEN** loader SHALL return Promise resolving to module container
- **AND** React SHALL wait for promise resolution
- **AND** SHALL render Suspense fallback during loading
- **AND** SHALL render MFE component once loaded

#### Scenario: Loader used in route loader function

- **GIVEN** React Router route has loader function
- **WHEN** loader function calls `await loader.loadRemote("mfe-products")`
- **THEN** dynamic loader SHALL return remote container
- **AND** route loader SHALL extract module from container
- **AND** SHALL return module to React Router
- **AND** React Router SHALL render component

#### Scenario: Loader throws error caught by router error boundary

- **GIVEN** route loader calls `loader.loadRemote("invalid-mfe")`
- **WHEN** loader throws error (remote not found)
- **THEN** React Router SHALL catch error
- **AND** SHALL render errorElement component
- **AND** error boundary SHALL display user-friendly message

---

### Requirement: Loader SHALL cache remote containers per route

The dynamic loader SHALL cache loaded remote containers to optimize repeated route access.

#### Scenario: MFE loaded on first route access

- **GIVEN** user navigates to `/products/list` for first time
- **WHEN** loader.loadRemote("mfe-products") is called
- **THEN** loader SHALL fetch mfe-products remoteEntry.js
- **AND** SHALL initialize Module Federation container
- **AND** SHALL cache container in memory
- **AND** SHALL return container

#### Scenario: MFE retrieved from cache on second route access

- **GIVEN** mfe-products was loaded previously
- **AND** user navigates away and returns to `/products/list`
- **WHEN** loader.loadRemote("mfe-products") is called again
- **THEN** loader SHALL return cached container
- **AND** SHALL NOT re-fetch remoteEntry.js
- **AND** SHALL NOT re-initialize container

#### Scenario: Cache cleared manually

- **GIVEN** MFEs are cached in memory
- **WHEN** loader.clearCache() is called
- **THEN** all cached remote containers SHALL be removed
- **AND** next loadRemote() call SHALL fetch fresh

---

### Requirement: Loader SHALL emit events for route-based loading

The dynamic loader SHALL emit events when MFEs are loaded via routing.

#### Scenario: Event emitted when route loader starts

- **GIVEN** user navigates to `/products/list`
- **WHEN** route loader calls loader.loadRemote("mfe-products")
- **THEN** loader SHALL emit `remote:load:start` event
- **AND** event detail SHALL include `{ name: "mfe-products" }`

#### Scenario: Event emitted when route loading succeeds

- **GIVEN** route loader successfully loads mfe-products
- **WHEN** loading completes
- **THEN** loader SHALL emit `remote:load:success` event
- **AND** event detail SHALL include `{ name: "mfe-products" }`

#### Scenario: Event emitted when route loading fails

- **GIVEN** route loader attempts to load "invalid-mfe"
- **WHEN** loading fails
- **THEN** loader SHALL emit `remote:load:error` event
- **AND** event detail SHALL include `{ name: "invalid-mfe", error: Error }`

---

### Requirement: Loader SHALL support route guards integration

The dynamic loader SHALL work with route guard functions that check authentication/authorization before loading MFEs.

#### Scenario: Loader called after guard passes

- **GIVEN** route has authentication guard
- **AND** guard passes (user is authenticated)
- **WHEN** route loader calls loader.loadRemote("mfe-products")
- **THEN** loader SHALL load mfe-products
- **AND** SHALL return container normally

#### Scenario: Loader NOT called if guard fails

- **GIVEN** route has authentication guard
- **AND** guard fails (user not authenticated)
- **WHEN** guard redirects to `/auth/login`
- **THEN** route loader SHALL NOT execute
- **AND** loader.loadRemote() SHALL NOT be called
- **AND** MFE SHALL NOT be fetched

---

### Requirement: Loader SHALL provide status for route configuration

The dynamic loader SHALL expose status information useful for route configuration and debugging.

#### Scenario: Status includes loaded remotes

- **GIVEN** mfe-products and mfe-checkout have been loaded
- **WHEN** loader.getStatus() is called
- **THEN** status SHALL include `loadedRemotes: ["mfe-products", "mfe-checkout"]`

#### Scenario: Status includes failed remotes

- **GIVEN** loading "mfe-invalid" failed previously
- **WHEN** loader.getStatus() is called
- **THEN** status SHALL include `failedRemotes: ["mfe-invalid"]`

#### Scenario: Status shows config loaded state

- **GIVEN** config has been fetched and cached
- **WHEN** loader.getStatus() is called
- **THEN** status SHALL include `configLoaded: true`

---

### Requirement: Loader SHALL handle concurrent route requests

The dynamic loader SHALL correctly handle multiple simultaneous route navigation requests.

#### Scenario: Same MFE requested twice concurrently

- **GIVEN** two routes both use mfe-products
- **WHEN** both routes are accessed nearly simultaneously
- **THEN** loader SHALL fetch mfe-products only once
- **AND** SHALL return same promise to both callers
- **AND** SHALL cache container after first load completes

#### Scenario: Different MFEs requested concurrently

- **GIVEN** user opens `/products/list` and `/checkout/cart` in quick succession
- **WHEN** both route loaders execute
- **THEN** loader SHALL fetch mfe-products AND mfe-checkout in parallel
- **AND** SHALL not block one on the other
- **AND** SHALL cache both containers

---

### Requirement: Loader SHALL work with route preloading

The dynamic loader SHALL support React Router's route preloading for better UX.

#### Scenario: MFE preloaded on link hover

- **GIVEN** user hovers over link to `/products/list`
- **WHEN** React Router preloads the route
- **AND** route loader executes loader.preload("mfe-products")
- **THEN** loader SHALL fetch mfe-products in background
- **AND** SHALL cache container
- **AND** SHALL NOT render MFE yet

#### Scenario: Preloaded MFE renders instantly on navigation

- **GIVEN** mfe-products was preloaded on link hover
- **WHEN** user clicks link and navigates to `/products/list`
- **THEN** route loader SHALL use cached container
- **AND** MFE SHALL render immediately (no loading state)
- **AND** UX SHALL be smooth

---

### Requirement: Loader SHALL support route-based configuration overrides

The dynamic loader SHALL allow routes to specify loading options per MFE.

#### Scenario: Route specifies custom retry for MFE

- **GIVEN** route loader calls `loader.loadRemote("mfe-products", { maxRetries: 5 })`
- **WHEN** loading fails
- **THEN** loader SHALL retry up to 5 times (not default 3)

#### Scenario: Route specifies timeout for MFE

- **GIVEN** route loader calls `loader.loadRemote("mfe-analytics", { timeout: 10000 })`
- **WHEN** loading exceeds 10 seconds
- **THEN** loader SHALL timeout and throw error
