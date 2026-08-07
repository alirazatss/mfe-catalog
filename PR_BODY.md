# Task Group 1: Extract Reusable Deploy Workflow

## Tasks Completed (1.1-1.7)

### ✅ Task 1.1: Created reusable workflow

- Created `.github/workflows/deploy-shell.yml` with `workflow_call` trigger
- Defined 4 required inputs: shell-name, shell-path, package-name, tag-prefix

### ✅ Tasks 1.2-1.5: Moved all jobs into reusable workflow

- Version validation job (parameterized tag extraction and package.json path)
- Dev deploy job (build, floating upload, SHA paths, build-info.json)
- Prod config-only deploy job
- Prod versioned deploy job
- Per-shell concurrency groups: `deploy-${{ inputs.shell-name }}-dev`

### ✅ Task 1.6: Thin caller workflow

- Rewrote `deploy-website.yml` from 408 lines to 43 lines (89% reduction)
- Caller defines only triggers and inputs, delegates to reusable workflow

### ✅ Task 1.7: Equivalence verification

- Created VERIFICATION_1.7.md with detailed comparison
- Code review confirms functional equivalence

## Requirements Covered

- reusable-shell-deploy-workflow: Single parameterized workflow, thin callers, tag validation, per-shell concurrency
- shell-deployment-pipeline: Dev/prod deploys, build metadata, serialization

## Files Changed

- `.github/workflows/deploy-shell.yml` (NEW) - 407 lines
- `.github/workflows/deploy-website.yml` (MODIFIED) - 408 → 43 lines
- `openspec/changes/multi-shell-deployment-workflow/tasks.md` (tasks 1.1-1.7 marked complete)
- `VERIFICATION_1.7.md` (NEW) - verification evidence

## Verification

- vp check: ✅ PASS (0 errors, 7 pre-existing warnings)
- All task checkboxes updated
- Equivalence verified by code review
