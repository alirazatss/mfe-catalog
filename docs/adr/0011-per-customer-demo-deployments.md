# ADR-0011: Per-Customer Demo Deployments

## Status

Accepted (2026-08-14)

Extends [ADR-0010 (Dev Preview Deployments)](./0010-dev-preview-deployments.md)

## Context

The MFE system requires standing parallel demo environments for customer demonstrations and proof-of-concept scenarios. These demos must:

1. **Run in parallel** - Multiple customer demos active simultaneously, isolated from each other
2. **Use stable artifacts** - Cannot rely on ephemeral dev artifacts (`sha-*`/`pr-*`) which expire per ADR-0010 lifecycle policies
3. **Support feature flags** - Enable/disable features per customer without code changes
4. **Minimize deployment friction** - Reuse existing preview deployment pattern from ADR-0010
5. **Respect contractual exclusivity** - Short-lived branches allowed only when legally required; retired immediately after use

Demo deployments are distinct from:
- **Dev** (floating pointer, ADR-0009 A3): latest build, zero stability guarantee
- **Preview** (PR-scoped, ADR-0010 A2): ephemeral, 14-day TTL
- **Prod** (semver releases, ADR-0008): production traffic, strict change control

## Decision

### A1: Config Overlays Over Branches

**Decision**: Demo environments are created via **config overlays** that reference versioned artifacts. Branches are avoided unless contractually required (e.g., customer requires private fork for review).

**Architecture**:

```
config/
  remotes.config.json        # base prod manifest
  remotes.config.dev.json    # dev environment (floating)
  remotes.config.demo-acme.json      # ACME Corp demo overlay
  remotes.config.demo-globex.json    # Globex Inc demo overlay
  app-config.json                    # base prod app-config
  app-config.demo-acme.json          # ACME Corp feature flags
  app-config.demo-globex.json        # Globex Inc feature flags
```

**Overlay Format** (`remotes.config.demo-acme.json`):

```json
{
  "schemaVersion": "2.0.0",
  "chrome": {},
  "features": {
    "/widget": {
      "mfe": "widget",
      "entryUrl": "https://mfesdev.blob.core.windows.net/mfes-dev/mfe-widget/v1.2.3/remoteEntry.js"
    },
    "/catalog": {
      "mfe": "catalog",
      "entryUrl": "https://mfesdev.blob.core.windows.net/mfes-dev/mfe-catalog/v1.0.5/remoteEntry.js"
    }
  }
}
```

**App Config Overlay** (`app-config.demo-acme.json`):

```json
{
  "schemaVersion": "0.1.0",
  "apiBaseUrl": "https://demo-acme-api.example.com",
  "logoutUrl": "https://demo-acme.example.com/logout",
  "auth": {
    "keycloakUrl": "https://auth.example.com",
    "realm": "demo-acme",
    "clientId": "mfe-shell-demo"
  },
  "featureFlags": {
    "advancedReporting": true,
    "betaWidgets": false
  }
}
```

**Rationale**:

- **No branch per customer**: Overlays live on `main`, reducing merge debt
- **Immutable artifact references**: Only semver releases (`v*`), never `sha-*` or `pr-*`
- **Feature flag source of truth**: `app-config` overlay owns feature toggles; K8s env vars are transport only
- **Versioning is explicit**: Config overlay shows exactly which MFE version is deployed per demo

**Trade-offs**:

- Pro: Zero branch maintenance overhead for typical demos
- Pro: Config changes go through normal PR review (audit trail)
- Pro: Overlays compose easily (base + demo-specific = final manifest)
- Con: Customer-private feature work still requires short-lived branch (see A2)

### A2: Short-Lived Branches for Contractual Exclusivity Only

**Decision**: When a customer contract requires exclusive access to feature code (e.g., NDA-protected POC), use a short-lived branch. Retire the branch immediately after contract milestone.

**Workflow**:

