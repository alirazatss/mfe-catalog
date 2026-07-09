## ADDED Requirements

### Requirement: Event Naming Convention
The system SHALL use consistent naming pattern for all events.

#### Scenario: Standard event name format
- **WHEN** defining new event name
- **THEN** name follows pattern: mfe:domain:action
- **AND** example: mfe:auth:logout, mfe:cart:updated, mfe:error:api-failed

#### Scenario: Event names are constants
- **WHEN** event names are referenced in code
- **THEN** names use MFE_EVENTS constant object
- **AND** no magic strings in event emission or subscription

---

### Requirement: Auth Event Catalog
The system SHALL define standard events for authentication lifecycle.

#### Scenario: Auth login event
- **WHEN** user successfully logs in
- **THEN** shell emits MFE_EVENTS.AUTH_LOGIN
- **AND** payload includes { userId, email }

#### Scenario: Auth logout event
- **WHEN** user logs out
- **THEN** shell emits MFE_EVENTS.AUTH_LOGOUT
- **AND** payload includes { userId } (optional)
- **AND** MFEs clear cached user data on receiving event

#### Scenario: Token refreshed event
- **WHEN** access token is refreshed
- **THEN** tokenManager emits MFE_EVENTS.AUTH_TOKEN_REFRESHED
- **AND** payload includes { token }

#### Scenario: Session expired event
- **WHEN** token refresh fails with 401
- **THEN** tokenManager emits MFE_EVENTS.AUTH_SESSION_EXPIRED
- **AND** shell listens and triggers logout

---

### Requirement: Navigation Event Catalog
The system SHALL define standard events for cross-MFE navigation.

#### Scenario: Navigate event
- **WHEN** MFE wants to navigate to different route
- **THEN** MFE emits MFE_EVENTS.NAVIGATE
- **AND** payload includes { path, state, replace }
- **AND** shell navigation listener handles navigation

---

### Requirement: Error Event Catalog
The system SHALL define standard events for error reporting.

#### Scenario: MFE load failed event
- **WHEN** MFE fails to load
- **THEN** shell emits MFE_EVENTS.ERROR_MFE_LOAD_FAILED
- **AND** payload includes { mfeName, error }

#### Scenario: API failed event
- **WHEN** critical API call fails
- **THEN** MFE emits MFE_EVENTS.ERROR_API_FAILED
- **AND** payload includes { endpoint, error }
- **AND** shell can display global error notification

---

### Requirement: Event Payload Type Definitions
The system SHALL define TypeScript interfaces for all event payloads.

#### Scenario: Payload types exported
- **WHEN** importing event types
- **THEN** MFEEventMap interface maps event names to payload types
- **AND** compile-time type safety enforced

#### Scenario: Undefined payload for events without data
- **WHEN** event has no payload (e.g., session expired)
- **THEN** payload type is undefined
- **AND** emitMFEEvent enforces no payload passed
