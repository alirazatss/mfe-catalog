## 1. Canonical local port map and resolution

**Owns files:**

- `packages/monorepo-tools/src/**`
- `scripts/generate-config.ts`
- `apps/shells/website/src/config/remotes.ts`
- `apps/shells/website/public/remotes.config.dev.json`
- `apps/shells/website/vite.config.ts`
- `apps/mfes/*/vite.config.ts`
- `apps/mfes/*/package.json`

**Depends on:** none

- [ ] 1.1 Add the canonical local port map data source and resolution helpers.
  - Requirements: REQ-001, REQ-002, REQ-003
  - Owner skill(s): backend-developer
  - Verification: unit tests cover reuse, preferred-port resolution, and alternate-port assignment when the preferred port is occupied.

- [ ] 1.2 Update discovery to read and persist resolved local ports from the map instead of relying on alphabetical assignment.
  - Requirements: REQ-004, REQ-005
  - Owner skill(s): backend-developer
  - Verification: discovery tests show mapped ports are returned and new apps receive a resolved port.

- [ ] 1.3 Wire shell and MFE Vite startup to the same resolution source and enable strict local dev behavior where relevant.
  - Requirements: REQ-001, REQ-003, REQ-004
  - Owner skill(s): frontend-developer
  - Verification: local dev startup uses the resolved port values and no longer requires manual manifest edits when a port changes.

- [ ] 1.4 Update local manifest/config generation to emit localhost URLs from the resolved port map.
  - Requirements: REQ-005
  - Owner skill(s): backend-developer
  - Verification: generated local manifest contains the resolved localhost URLs for each MFE.

- [ ] 1.5 Update package.json defaults or metadata so preferred dev ports are represented consistently in the repo.
  - Requirements: REQ-001, REQ-002
  - Owner skill(s): backend-developer
  - Verification: package metadata and runtime resolution stay aligned for the shell and MFEs.

## 2. Spec, docs, and regression coverage

**Owns files:**

- `CONTEXT.md`
- `openspec/changes/local-port-map-for-mfe-development/proposal.md`
- `openspec/changes/local-port-map-for-mfe-development/specs/**`
- `openspec/changes/local-port-map-for-mfe-development/design.md`
- `openspec/changes/local-port-map-for-mfe-development/tasks.md`
- `docs/**`
- `tests/**`
- `packages/**/__tests__/**`

**Depends on:** task group 1 (canonical resolution behavior must exist before docs and regression updates are finalized)

- [ ] 2.1 Update docs and glossary references so local port map terminology matches the new canonical behavior.
  - Requirements: REQ-001, REQ-005
  - Owner skill(s): humanizer
  - Verification: docs and glossary use the same local-port-map vocabulary and no longer describe alphabetical-only allocation.

- [ ] 2.2 Update or add spec tests for the changed discovery and manifest-generation behavior.
  - Requirements: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
  - Owner skill(s): tester
  - Verification: tests assert stable reuse, alternate-port assignment, and manifest regeneration from the resolved map.

- [ ] 2.3 Validate the shell still boots with the resolved local port map and loads MFEs from the generated localhost URLs.
  - Requirements: REQ-001, REQ-005
  - Owner skill(s): tester, frontend-developer
  - Verification: local integration or E2E smoke flow starts the shell and confirms remote entry URLs match the resolved map.

## Requirement coverage matrix

- REQ-001 -> 1.1, 1.3, 1.5, 2.1, 2.3
- REQ-002 -> 1.1, 1.2, 1.5, 2.2
- REQ-003 -> 1.1, 1.3, 2.2
- REQ-004 -> 1.2, 1.3, 2.2
- REQ-005 -> 1.4, 2.1, 2.2, 2.3

## Execution waves

- Wave 1 (parallel): task groups 1, 2
