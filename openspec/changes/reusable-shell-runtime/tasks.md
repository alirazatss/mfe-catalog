## 1. Package Contracts and Setup

- [ ] 1.1 Create `packages/shell-runtime` with ESM build, TypeScript configuration, workspace dependencies, and a side-effect-free root entry point.
      Requirements: REQ-SR-001, REQ-SR-003, REQ-SR-008, REQ-SR-009, REQ-SR-011
      Output: Package metadata, build configuration, `src/index.ts`, and public contract modules.
      Owner skill(s): architect, frontend-developer
      Verification: Run `vp run build` from `packages/shell-runtime` and import the built entry point in a non-DOM test environment without browser-global errors.

- [ ] 1.2 Define and export the runtime configuration, adapter, state, failure, observation, and factory types with compile-time contract fixtures.
      Requirements: REQ-SR-001, REQ-SR-003, REQ-SR-008, REQ-SR-009, REQ-SR-010, REQ-SR-011
      Output: Public TypeScript contracts and positive/negative type fixtures.
      Owner skill(s): architect, frontend-developer
      Verification: Run the package type check and confirm invalid required-adapter configurations fail the negative fixture while custom structural adapters compile.

## 2. Lifecycle and Slot Coordination

- [ ] 2.1 Implement lifecycle-module resolution, named/default export normalization, required-function validation, and remote-identity bootstrap tracking over `@mfe-runtine/dynamic-loader`.
      Requirements: REQ-SR-004
      Output: Internal Lifecycle Controller without React or other UI-framework imports.
      Owner skill(s): frontend-developer
      Verification: Focused tests prove lifecycle call order, bootstrap-once behavior, changed remote identity handling, optional update behavior, and rejection of component-only remotes.

- [ ] 2.2 Implement explicit Slot resolution, occupant bookkeeping, defensive cleanup, and all-settled unmount behavior.
      Requirements: REQ-SR-004, REQ-SR-005, REQ-SR-009, REQ-SR-010
      Output: Lifecycle Controller Slot activation and cleanup operations.
      Owner skill(s): frontend-developer
      Verification: Focused tests prove distinct Chrome Slots, missing-Slot isolation, replacement cleanup, no duplicate occupants, and continued cleanup after one unmount rejects.

- [ ] 2.3 Build shared MFE props from runtime, Manifest, auth, navigation, and Shell context with protected runtime-owned keys.
      Requirements: REQ-SR-004, REQ-SR-006, REQ-SR-008
      Output: Shared-prop builder and optional shared-prop change subscription.
      Owner skill(s): frontend-developer
      Verification: Tests assert `container`, `slot`, `basePath`, config, auth state, and `onNavigate` values and prove custom props cannot override runtime-owned values.

## 3. Runtime State and Orchestration

- [ ] 3.1 Implement the runtime state machine, browser check, configuration validation, deduplicated startup, restart, stop, and permanent disposal.
      Requirements: REQ-SR-001, REQ-SR-002, REQ-SR-010
      Output: `createShellRuntime`, public runtime instance, and deterministic operation-state transitions.
      Owner skill(s): architect, frontend-developer
      Verification: State-machine tests cover non-browser startup, concurrent starts/stops, stop during startup, restart, disposal from each stable state, and rejected start after disposal.

- [ ] 3.2 Implement startup sequencing for Manifest validation, Dynamic Loader configuration, best-effort auth initialization, Chrome settlement, current Feature activation, and listener registration.
      Requirements: REQ-SR-002, REQ-SR-003, REQ-SR-005, REQ-SR-006
      Output: Runtime startup pipeline and auth-degradation behavior.
      Owner skill(s): frontend-developer
      Verification: Ordered adapter spies prove the required phase sequence; failure tests prove Manifest failure blocks all later work, auth failure degrades to unauthenticated, and one Chrome failure does not block other Slots.

- [ ] 3.3 Implement Feature route matching, secure-by-default auth checks, role checks, route outcomes, and same-Feature updates before remote loading.
      Requirements: REQ-SR-006
      Output: Presentation-free Feature route evaluator and activation flow.
      Owner skill(s): frontend-developer
      Verification: Focused tests cover allowed, unauthenticated, forbidden, not-found, disabled, deep-link, and same-Feature navigation scenarios and assert denied remotes are never requested.

- [ ] 3.4 Implement the serialized Feature transition worker with route revisions, stale-commit suppression, stale-mount cleanup, and latest-URL convergence.
      Requirements: REQ-SR-007, REQ-SR-010
      Output: Internal Feature Transition Controller integrated with runtime teardown epochs.
      Owner skill(s): architect, frontend-developer
      Verification: Deferred-promise tests deliver out-of-order load and mount completions and prove only the newest Feature remains mounted after rapid navigation or stop.

## 4. Standard Adapters and Diagnostics

