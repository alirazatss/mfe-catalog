## ADDED Requirements

### Requirement: MFE Accepts Auth Props

The system SHALL allow MFEs to receive authentication context via props.

#### Scenario: MFE receives auth from shell

- **WHEN** shell loads MFE with auth={{ token, user }}
- **THEN** MFE App component receives auth prop
- **AND** MFE can access token and user data
- **AND** MFE TypeScript interface validates prop structure

#### Scenario: MFE handles undefined auth

- **WHEN** MFE receives auth={undefined}
- **THEN** MFE renders in unauthenticated mode
- **AND** MFE does not attempt authenticated API calls

---

### Requirement: MFE Axios Integration with Token Manager

The system SHALL configure Axios in MFEs to use shared token manager for authenticated requests.

#### Scenario: Axios request includes token automatically

- **WHEN** MFE makes API call using configured Axios instance
- **THEN** request interceptor retrieves token from tokenManager
- **AND** request includes Authorization: Bearer {token} header
- **AND** no manual token injection required in business logic

#### Scenario: Axios retries request after 401 token refresh

- **WHEN** MFE API call returns HTTP 401
- **THEN** response interceptor catches error
- **AND** interceptor calls tokenManager.refreshAccessToken()
- **AND** interceptor retries original request with new token
- **AND** if retry succeeds, caller receives successful response

#### Scenario: Axios fails after token refresh failure

- **WHEN** API call returns 401 and token refresh also returns 401
- **THEN** interceptor emits 'auth:session-expired' event
- **AND** original API call fails
- **AND** MFE can show login prompt or error message

---

### Requirement: MFE Auth Integration Example

The system SHALL provide example implementation in mfe-widget showing auth integration pattern.

#### Scenario: mfe-widget demonstrates auth prop usage

- **WHEN** developer examines mfe-widget/src/App.tsx
- **THEN** file shows auth prop in interface definition
- **AND** file shows how to pass auth to API client or state

#### Scenario: mfe-widget demonstrates Axios setup

- **WHEN** developer examines mfe-widget/src/api/client.ts
- **THEN** file shows Axios instance creation
- **AND** file shows request interceptor using tokenManager
- **AND** file shows response interceptor for 401 handling

---

### Requirement: MFE API Client Configuration

The system SHALL provide standard pattern for configuring authenticated API clients in MFEs.

#### Scenario: API client uses token manager singleton

- **WHEN** MFE creates Axios instance in api/client.ts
- **THEN** instance imports tokenManager from @mf-mono/auth
- **AND** request interceptor calls tokenManager.getAccessToken()
- **AND** client is configured with withCredentials: true for cookies

---

### Requirement: MFE Subscribes to Auth Events

The system SHALL allow MFEs to react to auth state changes via events.

#### Scenario: MFE clears state on logout event

- **WHEN** shell emits 'auth:logout' event
- **THEN** MFE event listener receives event
- **AND** MFE clears cached user-specific data
- **AND** MFE resets to unauthenticated state

#### Scenario: MFE updates token on refresh event

- **WHEN** shell emits 'auth:token-refreshed' event
- **THEN** MFE event listener receives new token
- **AND** MFE can update local state if needed
- **AND** Axios automatically uses new token via tokenManager
