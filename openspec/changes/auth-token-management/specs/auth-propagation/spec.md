## ADDED Requirements

### Requirement: Auth Context Passed via Props

The system SHALL pass authentication context from shell to MFEs via component props.

#### Scenario: Shell passes auth to MFE on mount

- **WHEN** shell lazy-loads MFE component
- **THEN** shell passes auth object as prop containing token and user
- **AND** MFE receives { token: string, user: User } object
- **AND** MFE can make authenticated API calls immediately

#### Scenario: Auth prop undefined when not authenticated

- **WHEN** shell loads MFE for unauthenticated user
- **THEN** shell passes auth prop as undefined
- **AND** MFE renders public content only
- **AND** MFE does not attempt authenticated requests

---

### Requirement: Auth Change Events for Real-Time Updates

The system SHALL emit events when authentication state changes.

#### Scenario: Token refreshed event

- **WHEN** access token is refreshed automatically
- **THEN** shell emits 'auth:token-refreshed' custom event
- **AND** event detail includes new token
- **AND** MFEs listening to event update their API clients

#### Scenario: Session expired event

- **WHEN** token refresh fails with 401
- **THEN** token manager emits 'auth:session-expired' event
- **AND** shell listens for event and triggers logout
- **AND** MFEs can listen to clean up state

#### Scenario: Logout event

- **WHEN** user clicks logout
- **THEN** shell emits 'auth:logout' event
- **AND** MFEs can clear cached user data

---

### Requirement: MFE Token Manager Integration

The system SHALL allow MFEs to use shared token manager without direct props.

#### Scenario: MFE retrieves token from singleton

- **WHEN** MFE imports tokenManager from @mf-mono/auth
- **THEN** MFE can call tokenManager.getAccessToken()
- **AND** MFE receives current token without needing props
- **AND** token is always up-to-date after refreshes

#### Scenario: MFE subscribes to token changes

- **WHEN** MFE calls tokenManager.onTokenChange(callback)
- **THEN** callback is invoked whenever token changes
- **AND** MFE receives new token value
- **AND** MFE can unsubscribe by calling returned cleanup function

---

### Requirement: Auth Propagation Standard Interface

The system SHALL define standard interface for auth props passed to MFEs.

#### Scenario: Standard auth prop structure

- **WHEN** shell passes auth to any MFE
- **THEN** auth object has structure: `{ token: string | null, user: User | null }`
- **AND** User type includes: `{ id: string, email: string, name: string }`
- **AND** all MFEs use same interface for type safety

---

### Requirement: Auth Provider in Shell

The system SHALL provide auth context via React Context to shell components.

#### Scenario: Shell components access auth via hook

- **WHEN** shell component calls useAuth() hook
- **THEN** component receives auth context
- **AND** context includes: { user, isAuthenticated, login, logout, getAccessToken }
- **AND** component can conditionally render based on auth state

#### Scenario: Auth provider wraps entire app

- **WHEN** shell application renders
- **THEN** AuthProvider wraps all routes
- **AND** all descendant components can access auth context
- **AND** auth state is managed centrally
