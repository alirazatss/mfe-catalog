# ADR-0001: Repository Structure - Split by Team Ownership

## Status

Accepted (2026-07-14)

## Context

We are building a micro-frontend system with:

- Multiple shells (customer, admin, marketing) owned by different teams
- Multiple MFEs (~10+) that deploy to shared CDN
- Shared packages (auth, events) used by all
- Each shell deploys to separate Kubernetes clusters per environment (dev/sst/demo/prod)

**The question:** Should everything stay in one monorepo, or split into multiple repos?

## Decision

Split into **four repository types**:

1. **`mf-platform`** - Shared npm packages (Platform Team)
2. **`mf-catalog`** - All MFEs (shared repo with CODEOWNERS)
3. **`customer-shell`** - Customer portal (Customer Team)
4. **`admin-shell`** - Admin dashboard (Admin Team)

## Alternatives Considered

### Alternative 1: Single Monorepo (current state)

```
mfe-runtine/
├── apps/website, apps/mfe-widget
├── packages/*
└── .github/workflows/ (12+ workflow files for 3 shells × 4 envs)
```

**Rejected because:**

- 12+ GitHub workflows become unmanageable
- Every PR triggers all workflows (or complex path filtering)
- Single CI/CD bottleneck
- Different team velocities create merge conflicts
- Breaking changes in packages require testing ALL shells

### Alternative 2: One Repo Per Team Feature

```
customer-team-repo (shell + their MFEs)
admin-team-repo (shell + their MFEs)
platform-team-repo (packages)
```

**Rejected because:**

- MFEs owned by different teams end up in different repos
- Cross-team MFEs (shared) need special handling
- Duplicated CI/CD for MFE deployment to same CDN

### Alternative 3: Fully Distributed (repo per package/app)

```
customer-shell-repo
admin-shell-repo
mfe-widget-repo
mfe-dashboard-repo
auth-package-repo
events-package-repo
```

**Rejected because:**

- ~20+ repos to maintain
- No shared tooling/config
- Coordination overhead
- Discovery/onboarding difficulty

## Consequences

### Positive

- Each team owns their deployment pipeline
- Independent shell releases (customer team can deploy without admin team)
- Clean separation of concerns
- CODEOWNERS handles multi-team MFE governance
- Turborepo change detection works within each repo

### Negative

- Package changes require npm publish + shell version bumps
- Coordinating breaking changes across repos requires planning
- Initial setup complexity (4 repos vs 1)
- Need to establish shared conventions (naming, versioning)

### Neutral

- Different velocity per repo (some teams move faster than others)
- Documentation must be per-repo (with cross-references)

## Trade-offs

We accepted **more repositories** in exchange for:

- **Autonomy**: Teams deploy on their schedule
- **Isolation**: Failures in one repo don't block others
- **Ownership**: Clear responsibility per repo
- **Scalability**: New shell = new repo, no monorepo bloat