- [ ] 4.1 Implement the optional URL Manifest Provider with configurable fetch, cache policy, retry classification, delay strategy, and schema validation.
      Requirements: REQ-SR-003
      Output: Exported browser URL Manifest Provider.
      Owner skill(s): frontend-developer
      Verification: Mock-fetch tests cover first-attempt success, retry then success, non-retryable response, exhausted retries, malformed JSON, invalid schema, and custom fetch injection.

- [ ] 4.2 Implement the optional browser History API Navigation Adapter without patching native history methods.
      Requirements: REQ-SR-008
      Output: Exported History API adapter with current URL, subscription, push, replace, state, and disposal support.
      Owner skill(s): frontend-developer
      Verification: jsdom tests cover push, replace, popstate, listener removal, relative-destination validation, and rejection of malformed or external destinations.

- [ ] 4.3 Implement typed observation dispatch, failure classification, renderer isolation, scoped recovery clearing, and recursion prevention.
      Requirements: REQ-SR-002, REQ-SR-005, REQ-SR-008, REQ-SR-009, REQ-SR-011
      Output: Internal diagnostics channel and public failure/event unions.
      Owner skill(s): frontend-developer
      Verification: Tests assert event payloads and order for success/failure/recovery, prove observer exceptions do not alter outcomes, and prove renderer exceptions are observed without recursive rendering.

## 5. Website Shell Migration

- [ ] 5.1 Add website adapters for fallback Manifest policy, token-manager auth and roles, existing navigation events, explicit Slot lookup, shared props, and current critical/route/Slot error presentation.
      Requirements: REQ-SR-001, REQ-SR-002, REQ-SR-003, REQ-SR-005, REQ-SR-006, REQ-SR-008, REQ-SR-009
      Output: `apps/shells/website/src/shell` runtime configuration that contains website policy but no orchestration loop.
      Owner skill(s): frontend-developer
      Verification: Adapter unit tests preserve current login redirect, return URL, 403, 404, Manifest fallback, auth bridge, and Slot-rendering behavior.

- [ ] 5.2 Replace website bootstrap orchestration with one Shell Runtime instance and remove superseded route, listener, mount, and React-component compatibility paths.
      Requirements: REQ-SR-002, REQ-SR-004, REQ-SR-005, REQ-SR-006, REQ-SR-007, REQ-SR-010
      Output: Thin `apps/shells/website/src/main.ts` and lifecycle-only website integration.
      Owner skill(s): frontend-developer
      Verification: Build the website and run route/deep-link tests proving Chrome persistence, Feature switching, same-Feature navigation, counter interaction, and clean teardown without React imports in Shell orchestration.

- [ ] 5.3 Document the package API, adapter examples, lifecycle-only prerequisite, failure model, and migration guidance for another deployable Shell.
      Requirements: REQ-SR-001, REQ-SR-003, REQ-SR-004, REQ-SR-008, REQ-SR-009, REQ-SR-010, REQ-SR-011
      Output: Package README and any necessary updates to repository Shell documentation.
      Owner skill(s): architect
      Verification: Follow the documented minimal example in a compile fixture and confirm it creates a runtime without website-specific imports.

## 6. Acceptance and Regression Gates

- [ ] 6.1 Add a requirement-indexed package test matrix covering every Shell Runtime scenario and verify no public contract depends on React, website code, or `@mfe-runtine/auth`.
      Requirements: REQ-SR-001, REQ-SR-002, REQ-SR-003, REQ-SR-004, REQ-SR-005, REQ-SR-006, REQ-SR-007, REQ-SR-008, REQ-SR-009, REQ-SR-010, REQ-SR-011
      Output: Unit, type, jsdom, concurrency, and import-safety tests under `packages/shell-runtime`.
      Owner skill(s): tester
      Verification: Run `vp run test:run` from `packages/shell-runtime` and produce a passing requirement-to-test coverage table.

- [ ] 6.2 Extend website integration tests for startup degradation, protected routes, independent Chrome failures, Feature load failure/recovery, rapid route changes, restart, and disposal.
      Requirements: REQ-SR-002, REQ-SR-005, REQ-SR-006, REQ-SR-007, REQ-SR-009, REQ-SR-010
      Output: Website integration and browser regression coverage using real Shell adapters.
      Owner skill(s): tester, frontend-developer
      Verification: Run the website integration suite and confirm final DOM, mounted-MFE state, navigation URL, and error UI for each scenario.

- [ ] 6.3 Run repository quality gates and verify the website remains within the documented thin-Shell size constraint.
      Requirements: REQ-SR-001, REQ-SR-004, REQ-SR-010, REQ-SR-011
      Output: Passing workspace checks with no unrelated production behavior changes.
      Owner skill(s): tester
      Verification: Run `vp check`, `vp test`, applicable build tasks via `vp run`, and the repository Shell-size check; record any unrelated pre-existing failures separately.
