# MFE and Shell Scaffolding Generators

## Why

Adding a new MFE or shell today is manual copy-paste from an existing app followed by a scavenger hunt through registration points: dev/prod remotes configs, a per-shell caller workflow, hardcoded fallback lists in `cleanup-previews.yml`, dev-server port selection, and turbo/test filters. Nothing enforces uniformity, so each new app drifts from the conventions the platform depends on (lifecycle exports, `mfe-*` naming, port strategy, size budget scripts). With multi-shell and release-channel pipelines now in place, the cost of a misregistered app is a broken deploy path, not just local friction.

## What Changes

- Adopt `@turbo/gen` (Turborepo's built-in Plop-powered generator) as the scaffolding tool: templates under `turbo/generators/templates/`, prompts and actions in `turbo/generators/config.ts`, invoked via `pnpm turbo gen <name>`.
- **MFE generator** (`turbo gen mfe`): scaffolds `apps/mfes/mfe-<name>/` from a template matching the current `mfe-widget` anatomy — lifecycle exports (`bootstrap`/`mount`/`unmount`), standalone dev entry, vite + vitest + tsconfig, test setup — with the next free dev-server port auto-assigned.
- **Shell generator** (`turbo gen shell`): scaffolds `apps/shells/<name>/` matching the `website` anatomy (thin shell, no Module Federation, shell-runtime boot, slots, env configs, `generate:config`/`check:size` scripts) AND the thin caller workflow `.github/workflows/deploy-<name>.yml` wired to the reusable `deploy-shell.yml`.
- **Full auto-wiring**: generators patch every registration point — `remotes.config.dev.json`/`remotes.config.prod.json` entries in every shell (MFE generator), hardcoded shell/MFE fallback lists in `cleanup-previews.yml`, workflow path filters — and print a summary of files created/modified plus any steps that cannot be automated (e.g., Azure lifecycle already covers new prefixes, first prod tag).
- **Template drift guard**: a CI job scaffolds a throwaway MFE and shell into a temp workspace and runs typecheck + build + tests on them, so templates cannot rot silently. Runs when `turbo/generators/**` changes.

Out of scope: a Tailwind variant flag; migrating existing apps onto the templates; converting shells to Module Federation; Nx adoption; Azure provisioning changes (existing lifecycle policy and container layout already accommodate new names).

## Capabilities

### New Capabilities

- `app-scaffolding`: turbo gen generators that create uniform MFEs and shells with all registration points auto-wired, plus the CI drift guard.

### Modified Capabilities

- None. Generators produce artifacts that conform to existing specs (`mfe-lifecycle-contract`, `reusable-shell-deploy-workflow` thin callers, `pr-preview-deployments` fallback lists); those specs are unchanged.

## Impact

- New: `turbo/generators/config.ts`, `turbo/generators/templates/mfe/**`, `turbo/generators/templates/shell/**`, `.github/workflows/scaffold-check.yml`.
- Modified by the generators at run time (not by this change): `apps/shells/*/public/remotes.config.{dev,prod}.json`, `.github/workflows/cleanup-previews.yml`, new `.github/workflows/deploy-<shell>.yml` per shell.
- Root `package.json` devDependency `@turbo/gen`; `gen` convenience script.
- Success criteria: `turbo gen mfe` + one commit produces an MFE that deploys through the existing pipeline with zero manual edits; drift guard green in CI.
- Risks: template/reality divergence (mitigated by drift guard), YAML patching fragility in `cleanup-previews.yml` (mitigated by marker comments delimiting generated lists).
