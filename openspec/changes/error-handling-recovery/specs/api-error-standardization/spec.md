## ADDED Requirements

### Requirement: Standard API Error Response Format
The system SHALL use consistent format for all API errors.

#### Scenario: API error includes standard fields
- **WHEN** API returns error
- **THEN** response includes { message, code, status }
- **AND** message is user-friendly
- **AND** code is machine-readable (e.g., 'INVALID_INPUT')

---

### Requirement: Automatic Retry for Transient Errors
The system SHALL automatically retry failed API calls for network errors.

#### Scenario: Network error retried automatically
- **WHEN** API call fails due to network error (no response)
- **THEN** Axios interceptor retries request
- **AND** waits with exponential backoff (1s, 2s, 4s)
- **AND** max 3 retry attempts

#### Scenario: Successful retry returns data
- **WHEN** first attempt fails, second succeeds
- **THEN** caller receives successful response
- **AND** caller unaware retry happened

#### Scenario: All retries fail
- **WHEN** request fails 3 times
- **THEN** final error returned to caller
- **AND** error includes retry count

---

### Requirement: User Feedback for API Errors
The system SHALL show user-friendly notifications for API errors.

#### Scenario: Toast notification for API error
- **WHEN** API call fails with 500 error
- **THEN** toast notification appears
- **AND** shows message "Unable to complete request. Please try again."
- **AND** toast auto-dismisses after 5 seconds

#### Scenario: No toast for expected errors (401, 404)
- **WHEN** API returns 401 (handled by auth refresh)
- **OR** API returns 404 (handled by component)
- **THEN** no global toast shown
- **AND** component handles error locally

---

### Requirement: Idempotency for Retry Safety
The system SHALL only retry safe HTTP methods automatically.

#### Scenario: GET request retried
- **WHEN** GET request fails
- **THEN** retry is safe (idempotent)
- **AND** request is retried automatically

#### Scenario: POST request not retried automatically
- **WHEN** POST request fails
- **THEN** retry could duplicate data
- **AND** user must manually retry
- **AND** user shown retry button

---

### Requirement: Error Reporting for API Failures
The system SHALL emit events for API errors.

#### Scenario: API error event emitted
- **WHEN** API call fails with 500 error
- **THEN** shell emits MFE_EVENTS.ERROR_API_FAILED
- **AND** payload includes { endpoint, status, error }

#### Scenario: Error reporter logs to service
- **WHEN** API error event emitted
- **THEN** error reporter sends to monitoring
- **AND** includes user context and session info
