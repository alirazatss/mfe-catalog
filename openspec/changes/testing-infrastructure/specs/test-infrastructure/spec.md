# Spec: Test Infrastructure

## ADDED Requirements

### Requirement: Vitest Configuration
The system SHALL have Vitest configuration for all packages and apps.

#### Scenario: Package vitest config
- **WHEN** package has a `vitest.config.ts` file
- **THEN** config specifies test environment (happy-dom or jsdom)
- **AND** config includes coverage thresholds
- **AND** config specifies test file patterns

#### Scenario: App vitest config
- **WHEN** app has a `vitest.config.ts` file
- **THEN** config extends base config
- **AND** config specifies setupFiles for test utilities
- **AND** config includes path aliases matching tsconfig

#### Scenario: Root-level test script
- **WHEN** `pnpm test` is run from root
- **THEN** tests run for all packages and apps
- **AND** results are aggregated

---

### Requirement: Test Utilities and Helpers
The system SHALL provide reusable test utilities.

#### Scenario: Render with providers
- **WHEN** test needs to render component with AuthProvider
- **THEN** `renderWithAuth(component, { isAuthenticated, user })` wraps component
- **AND** component receives mocked auth context

#### Scenario: Render with router
- **WHEN** test needs to render component with routing
- **THEN** `renderWithRouter(component, { initialRoute })` wraps component
- **AND** component has access to useNavigate, useLocation

#### Scenario: Create mock user
- **WHEN** test needs user data
- **THEN** `createMockUser(overrides)` returns consistent user object
- **AND** overrides can customize specific properties

#### Scenario: Mock window.__AUTH__
- **WHEN** test needs to mock shell auth
- **THEN** `mockShellAuth({ getAccessToken: () => "token" })` sets up window.__AUTH__
- **AND** mock is cleaned up after test

---

### Requirement: Coverage Reporting
The system SHALL generate and report test coverage.

#### Scenario: Coverage report generation
- **WHEN** tests run with `--coverage` flag
- **THEN** coverage report is generated in `coverage/` directory
- **AND** report includes HTML output
- **AND** report includes lcov output for CI

#### Scenario: Coverage threshold enforcement
- **WHEN** coverage is below threshold
- **THEN** test command exits with code 1
- **AND** console output shows which files failed threshold

#### Scenario: Coverage exclusions
- **WHEN** coverage is calculated
- **THEN** `.test.ts` files are excluded
- **AND** `*.config.ts` files are excluded
- **AND** `dist/` directory is excluded

---

### Requirement: Test Environment Setup
The system SHALL configure appropriate test environments.

#### Scenario: DOM environment for React components
- **WHEN** component tests run
- **THEN** happy-dom or jsdom provides DOM APIs
- **AND** window, document, HTMLElement are available

#### Scenario: Node environment for utilities
- **WHEN** utility function tests run
- **THEN** tests run in Node environment
- **AND** no DOM APIs are required

#### Scenario: Global test setup
- **WHEN** tests start
- **THEN** setupFiles run before any tests
- **AND** global mocks are registered
- **AND** test utilities are imported

---

### Requirement: Test Scripts
The system SHALL provide npm scripts for testing workflows.

#### Scenario: Run all tests
- **WHEN** `pnpm test` is run
- **THEN** Vitest runs in watch mode
- **AND** tests re-run on file changes

#### Scenario: Run tests once
- **WHEN** `pnpm test:run` is run
- **THEN** Vitest runs all tests once
- **AND** process exits after completion

#### Scenario: Run tests with coverage
- **WHEN** `pnpm test:coverage` is run
- **THEN** tests run with coverage collection
- **AND** coverage report is generated

#### Scenario: Run tests for specific package
- **WHEN** `pnpm test --filter=@mf-mono/auth` is run
- **THEN** only @mf-mono/auth tests run

#### Scenario: UI mode
- **WHEN** `pnpm test:ui` is run
- **THEN** Vitest UI opens in browser
- **AND** tests can be run/debugged interactively

---

### Requirement: Mock and Stub Utilities
The system SHALL provide utilities for mocking dependencies.

#### Scenario: Mock fetch API
- **WHEN** test needs to mock fetch
- **THEN** `mockFetch(url, response)` intercepts fetch calls
- **AND** returns configured response

#### Scenario: Mock event bus
- **WHEN** test needs to mock events
- **THEN** `mockEventBus()` provides spy functions
- **AND** event emissions can be asserted

#### Scenario: Mock timer utilities
- **WHEN** test needs to control time
- **THEN** `vi.useFakeTimers()` replaces setTimeout/setInterval
- **AND** `vi.advanceTimersByTime(ms)` advances time

---

### Requirement: Test Performance Monitoring
The system SHALL monitor and optimize test performance.

#### Scenario: Slow test detection
- **WHEN** a test takes > 1 second
- **THEN** warning is logged to console
- **AND** test is flagged for optimization

#### Scenario: Test suite timing report
- **WHEN** tests complete
- **THEN** summary shows total time and slowest tests
- **AND** timing data is available for analysis

---

### Requirement: Continuous Integration Support
The system SHALL support running tests in CI environments.

#### Scenario: CI-specific configuration
- **WHEN** tests run in CI (CI=true env var)
- **THEN** tests run in non-watch mode
- **AND** coverage is enforced
- **AND** output is formatted for CI logs

#### Scenario: Parallel test execution
- **WHEN** tests run in CI
- **THEN** tests run in parallel across CPU cores
- **AND** execution time is minimized

#### Scenario: Test result artifacts
- **WHEN** tests complete in CI
- **THEN** JUnit XML report is generated
- **AND** coverage report is uploaded
- **AND** test results are available for PR status checks

---

### Requirement: TypeScript Support
The system SHALL provide full TypeScript support in tests.

#### Scenario: Type checking in tests
- **WHEN** tests are written in TypeScript
- **THEN** type errors are caught before running
- **AND** test helper types are available

#### Scenario: Import path aliases
- **WHEN** test imports using path alias `@/components/Button`
- **THEN** import resolves correctly
- **AND** matches tsconfig paths

---

### Requirement: React Testing Library Integration
The system SHALL integrate React Testing Library for component testing.

#### Scenario: Query utilities
- **WHEN** component is rendered
- **THEN** `screen.getByRole()` queries are available
- **AND** `screen.getByText()` queries are available
- **AND** semantic queries are preferred over querySelector

#### Scenario: User interaction simulation
- **WHEN** test simulates user action
- **THEN** `fireEvent.click()` or `userEvent.click()` triggers event
- **AND** component responds as in browser

#### Scenario: Async updates
- **WHEN** component updates asynchronously
- **THEN** `waitFor()` waits for update
- **AND** `findBy` queries wait for elements to appear

---

### Requirement: Test Documentation
The system SHALL provide clear test documentation and examples.

#### Scenario: Test naming conventions
- **WHEN** developer writes tests
- **THEN** describe blocks use component/function name
- **AND** it/test blocks describe specific behavior

#### Scenario: Test organization
- **WHEN** test file has multiple test cases
- **THEN** tests are grouped by feature or scenario
- **AND** setup code is in beforeEach hooks

#### Scenario: Example tests  
- **WHEN** developer needs testing guidance
- **THEN** example tests are available in docs/
- **AND** examples cover common patterns (mocking, async, events)