1. Branch from `main`: `demo/acme-private-widget`
2. Implement feature on branch
3. Deploy branch artifacts to `demo-acme/` paths (reusing ADR-0010 preview pattern)
4. Customer reviews during contract window (e.g., 2-week POC)
5. On contract completion:
   - Merge feature to `main` if feature becomes product (normal flow)
   - Delete branch and `demo-acme/` artifacts if feature is abandoned
6. Update `remotes.config.demo-acme.json` to reference merged semver release

**Lifecycle**:

- **Max lifetime**: 30 days (enforced via Azure lifecycle policy, see A4)
- **Cleanup trigger**: Manual (runbook task post-contract)
- **Revalidation**: Branch must be rebased from `main` every 7 days to prevent drift

**Rationale**:

- Honors contractual obligations (customer owns preview rights to POC)
- Avoids long-lived feature branches (merge debt)
- Forces "merge or delete" decision at contract end
- Rebase requirement prevents security patch drift

**Trade-offs**:

- Pro: Satisfies NDA/exclusivity requirements
- Pro: Branch lifecycle is explicit and enforced
- Con: Adds rebase chore for long POCs (acceptable; encourages faster merge)

### A3: Demo Tier Deployment Pattern

**Decision**: Demo deployments reuse ADR-0010 preview infrastructure with `demo-<customer>/` prefix instead of `pr-<number>/`.

**Path Structure**:

```
mfes-dev/
  mfe-widget/
    demo-acme/
      remoteEntry.js
      build-info.json
    demo-globex/
      remoteEntry.js
      build-info.json
demo-shells/
  acme/
    index.html
    remotes.config.json       # generated from remotes.config.demo-acme.json
    app-config.json           # generated from app-config.demo-acme.json
    build-info.json
  globex/
    index.html
    remotes.config.json
    app-config.json
    build-info.json
```

**Deployment Trigger**:

- Workflow: `.github/workflows/deploy-demos.yml`
- Trigger: Manual (`workflow_dispatch`) with `customer` input parameter
- Config source: `config/remotes.config.demo-<customer>.json` and `config/app-config.demo-<customer>.json`
- Concurrency group: `deploy-demo-<customer>` (serialize per-customer, allow parallel across customers)

**Config Resolution**:

1. Read `config/remotes.config.demo-<customer>.json`
2. For each MFE with version pin (`v1.2.3`), assert artifact exists in `mfes-prod/<mfe>/v1.2.3/`
3. For each MFE without pin, default to latest release from `mfes-prod/<mfe>/latest/`
4. Build demo shell with resolved manifest and app-config overlay
5. Upload to `demo-shells/<customer>/`

**Rationale**:

