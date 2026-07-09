# Module Federation Host Specification (Delta)

## MODIFIED Requirements

### Requirement: Host application SHALL load federated modules

The host application SHALL dynamically load remote federated modules via routing system using the dynamic loader and generated configuration.

**(Previously: Loaded on component mount, now loads based on route access)**

**Reason for change**: Enable lazy loading of MFEs only when their routes are accessed, improving initial load performance and supporting route-based architecture.

#### Scenario: Host initializes router and loader at startup

- **GIVEN** the host application is starting
- **WHEN** the app initialization runs
- **THEN** the dynamic loader SHALL fetch `/remotes.config.json`
- **AND** the config SHALL be validated against JSON Schema
- **AND** the loader SHALL cache the config in memory
- **AND** the router SHALL be initialized with route configuration
- **AND** initialization success SHALL be logged to console

#### Scenario: Host loads remote via route access

- **GIVEN** the dynamic loader is initialized
- **AND** router has route `/products/*` configured for "mfe-products"
- **WHEN** user navigates to `/products/list`
- **THEN** the router SHALL match `/products/*` route
- **AND** the route loader SHALL call `loader.loadRemote("mfe-products")`
- **AND** the loader SHALL inject the remote's script tag
- **AND** the loader SHALL initialize Module Federation sharing
- **AND** the remote container SHALL be returned to router
- **AND** router SHALL render mfe-products with `basePath="/products"`
- **AND** remote load success SHALL be logged to console

#### Scenario: Host lazy-loads MFE on first route access

- **GIVEN** user has not yet accessed `/products/*` routes
- **AND** mfe-products is not loaded
- **WHEN** user navigates to `/products/123`
- **THEN** router loader SHALL initiate loading of mfe-products
- **AND** Suspense boundary SHALL show loading indicator
- **AND** mfe-products SHALL be fetched via dynamic loader
- **AND** once loaded, mfe-products SHALL render with route `/123` (relative to basePath)

#### Scenario: MFE not loaded until route accessed

- **GIVEN** shell has routes for `/products/*`, `/checkout/*`, `/analytics/*`
- **WHEN** user navigates to `/checkout/cart`
- **THEN** shell SHALL load ONLY mfe-checkout
- **AND** SHALL NOT load mfe-products or mfe-analytics
- **AND** network SHALL only fetch checkout remoteEntry.js

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
- **WHEN** the host navigates to route configured for "unknown-remote"
- **THEN** the loader SHALL throw error "Remote 'unknown-remote' not found in config"
- **AND** error boundary SHALL catch the error
- **AND** user SHALL see fallback UI with helpful message

#### Scenario: Remote is disabled in config

- **GIVEN** config contains "mfe-analytics" with enabled: false
- **WHEN** the host navigates to route configured for "mfe-analytics"
- **THEN** the loader SHALL throw error "Remote 'mfe-analytics' is disabled"
- **AND** error boundary SHALL display "Remote is currently disabled"
- **AND** error SHALL be logged to console

#### Scenario: Remote module fails to load

- **WHEN** a federated remote module fails to load (network error or module not found)
- **THEN** the system SHALL display an error boundary fallback UI
- **AND** the error SHALL be logged to the console
- **AND** the rest of the host application SHALL continue to function

---

## ADDED Requirements

### Requirement: Host SHALL define route configuration for MFEs

The host application SHALL maintain a route configuration that maps URL paths to micro-frontends.

#### Scenario: Route configuration maps paths to MFEs

- **GIVEN** host has route configuration
- **WHEN** configuration is defined
- **THEN** configuration SHALL include:
  - Route path (e.g., `/products/*`)
  - MFE name (e.g., `"mfe-products"`)
  - basePath to pass to MFE (e.g., `"/products"`)
  - Optional: authentication guards
  - Optional: authorization guards

#### Scenario: Route configuration is type-safe

- **GIVEN** route configuration is defined in TypeScript
- **WHEN** developer adds new route
- **THEN** TypeScript SHALL enforce required fields
- **AND** SHALL validate MFE names exist in config
- **AND** SHALL provide autocomplete for route options

---

### Requirement: Host SHALL pass basePath to loaded MFEs

The host application SHALL pass the basePath prop to each loaded micro-frontend.

#### Scenario: Host passes basePath matching route

- **GIVEN** route `/products/*` is configured
- **WHEN** host loads mfe-products at this route
- **THEN** host SHALL pass prop `basePath="/products"`
- **AND** mfe-products SHALL receive this prop in root component

#### Scenario: basePath matches route namespace

- **GIVEN** route `/checkout/*` loads mfe-checkout
- **WHEN** user navigates to `/checkout/cart`
- **THEN** basePath SHALL be `"/checkout"` (not `"/checkout/cart"`)
- **AND** MFE internal router SHALL handle `/cart` relative to basePath

---

### Requirement: Host SHALL integrate router with Suspense boundaries

The host SHALL show loading states while MFEs are being fetched.

#### Scenario: Loading indicator shown during MFE fetch

- **GIVEN** user navigates to `/products/list` for first time
- **AND** mfe-products is not loaded yet
- **WHEN** route loader initiates fetch
- **THEN** Suspense boundary SHALL render loading indicator
- **AND** indicator SHALL remain visible until mfe-products loads
- **AND** SHALL hide once MFE renders

#### Scenario: Suspense boundary uses custom loading component

- **GIVEN** host defines custom LoadingSpinner component
- **WHEN** MFE is loading
- **THEN** Suspense SHALL render LoadingSpinner
- **AND** SHALL match application's design system

---

### Requirement: Host SHALL support route-based code splitting

The host SHALL leverage React Router's lazy loading for automatic code splitting.

#### Scenario: Each MFE loaded as separate chunk

- **GIVEN** host uses React.lazy() with dynamic loader
- **WHEN** building for production
- **THEN** each MFE SHALL be in separate JavaScript chunk
- **AND** browser SHALL only download MFE when route accessed
- **AND** initial bundle SHALL NOT include MFE code

#### Scenario: Shared dependencies not duplicated

- **GIVEN** multiple MFEs loaded
- **WHEN** MFEs share dependencies (e.g., React)
- **THEN** shared dependencies SHALL be loaded once
- **AND** Module Federation sharing SHALL prevent duplication

---

### Requirement: Host SHALL register navigation event listeners

The host SHALL listen for cross-MFE navigation events and handle routing.

#### Scenario: Host registers listener on mount

- **GIVEN** host root component is mounting
- **WHEN** useEffect hook runs
- **THEN** host SHALL register listener for `mfe:navigate` events
- **AND** listener SHALL be active before MFEs load

#### Scenario: Host handles navigation event

- **GIVEN** host is listening for navigation events
- **WHEN** MFE dispatches `mfe:navigate` event with `{ path: "/checkout/cart" }`
- **THEN** host SHALL call router.navigate("/checkout/cart")
- **AND** SHALL load mfe-checkout
- **AND** browser URL SHALL change to `/checkout/cart`

#### Scenario: Host cleans up listener on unmount

- **GIVEN** host component is unmounting
- **WHEN** cleanup function runs
- **THEN** host SHALL remove `mfe:navigate` event listener
- **AND** SHALL prevent memory leaks
