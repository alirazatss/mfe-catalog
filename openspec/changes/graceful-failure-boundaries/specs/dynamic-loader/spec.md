## ADDED Requirements

### Requirement: Loader SHALL expose `retryLoad(name, slotId)` for slot-level recovery

The loader SHALL expose a `retryLoad(name, slotId)` method that clears the slot's fallback UI, re-invokes `load(name, slotId, props)`, and reports success or failure.

#### Scenario: Retry clears fallback and reloads

- **GIVEN** a slot displays the load-failure fallback for `mfe-widget`
- **WHEN** `loader.retryLoad('mfe-widget', 'main-slot')` is called
- **THEN** the loader SHALL clear the fallback DOM from `main-slot`
- **AND** the loader SHALL invoke the full lifecycle (`bootstrap` if not already, then `mount`)
- **AND** on success the slot SHALL contain the MFE's rendered UI

#### Scenario: Retry reports and shows fallback again on continued failure

- **GIVEN** `retryLoad` is called for an MFE whose CDN is still down
- **WHEN** the retry fails
- **THEN** the loader SHALL emit `mfe:load:failed` with the retry attempt count
- **AND** the slot SHALL display the fallback again with the same `Try again` action

---

### Requirement: Loader SHALL emit standardized error events

The loader SHALL emit `mfe:load:failed`, `mfe:runtime:error`, `mfe:loaded`, and `mfe:load:exhausted` events on `window` matching the ADR-0006 contract, in addition to the existing lifecycle events from the `mfe-lifecycle-contract` capability.

#### Scenario: Load failure event

- **GIVEN** the loader fails to load an MFE
- **WHEN** the error is caught
- **THEN** a `CustomEvent` with type `mfe:load:failed` SHALL be dispatched on `window`
- **AND** `event.detail` SHALL contain `{ name, slot, error, attempt: number, timestamp }`

#### Scenario: Load success event

- **GIVEN** the loader mounts an MFE successfully
- **WHEN** the lifecycle completes
- **THEN** a `CustomEvent` with type `mfe:loaded` SHALL be dispatched
- **AND** `event.detail` SHALL contain `{ name, slot, timestamp }`

#### Scenario: Retry exhaustion event

- **GIVEN** three retry attempts for the same MFE fail within 60 seconds
- **WHEN** the third retry fails
- **THEN** the loader SHALL emit `mfe:load:exhausted` with `{ name, slot, attempts: 3, timestamp }`
- **AND** the loader SHALL stop scheduling further automatic retries for that MFE until page reload

---

### Requirement: Loader SHALL escape all manifest-derived strings before injection into DOM

Any manifest field (`name`, `slot`, `error.message`) rendered into the slot fallback SHALL be escaped to prevent XSS.

#### Scenario: Malicious manifest name is escaped

- **GIVEN** a manifest entry with `name: '<img src=x onerror=alert(1)>'`
- **WHEN** the loader renders the slot fallback for this entry
- **THEN** the fallback DOM SHALL contain the escaped text
- **AND** no `<img>` element SHALL be created from the manifest name
- **AND** the attribute `data-mfe` SHALL contain the attribute-escaped value

#### Scenario: Error message escaped

- **GIVEN** an error message containing HTML characters
- **WHEN** the fallback renders the error text in development mode
- **THEN** the message SHALL be escaped
- **AND** production mode SHALL NOT render the error message text at all (generic fallback only)
