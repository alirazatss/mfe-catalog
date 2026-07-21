## ADDED Requirements

### Requirement: Header MFE SHALL implement the standard MFE lifecycle contract

`apps/mfe-header` SHALL expose a `./lifecycle` module implementing `MFELifecycle` and be mountable via the dynamic loader into the `header-slot`.

#### Scenario: Loader successfully mounts the header

- **GIVEN** the shell manifest includes `chrome.header` pointing at the header's `remoteEntry.js`
- **WHEN** the shell bootstrap runs
- **THEN** the loader SHALL fetch and validate the header's lifecycle module
- **AND** the loader SHALL call `bootstrap` (once) then `mount({ container: #header-slot, ... })`
- **AND** the `#header-slot` element SHALL contain the rendered header UI

#### Scenario: Header persists across feature MFE swaps

- **GIVEN** the header is mounted and a feature MFE is loaded into `main-slot`
- **WHEN** the user navigates to a different route causing `main-slot` to swap MFEs
- **THEN** the header SHALL remain mounted (no `unmount` call)
- **AND** the header's internal state (e.g., dropdown open/closed) SHALL NOT reset

#### Scenario: Header updates via lifecycle `update`

- **GIVEN** the header is mounted with `props.user` set
- **WHEN** `loader.update('mfe-header', { user: newUser, theme: 'dark' })` is called
- **THEN** the header SHALL invoke its `update` function
- **AND** the rendered user display SHALL reflect `newUser`
- **AND** the visual theme SHALL switch to dark without remounting

---

### Requirement: Header SHALL render corporate branding and navigation

The header SHALL render (in order left-to-right in LTR mode): corporate logo, primary navigation, spacer, search bar stub, theme toggle stub, user menu.

#### Scenario: Logo renders

- **GIVEN** the header is mounted with no explicit logo prop
- **WHEN** the DOM is inspected
- **THEN** the header SHALL render an `<img>` or SVG element with an accessible label `Home`
- **AND** the logo click SHALL trigger navigation to `/`

#### Scenario: Logo override via config

- **GIVEN** the manifest supplies `config.logo = "/customer-logo.svg"`
- **WHEN** the header mounts
- **THEN** the rendered logo `src` (or SVG use) SHALL reflect the custom URL

#### Scenario: Navigation items rendered from manifest config

- **GIVEN** manifest supplies `config.navItems = [{ label: "Widgets", path: "/widget" }, { label: "Dashboard", path: "/dashboard" }]`
- **WHEN** the header mounts
- **THEN** the navigation region SHALL render exactly two clickable items with labels `Widgets` and `Dashboard`
- **AND** each item's ARIA `role` SHALL be `link` (or equivalent semantic)

#### Scenario: Role-based navigation visibility

- **GIVEN** manifest supplies a nav item `{ label: "Admin", path: "/admin", requiredRoles: ["admin"] }`
- **AND** the current user's roles do NOT include `admin`
- **WHEN** the header mounts
- **THEN** the `Admin` nav item SHALL NOT be rendered
- **AND** the header SHALL log this behavior in dev mode

---

### Requirement: Header SHALL respond to navigation events

Clicking a navigation item SHALL trigger a cross-MFE navigation. The header SHALL prefer `window.__MFE_NAVIGATION__.navigate` when available; otherwise it SHALL emit an `mfe:navigate` event on the shared event bus.

#### Scenario: Navigation via bridge

- **GIVEN** `window.__MFE_NAVIGATION__` is defined
- **WHEN** the user clicks the `Widgets` nav item
- **THEN** the header SHALL call `window.__MFE_NAVIGATION__.navigate('/widget')`
- **AND** the header SHALL NOT emit an `mfe:navigate` event
- **AND** no default anchor behavior SHALL run (`preventDefault` called)

#### Scenario: Navigation via event-bus fallback

- **GIVEN** `window.__MFE_NAVIGATION__` is `undefined`
- **WHEN** the user clicks the `Widgets` nav item
- **THEN** the header SHALL call `emitMFEEvent('mfe:navigate', { path: '/widget' })`
- **AND** `preventDefault` SHALL be called on the click event

#### Scenario: Logo click navigates home

- **GIVEN** the header is mounted
- **WHEN** the user clicks the corporate logo
- **THEN** the header SHALL trigger navigation to `/`

---

### Requirement: Header SHALL highlight the active navigation item

The header SHALL visually indicate which navigation item corresponds to the current `window.location.pathname`.

#### Scenario: Exact path match highlights item

- **GIVEN** the current URL is `/widget`
- **AND** nav includes an item with `path: "/widget"`
- **WHEN** the header renders
- **THEN** the `/widget` item SHALL carry an `aria-current="page"` attribute
- **AND** the item SHALL carry a class or style indicating active state

#### Scenario: Sub-path match highlights parent

- **GIVEN** the current URL is `/widget/123/edit`
- **AND** nav includes an item with `path: "/widget"`
- **WHEN** the header renders
- **THEN** the `/widget` item SHALL be highlighted (URL starts with the nav path)

#### Scenario: Active state updates on route change

- **GIVEN** the header is mounted with `/widget` active
- **WHEN** the browser fires `popstate` after navigating to `/dashboard`
- **THEN** the header SHALL update to highlight the `/dashboard` item
- **AND** no full re-render or remount SHALL occur

---

### Requirement: Header SHALL render user menu with logout

The header SHALL render a user menu showing the current user's name (or email fallback) and provide a logout action.

#### Scenario: Authenticated user menu

- **GIVEN** `window.__MFE_AUTH__.isAuthenticated()` returns `true` and the token decodes to `{ email: "a@b.com", name: "Alice" }`
- **WHEN** the header renders
- **THEN** the user menu SHALL display the name `Alice`
- **AND** the menu SHALL include a `Logout` action

#### Scenario: Unauthenticated user menu

- **GIVEN** `window.__MFE_AUTH__.isAuthenticated()` returns `false`
- **WHEN** the header renders
- **THEN** the user menu SHALL render a `Sign in` button instead
- **AND** clicking `Sign in` SHALL navigate to `/login`

#### Scenario: Logout triggers auth bridge

- **GIVEN** the user is authenticated and the user menu is visible
- **WHEN** the user clicks `Logout`
- **THEN** the header SHALL call `window.__MFE_AUTH__.logout()`
- **AND** upon successful logout the header SHALL navigate to `/login`

#### Scenario: Token change updates display

- **GIVEN** the header is mounted with a specific user
- **WHEN** a `mfe:auth:token-updated` event fires with a new token that decodes to a different name
- **THEN** the header's user display SHALL update to reflect the new name without remounting

#### Scenario: Missing `window.__MFE_AUTH__` handled gracefully

- **GIVEN** `window.__MFE_AUTH__` is `undefined` at mount time (misconfigured shell)
- **WHEN** the header renders
- **THEN** the header SHALL render an unauthenticated user menu (`Sign in` CTA)
- **AND** the header SHALL log a `console.warn` in development mode

---

### Requirement: Header SHALL keep bundle size under 50 KB gzipped

The built `remoteEntry.js` plus the header's own chunks SHALL be smaller than 50 KB gzipped combined.

#### Scenario: CI bundle-size check enforces budget

- **GIVEN** the header project has a bundle-size check configured
- **WHEN** the CI pipeline builds the package
- **THEN** the check SHALL compare the total gzipped size of the header's output chunks against a 50 KB budget
- **AND** the CI SHALL fail the build with a descriptive error if the budget is exceeded
