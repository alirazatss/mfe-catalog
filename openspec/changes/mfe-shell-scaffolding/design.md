# Design: mfe-shell-scaffolding

## Context

Two MFEs and one shell exist, all hand-built. Discovery is convention-driven (`apps/mfes/mfe-*` glob, port auto-increment from 5174, scope derived from short name), config generation is already dynamic, but registration remains manual: per-shell remotes configs, per-shell caller workflows, and hardcoded fallback lists in `cleanup-previews.yml`. The multi-shell and release-channel pipeline work made conventions load-bearing; scaffolding is how they stay enforced.

## Decisions

### D1: @turbo/gen (chosen) vs. Plop directly vs. bespoke tsx script vs. Nx generators

`@turbo/gen` is Plop under the hood, ships with the turbo the repo already uses, discovers `turbo/generators/config.ts` automatically, and is the documented standard for turborepo scaffolding. Raw Plop adds a second tool config for zero benefit. A bespoke script means owning prompting, templating, and dry-run behavior forever. Nx generators require adopting Nx. Trade-off: turbo gen's action set is Plop's (add/addMany/modify) plus custom TS actions — sufficient, since auto-wiring runs as custom actions with full Node access.

### D2: Templates are Handlebars copies of the real apps, minimized

Templates live in `turbo/generators/templates/{mfe,shell}/` as `.hbs` files derived from `mfe-widget` and `website`, stripped to the platform-required skeleton (lifecycle exports, boot wiring, one starter component/test) rather than full app copies. Alternative — copying a live app at generation time — was rejected: it drags app-specific code (Tailwind, legacy dirs, real features) into every new app and makes "template" mean "whatever mfe-widget looks like today". Drift risk of separate templates is exactly what the CI guard covers.

### D3: Auto-wiring patches files with marker-delimited regions

JSON configs are parsed and re-serialized (safe). YAML fallback lists in `cleanup-previews.yml` are patched between `# scaffold:mfe-list:start/end` (and shell equivalent) marker comments — string surgery inside markers keeps patching idempotent and avoids YAML round-trip formatting churn. Requires a one-time manual edit adding the markers around the existing lists. Alternative — deriving lists dynamically in the workflow at run time — is better long-term but expands scope into pipeline behavior owned by other specs; markers work today and the generator's summary makes any residue visible.

### D4: Port assignment reuses monorepo-tools discovery

The generator calls `discoverMicroFrontends()` and takes the lowest free port ≥ 5174, writing it into the template. This keeps one source of truth for port logic instead of re-implementing the increment rule in the generator. Trade-off: generator gains a workspace dependency on `@mfe-runtime/monorepo-tools`; acceptable, it's an internal package.

### D5: Drift guard scaffolds into the working tree, then discards

The guard workflow runs `turbo gen` non-interactively (answers passed via CLI args), then runs typecheck/build/test filtered to the throwaway apps. Scaffolding in-tree (not a temp dir) is required so workspace resolution, catalogs, and tsconfig inheritance behave exactly as for a real app. Nothing is committed; the job workspace is ephemeral. Scoped to `turbo/generators/**` path changes to keep it off the hot path of normal PRs.

### D6: Shell generator emits the caller workflow rather than a matrix

Matches the thin-caller decision from the multi-shell change (one small caller file per shell, reusable workflow holds all logic). The generator template for `deploy-<name>.yml` is the mechanical enforcement of that contract, including the release-channel `compute-channel` job shape from `deploy-website.yml`.

## Risks & Mitigations

- **Templates rot as conventions evolve**: CI drift guard fails the PR that breaks scaffoldability; template updates become part of convention changes.
- **Marker comments deleted by hand-edits**: generator fails loudly with instructions when markers are missing, never silently skips wiring.
- **Prod config entry for a brand-new MFE points at a not-yet-published blob URL**: entries use the versioned URL pattern with the scaffolded version; the shell's graceful-failure boundaries already tolerate a missing remote, and the run summary flags "publish mfe before shipping prod config".
- **Non-interactive gen flags change across turbo versions**: pin `@turbo/gen` via catalog; drift guard catches breakage.

## Migration Plan

Additive. Order: (1) add `@turbo/gen` + generator config + MFE template; (2) shell template + caller-workflow template; (3) marker comments into `cleanup-previews.yml`; (4) drift guard workflow. Existing apps are untouched; optionally diff them against templates later, out of scope.