- Reuses preview deployment code (low implementation cost)
- `demo-<customer>/` prefix clearly distinct from `pr-*/` (no namespace collision)
- Config files on `main` prevent "config drift" (what's deployed is in git)
- Manual trigger prevents accidental demo overwrites

**Trade-offs**:

- Pro: Leverages ADR-0010 preview tooling (DRY)
- Pro: Config overlays are code-reviewed and versioned
- Con: Manual dispatch workflow (acceptable; demos are infrequent)

### A4: Lifecycle Policy Extension for Demo Paths

**Decision**: Extend Azure Storage lifecycle policy from ADR-0010 A4:

- `pr-*` prefixes: 14 days TTL (unchanged)
- `sha-*` prefixes: 30 days TTL (unchanged)
- `demo-*` prefixes: **90 days TTL** (new)

**Rationale**:

- Demos run longer than PRs (weeks vs days), need longer TTL
- 90 days forces periodic revalidation (no indefinite stale demos)
- Cleanup is explicit via runbook post-contract (lifecycle policy is backstop)

**Trade-offs**:

- Pro: Automatic garbage collection for abandoned demos
- Pro: TTL encourages active demo management
- Con: Long-running demos (>90 days) require manual re-deploy (acceptable; rare)

### A5: Feature Flags via App-Config Overlays

**Decision**: Feature flags for demos are declared in `app-config.demo-<customer>.json`, not environment variables or K8s ConfigMaps.

**Example**:

```json
{
  "schemaVersion": "0.1.0",
  "featureFlags": {
    "advancedReporting": true,
    "betaWidgets": false,
    "customerSpecificIntegration": true
  }
}
```

**Runtime Behavior**:

- Shell fetches `/app-config.json` at bootstrap (per existing runtime-config flow)
- MFEs read flags via shell-provided context (existing pattern)
- No K8s restarts required to change flags (edit config, re-run deploy workflow)

**K8s Environment Variables as Transport Only**:

- `APP_CONFIG_URL` env var points to blob path (e.g., `https://.../demo-shells/acme/app-config.json`)
- Config content lives in blob storage, not K8s manifest
- Enables config updates without K8s manifest changes

**Rationale**:

- Single source of truth (config file in repo)
- Config changes follow git PR workflow (audit trail, review)
- No "what's deployed?" mystery (check git, not K8s)

**Trade-offs**:

- Pro: Config is versioned and reviewable
- Pro: Decouples feature flags from infrastructure (no kubectl required)
- Con: Requires shell bootstrap to support app-config overlays (already implemented per `remote-config-environment-cleanup` change)

## Alternatives Considered

### Alt 1: Branch Per Customer (Traditional Approach)

**Rejected**: Creates long-lived feature branches that diverge from `main`. Merge debt accumulates, security patches lag. Overlays solve the same problem without branching.

### Alt 2: K8s ConfigMaps for Feature Flags

**Rejected**: ConfigMaps are opaque to git history (no PR review for flag changes). App-config overlays provide better audit trail and integrate with existing runtime-config pattern.

### Alt 3: Separate `demo` Azure Storage Container

**Rejected**: Would require new CORS config, RBAC scope, and DNS setup. Reusing `demo-shells/` prefix in existing `dev-shell` container is simpler.

### Alt 4: Customer-Specific Subdomains

Example: `https://acme.demo.example.com`

**Rejected**: Requires wildcard DNS and TLS cert provisioning per customer. Path-based routing (`/demo-shells/acme/`) reuses existing CDN setup.

## Consequences

### Positive

- Standing parallel demos without branch proliferation
- Feature flags live in git-versioned config (audit trail)
- Reuses ADR-0010 preview deployment pattern (low implementation cost)
- Immutable artifact references prevent accidental dependency on ephemeral builds
- Lifecycle policy (90-day TTL) prevents abandoned demo accumulation

### Negative

- Manual workflow dispatch required (no auto-deploy on config change)
- Demo config overlays add files to `config/` directory (acceptable clutter)
- Customer-private features still require short-lived branch (mitigated by 30-day max lifetime)

### Neutral

- Demo TTL (90 days) is convention, tunable via lifecycle policy
- Config overlay schema may evolve (future ADR if format changes)

## Related Decisions

- [ADR-0010 (Dev Preview Deployments)](./0010-dev-preview-deployments.md) - Demo deploys reuse preview pattern
- [ADR-0009 (Azure Blob Deployment Pipeline)](./0009-azure-blob-deployment-pipeline.md) - Blob storage structure
- [ADR-0008 (Version Management)](./0008-version-management.md) - Demo overlays reference semver releases

## Implementation

- OpenSpec Change: `openspec/changes/remote-config-environment-cleanup/`
- Config Generator: `tools/config-generator/` (supports overlay generation, task group 2)
- Workflow: `.github/workflows/deploy-demos.yml` (new, manual dispatch)
- Lifecycle Policy: `scripts/azure/lifecycle-policy.json` (add `demo-*` rule)
- Runbook: `docs/runbooks/demo-deployments.md` (customer onboarding, contract-end cleanup)

---

**Last Updated**: 2026-08-14
