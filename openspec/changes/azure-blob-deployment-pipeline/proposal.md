## Why

Micro-frontends deployed via `remoteEntry.js` files are consumed at runtime by the shell. Once a shell in production is pinned to a specific MFE version, that URL MUST remain reachable and byte-for-byte identical forever — replacing a "released" build silently breaks every downstream shell that referenced it. The repository currently has no deployment pipeline, no versioned artifact storage, and no immutability guarantees for MFE releases. This change establishes a git-tag-driven, OIDC-authenticated pipeline that publishes each release to a versioned, immutable path in Azure Blob Storage, with separate environments for `dev` and `prod`, and a config-driven mechanism for the shell to pin exact MFE versions per environment.

## What Changes

- Introduce a single Azure Blob Storage account (`tssmfestorage`) as the deployment target for all environments. Environment separation is enforced by container: `mfes-dev` and `mfes-prod` hold MFE artifacts; `dev-shell` holds the dev shell (served as raw blob); `$web` holds the prod shell (served via Azure Blob static-website endpoint). Each MFE publishes to `<mfes-env>/<mfe-name>/v<version>/` (immutable) or `<mfes-env>/<mfe-name>/dev/` (floating pointer, dev only).
- Introduce GitHub Actions workflows for each deployable app (`mfe-widget`, `mfe-landing-page`, `website`) that:
  - Deploy to `dev` on push to `main`.
  - Deploy to `prod` on git tag matching `<app-name>-v<semver>`.
  - Refuse to overwrite an existing versioned prod path (`--if-none-match "*"`), failing the workflow if the version already exists.
  - Validate that the tag version matches the app's `package.json` version.
- Introduce OIDC federated identity between GitHub Actions and Azure AD: one AD app per environment (`gha-mfe-dev`, `gha-mfe-prod`), each holding `Storage Blob Data Contributor` scoped at the **container** level to only its environment's containers (dev app → `mfes-dev` + `dev-shell`; prod app → `mfes-prod` + `$web`). Prod trust condition restricts issuance to tag refs matching `*-v*`. No long-lived Azure secrets are stored in GitHub.
- Split shell remote configuration into environment-specific files: `remotes.config.dev.json` (floating pointers) and `remotes.config.prod.json` (pinned versions). Shell selects the correct file at build time based on target environment.
- Automate prod config updates: successful MFE tag deploys open a pull request against the shell repo bumping the pinned version in `remotes.config.prod.json`. A human reviews and merges; merging triggers a shell rebuild-and-redeploy.
- Shell deploys asymmetrically per environment. Prod shell → versioned path `$web/v<version>/` (immutable) + copy to `$web/` root for the static-website endpoint. Dev shell → `dev-shell/` container root (raw blob URL). Two shell prod triggers: (a) shell tag, (b) merge to `main` that touches `remotes.config.prod.json` (rebuild + `$web` root copy only, no new version cut).
- Add Azure setup runbook (single storage account creation, container layout, CORS, static-website hosting enablement, OIDC federated credentials, container-scoped RBAC role assignments) so the platform can be provisioned reproducibly.
- Record ADR-0009 documenting all decisions above, including explicit debt: (a) raw blob URLs (including the dev shell URL) baked into prod configs and dev entrypoints, deferring CDN + custom domain; (b) no WORM immutability policy, relying on workflow discipline plus OIDC scoping plus container-level RBAC; (c) `sst` and `demo` environments deferred; (d) no automated cleanup / retention policy for old versions; (e) single-account model chosen for MVP simplicity — migrating to per-environment accounts later would require rewriting every URL in every historical `remotes.config.prod.json`.

## Capabilities

### New Capabilities

- `mfe-deployment-pipeline`: git-tag-driven publication of MFE artifacts to versioned, immutable Azure Blob paths; dev deploys on push to `main`; refuses to overwrite existing prod versions; validates tag/package version parity.
- `shell-deployment-pipeline`: versioned shell deploys (`$web/v<version>/`) with concurrent `$web/` root copy for live traffic; supports both tag-triggered version cuts and config-only redeploys.
- `azure-blob-storage-layout`: canonical single-account model (`tssmfestorage`), container-based environment separation (`mfes-dev`, `mfes-prod`, `dev-shell`, `$web`), path structure, CORS policy; extensible naming pattern leaves room for future `sst` and `demo` containers on the same account.
- `github-actions-azure-oidc`: OIDC federated identity configuration between GitHub Actions and Azure AD; per-environment AD apps; RBAC scoped at the **container level** to only that environment's containers; prod trust condition restricted to `refs/tags/*-v*`.
- `environment-specific-remote-config`: split `remotes.config.dev.json` (floating dev pointers) and `remotes.config.prod.json` (pinned prod versions) selected by shell build target; automated PR flow for prod config bumps triggered by successful MFE tag deploys.

### Modified Capabilities

<!-- None. `remote-config-structure` and `remote-config-schema` describe the schema of a single config file, not the environment-selection mechanism. If subsequent inspection shows the schema itself must change (e.g., to add an `environment` field), a delta will be added. -->

## Impact

- **New files**: `.github/workflows/deploy-mfe-widget.yml`, `.github/workflows/deploy-mfe-landing-page.yml`, `.github/workflows/deploy-website.yml`; `apps/shells/website/public/remotes.config.dev.json`, `apps/shells/website/public/remotes.config.prod.json`; `docs/adr/0009-azure-blob-deployment-pipeline.md`; a runbook under `docs/runbooks/azure-blob-provisioning.md`.
- **Modified files**: `apps/shells/website/vite.config.ts` (or an equivalent build step) to select the correct `remotes.config.<env>.json` at build time; each app's `package.json` gains a `version` field discipline (must match deploy tag).
- **New external resources**: one Azure Blob Storage account (`tssmfestorage`) with containers `mfes-dev`, `mfes-prod`, `dev-shell`, and `$web` (auto-created by enabling static-website hosting); two Azure AD app registrations (`gha-mfe-dev`, `gha-mfe-prod`) with federated credentials; container-scoped RBAC role assignments (`Storage Blob Data Contributor`) — dev app on `mfes-dev` + `dev-shell`, prod app on `mfes-prod` + `$web`.
- **New GitHub configuration**: repository variables for Azure tenant/subscription/client IDs per environment (no secrets required due to OIDC); `GITHUB_TOKEN` used for same-repo PR automation on prod config bumps.
- **Deferred / logged as debt**: no CDN, no custom domain, no WORM immutability policy, no `sst`/`demo` environments, no version retention automation, single-account MVP model (future split into per-env accounts would require config URL rewrites). Debt captured in ADR-0009 with named tradeoffs.
- **No runtime code changes** to MFEs or shell bootstrap logic. The dynamic loader continues to read `remotes.config.json`; only which file is selected changes.
- **Backwards compatibility**: no existing deployments to migrate. This is greenfield deployment infrastructure.
