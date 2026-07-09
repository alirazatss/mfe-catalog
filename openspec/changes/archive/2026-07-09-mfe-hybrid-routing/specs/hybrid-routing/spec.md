# Hybrid Routing Specification

## ADDED Requirements

### Requirement: Shell SHALL own top-level routes

The shell application SHALL define and manage top-level routes that map URL paths to micro-frontends.

#### Scenario: Shell routes to MFE by path prefix

- **GIVEN** the shell has route configuration with `/products/*` → mfe-products
- **WHEN** user navigates to `/products/list`
- **THEN** the shell router SHALL match the `/products/*` route
- **AND** SHALL load the mfe-products micro-frontend
- **AND** SHALL pass `basePath="/products"` as a prop
- **AND** URL SHALL remain `/products/list` in the browser

#### Scenario: Shell routes to multiple MFEs

- **GIVEN** shell configuration with:
  - `/products/*` → mfe-products
  - `/checkout/*` → mfe-checkout
  - `/analytics/*` → mfe-analytics
- **WHEN** user navigates to `/checkout/cart`
- **THEN** shell SHALL load mfe-checkout (not mfe-products or mfe-analytics)
- **AND** SHALL pass `basePath="/checkout"`

#### Scenario: Shell handles root route

- **GIVEN** shell has route `/` → HomePage component
- **WHEN** user navigates to `/`
- **THEN** shell SHALL render HomePage
- **AND** SHALL NOT load any micro-frontend

#### Scenario: Shell handles 404 for unknown routes

- **GIVEN** shell has defined routes but no match for `/unknown`
- **WHEN** user navigates to `/unknown`
- **THEN** shell SHALL render 404 error page
- **AND** SHALL NOT attempt to load any MFE

---

### Requirement: MFEs SHALL receive basePath prop

Micro-frontends SHALL accept a `basePath` prop that defines their URL namespace within the shell.

#### Scenario: MFE receives basePath from shell

- **GIVEN** shell loads mfe-products at route `/products/*`
- **WHEN** mfe-products component is rendered
- **THEN** mfe-products SHALL receive prop `basePath="/products"`
- **AND** SHALL be able to access this prop in its root component

#### Scenario: MFE uses basePath for internal routes

- **GIVEN** mfe-products has internal routes: `/`, `/:id`, `/new`
- **AND** receives `basePath="/products"`
- **WHEN** mfe-products renders its router
- **THEN** internal routes SHALL be prefixed with basePath
- **AND** route `/` SHALL become `/products/`
- **AND** route `/:id` SHALL become `/products/:id`
- **AND** route `/new` SHALL become `/products/new`

#### Scenario: MFE runs standalone with basePath="/"

- **GIVEN** mfe-products is running in standalone mode
- **WHEN** developer starts mfe-products dev server
- **THEN** mfe-products SHALL use `basePath="/"`
- **AND** internal routes SHALL work at root level
- **AND** route `/:id` SHALL be accessible at `/:id` (not `/products/:id`)

---

### Requirement: MFEs SHALL manage their own sub-routes

Micro-frontends SHALL define and manage their internal routing structure independently of the shell.

#### Scenario: MFE defines multiple sub-routes

- **GIVEN** mfe-products has routes:
  - `/products/` → ProductList
  - `/products/:id` → ProductDetail
  - `/products/:id/edit` → ProductEdit
  - `/products/new` → ProductCreate
- **WHEN** user navigates to `/products/123`
- **THEN** mfe-products SHALL match route `/:id` internally
- **AND** SHALL render ProductDetail component with `id=123`

#### Scenario: MFE handles nested routes

- **GIVEN** mfe-products has nested route `/products/:id/reviews/:reviewId`
- **WHEN** user navigates to `/products/123/reviews/456`
- **THEN** mfe-products SHALL extract both params
- **AND** SHALL render component with `productId=123` and `reviewId=456`

#### Scenario: MFE handles sub-route 404

- **GIVEN** mfe-products is loaded and active
- **WHEN** user navigates to `/products/invalid-path`
- **THEN** mfe-products SHALL render its own 404 component
- **AND** shell SHALL remain unaware of the 404
- **AND** shell navigation SHALL still function

---

### Requirement: Shell SHALL lazy-load MFEs on route access

The shell SHALL only load a micro-frontend when its route is first accessed, not at application startup.

#### Scenario: MFE loaded on first route access

- **GIVEN** user is on homepage `/`
- **AND** mfe-products has not been loaded yet
- **WHEN** user navigates to `/products/list`
- **THEN** shell SHALL initiate loading of mfe-products
- **AND** SHALL show loading indicator during fetch
- **AND** SHALL render mfe-products once loaded
- **AND** mfe-products script SHALL be fetched via dynamic loader

#### Scenario: MFE not loaded until route accessed

- **GIVEN** shell has routes for mfe-products, mfe-checkout, mfe-analytics
- **WHEN** user navigates to `/checkout/cart`
- **THEN** shell SHALL load ONLY mfe-checkout
- **AND** SHALL NOT load mfe-products or mfe-analytics
- **AND** network requests SHALL show only checkout remoteEntry.js

#### Scenario: MFE cached after first load

- **GIVEN** mfe-products was loaded previously
- **AND** user navigates away to `/checkout/cart`
- **WHEN** user navigates back to `/products/list`
- **THEN** shell SHALL NOT re-fetch mfe-products
- **AND** SHALL use cached module container
- **AND** SHALL render immediately (no loading state)

---

### Requirement: MFEs SHALL support both BrowserRouter and MemoryRouter

Micro-frontends SHALL be able to use different router types depending on integration context.

