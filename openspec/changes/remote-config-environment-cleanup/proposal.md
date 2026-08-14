# Remote Config Environment Cleanup

## Why

The remote-config environment model has four latent hazards discovered during design review: (1) a committed `public/remotes.config.json` is served implicitly in local dev and copied to every build, drifting from the per-environment configs; (2) per-environment configs live in `public/`, forcing a fragile copy-then-delete dance at build time; (3) the shell bakes in `FALLBACK_REMOTES` pointing at **dev** blob URLs, so a prod manifest fetch failure silently loads dev MFEs (a latent production incident); (4) the config generator's "development" mode conflicts with the deployed `dev` environment terminology and emits a route key that conflicts with the shell's root route.

## What Changes

- Move `remotes.config.dev.json` / `remotes.config.prod.json` out of `public/` into `apps/shells/website/config/`; build copies exactly one to `dist/remotes.config.json`. No post-build deletion needed.
- Delete committed `apps/shells/website/public/remotes.config.json`. **BREAKING** for any workflow that edited it directly.
- Local dev serves gitignored `apps/shells/website/remotes.config.local.json` at `/remotes.config.json` when present; otherwise falls back to the `dev` env config.
- Rename config generator environment mode `development` → `local`; generator becomes the documented entry point for producing `remotes.config.local.json`.
- Shell config designates the root MFE; generator maps the designated root MFE to route `"/"`, other MFEs keep their default base paths.
- Delete `FALLBACK_REMOTES` from the shell. Manifest fetch failure renders the critical-error UI; no baked-in remote fallback. **BREAKING** behavior change (fail-visible instead of fallback). Recorded as an ADR-0006 amendment.
- Document the per-customer demo deployment model (config overlays over branches, versioned artifact pinning, flags via app-config transport) as a new ADR. Documentation only; no demo tooling in this change.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `environment-specific-remote-config`: env config file location moves out of `public/`; local override serving; committed root manifest removed.
- `config-generation`: environment mode rename `development` → `local`; local override file output; root MFE route designation.
- `thin-shell-bootstrap`: manifest fetch failure MUST NOT fall back to baked-in remotes; error UI is the only failure behavior.

## Impact

- **Code**: `apps/shells/website/vite.config.ts` (plugins), `apps/shells/website/public/` (file removals), `apps/shells/website/src/config/remotes.ts` (deleted), `apps/shells/website/src/main.ts`/runtime call sites, `packages/monorepo-tools/src/config-generator.ts`, `scripts/generate-config.ts`.
- **CI/CD**: `DEPLOY_ENV`-driven builds keep working; the prod-config-PR workflow path changes from `public/remotes.config.prod.json` to `config/remotes.config.prod.json` (coordinate with the pending `azure-blob-deployment-pipeline` change).
- **Docs**: new ADR (demo deployment model), amendment note in ADR-0006, `GETTING_STARTED.md` local-testing section.
- **Out of scope**: sst environment provisioning, demo overlay tooling, Kubernetes flag transport, `MFEProps.flags` channel (future ADR-0007 amendment).
