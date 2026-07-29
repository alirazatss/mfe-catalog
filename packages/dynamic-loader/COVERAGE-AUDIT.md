# dynamic-loader Coverage Audit

**Current Coverage:** 40.54% statements, 36.27% branches, 64.28% functions, 39.85% lines  
**Target:** 80/75/80/80

## Uncovered Code Analysis

### config.ts (0% coverage)

**Lines 20-55: Entire file uncovered**

**Category:** (a) **Needs tests**

**Rationale:** This module contains production-ready configuration fetching logic with retry, exponential backoff, HTTP error handling, and validation. All code paths are reachable and should be tested.

**Test coverage needed:**

- Happy path: successful fetch → validation → return
- HTTP error (404, 500)
- Invalid JSON response
- Validation failure (invalid manifest)
- Retry logic with exponential backoff
- Max retries exhausted
- Network error handling

**Priority:** HIGH - 0% coverage on a production module

---

### DynamicLoader.ts (37.83% statements, 36.58% branches)

**Uncovered lines:** 49-60, 62-64, 66-69, 72-86, 88-91, 93-111, 113-136, 138-145, 147-154, 156-164, 166-174, 176-179, 181-193, 195-203, 205-224, 224-258, 313-343

**Analysis of key uncovered branches:**

#### Lines 49-60: `setConfig` method

**Category:** (a) **Needs tests**

**Rationale:** This is the public API for setting remote configuration. Tests should verify that config is validated and stored correctly.

#### Lines 62-111: `loadRemote` method core logic

**Category:** (a) **Needs tests**

**Rationale:** This is the primary entry point for loading MFEs. Many branches cover error paths:

- Remote not found in config
- Already loading (concurrent load prevention)
- Script loading success/failure
- Container initialization errors

#### Lines 113-154: `mountMFE` method

**Category:** (a) **Needs tests**

**Rationale:** This orchestrates the mount lifecycle. Branches include:

- Feature MFE slot assignment
- Mount lifecycle calling
- Error boundaries
- Slot cleanup on failure

#### Lines 156-203: `unmountMFE` method

**Category:** (a) **Needs tests**

**Rationale:** Cleanup logic. Branches:

- MFE not found
- Unmount lifecycle errors
- Slot cleanup

#### Lines 205-258: `loadScript` helper (private)

**Category:** (a) **Needs tests** (indirectly via public API)

**Rationale:** Core script loading with timeout and error handling. Should be exercised by integration tests through `loadRemote`.

**Test approach:** Unit tests can mock `loadScript` at the boundary; integration tests will exercise real script loading.

#### Lines 313-343: Additional private helpers

**Category:** (a) **Needs tests** (indirectly)

**Rationale:** Utility functions called by public API. Will be covered by testing public methods.

---

## Coverage Strategy

### Phase 1: Unit Tests (Immediate)

**Add to `packages/dynamic-loader/src/__tests__/config.test.ts`:**

- fetchConfig happy path
- fetchConfig HTTP errors (404, 500, network timeout simulation)
- fetchConfig invalid JSON
- fetchConfig validation failure
- fetchConfig retry with exponential backoff
- fetchConfig max retries exhausted

**Add to `packages/dynamic-loader/src/__tests__/DynamicLoader.test.ts`:**

- setConfig with valid/invalid manifests
- loadRemote with valid remote
- loadRemote with missing remote
- loadRemote concurrent load prevention
- mountMFE happy path
- mountMFE slot assignment (chrome vs feature)
- unmountMFE cleanup
- Error boundaries for mount failures

**Estimated new coverage after unit tests:** 70-75% statements, 65-70% branches

### Phase 2: Runtime Integration Tests (Group 5)

Runtime integration tests will exercise:

- Real script loading (loadScript via loadRemote)
- Real DOM mounting
- Real lifecycle transitions
- Real failure scenarios (404 remoteEntry, missing mount export)

**Estimated additional coverage:** +5-10% statements, +5-10% branches

### Phase 3: Coverage Merging (Task 4.6)

Configure Vitest to merge coverage from:

- Unit test runs (`packages/dynamic-loader/coverage/`)
- Integration test runs (`tests/integration/coverage/`)

This should push us to 80/75/80/80 target.

---

## Dead Code Analysis

**None identified.** All uncovered code appears to be reachable production logic. No candidates for removal.

---

## Defensive Code Analysis

**Lines 54-55 in config.ts:** Unreachable TypeScript fallback after while loop.

**Category:** (c) **Documented defensive code**

**Rationale:** TypeScript control flow analysis requires a throw after the while loop even though it's logically unreachable (loop always throws on maxRetries). This is a TypeScript-specific defensive pattern and can remain uncovered.

**Impact on coverage:** Negligible (2 lines)

---

## Summary

| Category           | Lines | Action                         |
| ------------------ | ----- | ------------------------------ |
| (a) Needs tests    | ~450  | Write unit + integration tests |
| (b) Dead code      | 0     | None identified                |
| (c) Defensive code | 2     | Documented, acceptable         |

**Conclusion:** The 40% gap is due to missing test coverage for real, production-critical code paths. No code should be excluded from coverage. The path to 80/75/80/80 is through comprehensive unit tests (Phase 1) plus integration test coverage merging (Phase 2-3).
