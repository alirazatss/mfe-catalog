## MODIFIED Requirements

### Requirement: Shell SHALL own top-level routes

The shell SHALL match URL paths to micro-frontends using longest-prefix matching against `manifest.features`. The shell SHALL NOT use React Router; matching happens in vanilla TypeScript during bootstrap and on `popstate`/`mfe:navigate` events.

**(Previously: Shell used React Router `<Routes>` and `<Route>` components with `React.lazy()` to match paths to MFEs)**

**Reason for change**: Shell no longer renders React (ADR-0004, thin-shell-bootstrap capability). Route-to-MFE mapping is now data-driven via manifest and executed by a vanilla matcher.

#### Scenario: Shell routes to MFE by path prefix

- **GIVEN** the manifest defines `features["/widget"]` mapping to `mfe-widget` with `basePath: "/widget"`
- **WHEN** the user navigates to `/widget/list`
- **THEN** the shell SHALL match `/widget` from the manifest
- **AND** the shell SHALL load `mfe-widget`
- **AND** the shell SHALL pass `basePath: "/widget"` to the MFE via lifecycle props
- **AND** the browser URL SHALL remain `/widget/list`

#### Scenario: Shell routes to multiple MFEs

- **GIVEN** manifest defines features for `/widget`, `/checkout`, `/analytics`
- **WHEN** the user navigates to `/checkout/cart`
- **THEN** the shell SHALL load `mfe-checkout` (not the others)
- **AND** the shell SHALL pass `basePath: "/checkout"`

#### Scenario: Shell handles root route

- **GIVEN** the manifest defines a feature for `/` (or a designated home MFE)
- **WHEN** the user navigates to `/`
- **THEN** the shell SHALL match `/` from the manifest
- **AND** the shell SHALL mount the configured home MFE
- **AND** the shell SHALL NOT render a built-in React `HomePage` component

#### Scenario: Shell handles unknown route

- **GIVEN** the manifest defines routes but none match `/unknown-page`
- **WHEN** the user navigates to `/unknown-page`
- **THEN** the shell SHALL render a static not-found placeholder into `main-slot`
- **AND** the shell SHALL NOT attempt to load any MFE
- **AND** chrome MFEs SHALL remain mounted

#### Scenario: Longest-prefix wins for overlapping routes

- **GIVEN** manifest has features for `/widget` and `/widget/admin`
- **WHEN** the user navigates to `/widget/admin/users`
- **THEN** the shell SHALL match `/widget/admin` (longer prefix wins)
- **AND** the shell SHALL load the MFE mapped to `/widget/admin`
- **AND** the shell SHALL NOT load the MFE mapped to `/widget`
