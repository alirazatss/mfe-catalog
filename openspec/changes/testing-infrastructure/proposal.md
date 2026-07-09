## Why

The micro-frontend architecture requires comprehensive testing to ensure quality, prevent regressions, and maintain confidence during rapid development. Currently, there is zero test coverage for shell, MFEs, and shared packages. This creates risk for production deployment and makes refactoring difficult.

## What Changes

- Add Vitest testing infrastructure to all packages and apps
- Implement unit tests for shared packages (@mf-mono/auth, @mf-mono/events)
- Implement unit tests for shell components and utilities
- Implement integration tests for shell providers (AuthProvider, event bus integration)
- Implement unit tests for MFE components and utilities
- Implement integration tests for MFE app-level behavior
- Add test scripts to package.json files
- Configure CI/CD test automation
- Establish testing conventions and patterns

**Note**: E2E tests (Playwright) are deferred to a separate change. This change focuses on unit and integration tests only.

## Capabilities

### New Capabilities
- `unit-testing`: Unit test infrastructure and conventions for components, utilities, and hooks
- `integration-testing`: Integration test infrastructure for providers, API clients, and app-level behavior
- `test-infrastructure`: Vitest configuration, test utilities, mocks, and CI integration

### Modified Capabilities
<!-- No existing capabilities are being modified - this is net-new testing infrastructure -->

## Impact

**Code:**
- All packages in `packages/` get test files and vitest.config.ts
- All apps in `apps/` get test files and vitest.config.ts
- Root package.json gets test scripts for running all tests

**Dependencies:**
- Add Vitest and testing libraries to devDependencies
- Add @testing-library/react for component testing
- Add happy-dom or jsdom for DOM environment

**CI/CD:**
- Add test step to CI pipeline (future - not part of this change)
- Tests must pass before merge

**Development Workflow:**
- Developers run tests locally before committing
- Tests run in watch mode during development
- Test coverage reports generated