#### Scenario: MFE uses MemoryRouter when integrated

- **GIVEN** mfe-products is loaded by shell
- **AND** receives prop `router="memory"`
- **WHEN** mfe-products initializes its router
- **THEN** mfe-products SHALL use MemoryRouter
- **AND** SHALL NOT manage browser history directly
- **AND** shell's router SHALL control browser history

#### Scenario: MFE uses BrowserRouter in standalone mode

- **GIVEN** mfe-products is running standalone
- **AND** receives prop `router="browser"` (or no prop)
- **WHEN** mfe-products initializes its router
- **THEN** mfe-products SHALL use BrowserRouter
- **AND** SHALL manage browser history
- **AND** back/forward buttons SHALL work within MFE

#### Scenario: MFE supports no internal routing

- **GIVEN** mfe-widget is a simple component with no sub-routes
- **WHEN** shell loads mfe-widget
- **THEN** mfe-widget SHALL render without any router
- **AND** SHALL accept basePath prop (but may ignore it)
- **AND** SHALL function as a simple React component

---

### Requirement: Deep linking SHALL work across shell and MFEs

Users SHALL be able to directly navigate to any MFE sub-route via URL.

#### Scenario: User deep links to MFE sub-route

- **GIVEN** user enters URL `/products/123` in browser
- **AND** shell is not yet loaded
- **WHEN** shell initializes
- **THEN** shell SHALL match route `/products/*`
- **AND** SHALL load mfe-products
- **AND** SHALL pass `basePath="/products"` to mfe-products
- **AND** mfe-products SHALL initialize with route `/123` (relative to basePath)
- **AND** ProductDetail SHALL render with `id=123`

#### Scenario: Deep link preserves query parameters

- **GIVEN** user navigates to `/products/123?variant=blue&size=large`
- **WHEN** shell loads mfe-products
- **THEN** URL query parameters SHALL be preserved
- **AND** mfe-products SHALL have access to `variant=blue` and `size=large`

#### Scenario: Deep link to nested MFE route

- **GIVEN** user navigates to `/products/123/reviews/456`
- **WHEN** shell loads mfe-products
- **THEN** mfe-products SHALL initialize at `/123/reviews/456` (relative)
- **AND** SHALL extract both `productId` and `reviewId` params

---

### Requirement: MFE routing SHALL be framework-agnostic

The shell's routing contract SHALL not require MFEs to use a specific routing library.

#### Scenario: MFE uses React Router

- **GIVEN** mfe-products uses React Router internally
- **WHEN** shell loads mfe-products with basePath
- **THEN** mfe-products SHALL integrate basePath with React Router
- **AND** routing SHALL function correctly

#### Scenario: MFE uses Vue Router

- **GIVEN** mfe-analytics uses Vue.js with Vue Router
- **WHEN** shell loads mfe-analytics with basePath
- **THEN** mfe-analytics SHALL integrate basePath with Vue Router
- **AND** routing SHALL function correctly (even though shell uses React Router)

#### Scenario: MFE uses no router (custom implementation)

- **GIVEN** mfe-custom uses manual URL parsing (no router library)
- **WHEN** shell loads mfe-custom with basePath
- **THEN** mfe-custom SHALL parse URLs relative to basePath
- **AND** routing SHALL function correctly

---

### Requirement: Browser history SHALL be managed consistently

Browser history (back/forward buttons) SHALL function correctly across shell and MFE navigation.

#### Scenario: Back button navigates within MFE

- **GIVEN** user navigates `/products/` → `/products/123` → `/products/123/edit`
- **WHEN** user clicks browser back button
- **THEN** browser SHALL navigate to `/products/123`
- **AND** MFE SHALL render ProductDetail (not ProductEdit)
- **AND** MFE SHALL remain loaded (no re-fetch)

#### Scenario: Back button navigates across MFEs

- **GIVEN** user navigates `/` → `/products/123` → `/checkout/cart`
- **WHEN** user clicks back button
- **THEN** browser SHALL navigate to `/products/123`
- **AND** shell SHALL unload mfe-checkout
- **AND** shell SHALL render mfe-products (from cache)

#### Scenario: Forward button works after back navigation

- **GIVEN** user navigates `/products/123` → `/checkout/cart`
- **AND** clicks back button (now at `/products/123`)
- **WHEN** user clicks forward button
- **THEN** browser SHALL navigate to `/checkout/cart`
- **AND** shell SHALL load mfe-checkout again

---

### Requirement: URL structure SHALL be predictable and SEO-friendly

URLs SHALL follow a clear, hierarchical structure that supports search engine optimization.

#### Scenario: MFE routes follow consistent pattern

- **GIVEN** shell routes:
  - `/products/*` → mfe-products
  - `/checkout/*` → mfe-checkout
- **WHEN** examining URL structure
- **THEN** all product routes SHALL start with `/products/`
- **AND** all checkout routes SHALL start with `/checkout/`
- **AND** URL structure SHALL be self-documenting

#### Scenario: URLs are bookmarkable

- **GIVEN** user is viewing `/products/123/edit`
- **WHEN** user bookmarks the page
- **AND** returns to bookmark later
- **THEN** browser SHALL navigate to `/products/123/edit`
- **AND** mfe-products SHALL render ProductEdit with `id=123`
- **AND** page state SHALL be restored from URL

#### Scenario: URLs contain no framework artifacts

- **GIVEN** shell and MFEs use React Router
- **WHEN** examining URLs
- **THEN** URLs SHALL NOT contain hash fragments (no `#/products`)
- **AND** URLs SHALL NOT contain query param routing (`?route=products`)
- **AND** URLs SHALL be clean paths (`/products/123`)
