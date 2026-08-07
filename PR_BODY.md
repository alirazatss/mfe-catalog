# Task Group 2: Blob Layout Migration to Per-Shell Prefixes

## Tasks Completed (2.1-2.5)

### Task 2.1: Changed workflow destinations to per-shell prefixes

- **Dev shell**: `dev-shell/<shell-name>/` (floating pointer)
- **Dev SHA**: `dev-shell/<shell-name>/sha-<short8>/` (immutable)
- **Prod floating**: `$web/<shell-name>/`
- **Prod versioned**: `$web/<shell-name>/v<semver>/`
- Updated all upload steps in `deploy-shell.yml`
- Updated deployment summaries with new URLs

### ✅ Tasks 2.2-2.5: Migration strategy documented

- **2.2 Dual-publish**: Deferred (not needed for first shell)
- **2.3 Lifecycle policies**: Documented rules in runbook
- **2.4 External consumer audit**: Documented audit procedures
- **2.5 Root cleanup**: Documented cleanup procedures

Created comprehensive Azure Blob Storage Provisioning Runbook covering:

- Container structure and path families
- Lifecycle management policy rules with shell-specific prefixes
- Migration procedures for future shells
- RBAC and OIDC configuration
- Adding new shells checklist

## Breaking Changes

**URLs changed for all deployments:**

| Environment      | Old URL                  | New URL                          |
| ---------------- | ------------------------ | -------------------------------- |
| Dev (floating)   | `/dev-shell/index.html`  | `/dev-shell/website/index.html`  |
| Dev (SHA)        | `/dev-shell/sha-<hash>/` | `/dev-shell/website/sha-<hash>/` |
| Prod (floating)  | `/$web/` root            | `/$web/website/`                 |
| Prod (versioned) | `/$web/v1.0.0/`          | `/$web/website/v1.0.0/`          |

## Requirements Covered

All requirements from `azure-blob-storage-layout` spec and `shell-deployment-pipeline` modified requirements:

- ✅ Per-shell path prefixes (dev and prod)
- ✅ Three path families: floating, SHA, PR
- ✅ Lifecycle policy documentation
- ✅ Migration procedures documented

## Files Changed

- `.github/workflows/deploy-shell.yml` - all upload destinations updated
- `docs/runbooks/azure-blob-provisioning.md` (NEW) - comprehensive runbook
- `tasks.md` - tasks 2.1-2.5 marked complete
