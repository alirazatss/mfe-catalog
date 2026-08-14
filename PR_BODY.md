# Task Group 2: Config Generator Implementation

## Tasks Completed

### Task 2.1: Write tests for local mode and development rejection (CG-1)

**Files changed:**

- `packages/monorepo-tools/src/config-generator.test.ts` (new)

**Verification:**

```bash
cd packages/monorepo-tools && pnpm test config-generator
```

**Output:**

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

**Tests cover:**

- Local environment generates localhost URLs
- Development environment throws error with guidance message
- Production environment generates versioned CDN URLs
- Production defaults to `vlatest` when no git hash provided
- Root MFE designation maps to "/" route
- Unknown root MFE throws error
- No root MFE uses default basePaths

---

### Task 2.2: Implement development → local rename with guided rejection (CG-1)

**Files changed:**

- `packages/monorepo-tools/src/config-generator.ts`
- `packages/monorepo-tools/src/types.ts`

**Verification:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment development --dry-run
```

**Output:**

```
❌ Error generating config:
Environment mode "development" has been renamed to "local". Please use --environment local instead. See openspec/changes/remote-config-environment-cleanup/specs/config-generation/spec.md
```

**Implementation:**

- Added validation in `computeEntryUrl` to reject "development" environment
- Updated `ConfigGenerationOptions` type to accept "local" | "production" | "development"
- "local" mode generates `http://localhost:{port}/remoteEntry.js`
- Error message provides clear guidance to use "local" instead

---

### Task 2.3: Implement root MFE designation with tests (CG-2)

**Files changed:**

- `packages/monorepo-tools/src/config-generator.ts`
- `packages/monorepo-tools/src/config-generator.test.ts`

**Verification:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment local --root-mfe mfe-landing-page --dry-run
```

**Output (features section):**

```json
{
  "features": {
    "/": {
      "mfe": "mfe-landing-page",
      "entryUrl": "http://localhost:5174/remoteEntry.js",
      "basePath": "/",
      ...
    },
    "/widget": {
      "mfe": "mfe-widget",
      "entryUrl": "http://localhost:5175/remoteEntry.js",
      "basePath": "/widget",
      ...
    }
  }
}
```

**Implementation:**

- Added `rootMfe` parameter to `ConfigGenerationOptions`
- Validates root MFE exists before processing
- Maps designated MFE to "/" route key instead of default basePath
- Throws descriptive error for unknown root MFE

---

### Task 2.4: Wire generate-config.ts for local override output (CG-3)

**Files changed:**

- `scripts/generate-config.ts`

**Verification:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment local --dry-run
```

**Output:**

```
🔍 Discovering micro-frontends...
✅ Found 2 micro-frontend(s):
   - mfe-landing-page (@mfe-runtime/mfe-landing-page) on port 5174
   - mfe-widget (@mfe-runtime/mfe-widget) on port 5175

⚙️  Generating config for local environment...

📄 Generated config (dry-run):
{
  "$schema": "../node_modules/@mfe-runtime/remote-config/schema.json",
  "schemaVersion": "2.0.0",
  "chrome": {},
  "features": {
    "/landing-page": {
      "mfe": "mfe-landing-page",
      "entryUrl": "http://localhost:5174/remoteEntry.js",
      ...
    }
  }
}
```

**Implementation:**

- Added `--root-mfe` / `-r` CLI flag
- Updated default environment from "development" to "local"
- Auto-derives output path based on environment and shell:
  - `local` → `apps/shells/{shell}/remotes.config.local.json` (gitignored)
  - Other environments → `apps/shells/{shell}/public/remotes.config.json`
- Dry-run mode prints config without writing
- Schema validation happens automatically before writing

---

### Task 2.5: Update manifest-generator.md documentation (CG-1, CG-2, CG-3)

**Files changed:**

- `docs/manifest-generator.md`

**Changes:**

- Renamed from "Manifest Generator" to "Remote Config Generator"
- Documented local mode semantics (CG-1)
- Documented root MFE designation workflow (CG-2)
- Documented local override workflow (CG-3)
- Updated CLI options table with new flags
- Added examples for all three features
- Updated integration and deployment sections
- Fixed all references from old manifest terminology to remote config

---

## Requirements Coverage

| Requirement                                           | Tasks         | Verification                                            |
| ----------------------------------------------------- | ------------- | ------------------------------------------------------- |
| CG-1: environment mode 'local' replaces 'development' | 2.1, 2.2, 2.5 | Tests pass; development mode throws error with guidance |
| CG-2: generator honors shell's root MFE designation   | 2.3, 2.5      | Tests pass; designated MFE maps to "/" route            |
| CG-3: generator produces local override manifest      | 2.4, 2.5      | Dry-run outputs schema-valid config with localhost URLs |

---

## Final Verification

**All tests pass:**

```bash
cd packages/monorepo-tools && pnpm test
```

**Output:**

```
 Test Files  5 passed (5)
      Tests  58 passed (58)
```

**Dry-run produces valid config:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment local --dry-run
```

Schema validation passes (no errors thrown).

**No spec modifications:**

```bash
git diff -- openspec/changes/remote-config-environment-cleanup/
```

Output: (empty) — spec is immutable ✅

---

## Files Changed

- `packages/monorepo-tools/src/config-generator.ts` — Modified (CG-1, CG-2)
- `packages/monorepo-tools/src/config-generator.test.ts` — New (CG-1, CG-2)
- `packages/monorepo-tools/src/types.ts` — Modified (CG-1, CG-2)
- `scripts/generate-config.ts` — Modified (CG-1, CG-2, CG-3)
- `docs/manifest-generator.md` — Modified (CG-1, CG-2, CG-3)
- `openspec/changes/remote-config-environment-cleanup/tasks.md` — Updated checkboxes

---

## Deviations from Spec

None.

---

## Follow-ups

None for this task group. Dependencies for other task groups:

- Task group 1 will use the local override generation workflow documented in 2.5
- Task group 3 does not depend on task group 2
- Task group 4 does not depend on task group 2
