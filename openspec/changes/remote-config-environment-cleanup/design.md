# Design: Remote Config Environment Cleanup

## Context

The shell fetches `/remotes.config.json` at runtime (thin-shell manifest pattern). Today that manifest has four sources that can disagree: a committed `public/remotes.config.json`, two env configs also in `public/`, a baked-in `FALLBACK_REMOTES` constant, and the config generator's output. This change collapses them to one source per context: env configs (build), local override (dev machine), nothing baked in.

## Decisions

### D1: Env configs live in `config/`, not `public/`

Everything in `public/` is copied verbatim to `dist/` by Vite. Keeping `remotes.config.dev.json` / `remotes.config.prod.json` there forced the `copy-env-remote-config` plugin to copy the selected one to `dist/remotes.config.json` **and then delete** the leftovers — a hardcoded `["dev", "prod"]` list that silently rots when environments are added. Moving the sources to `apps/shells/website/config/` means the plugin only copies one file in; there is nothing to delete and no list to maintain.

**Alternative rejected**: glob-based deletion of `dist/remotes.config.*.json` post-build. Treats the symptom; files still ship if the glob misses.

### D2: Committed `public/remotes.config.json` is deleted

It duplicated `remotes.config.dev.json` and had already drifted (route `"/"` vs generator's `"/landing-page"`). In local dev the middleware now serves the local override or falls back to `config/remotes.config.dev.json`; in builds the env selection produces `dist/remotes.config.json`. No context needs a committed root-level manifest, and its existence invites "just edit it for testing" — the exact accidental-commit hazard this change removes.

### D3: Local override is a sibling of `vite.config.ts`, generated not hand-written

`remotes.config.local.json` sits **next to** `vite.config.ts` (outside `public/`) so Vite can never ship it. It is gitignored and produced by the config generator (`--environment local`), which reads the local port map — so port changes propagate instead of rotting in a hand-edited file. Serve precedence in dev middleware: local file → dev env config.

### D4: `development` mode renamed to `local`

"dev" now unambiguously means the deployed shared environment (CONTEXT.md glossary). The generator mode that emits localhost URLs is `local`. The old name errors with guidance rather than being silently aliased — an alias would keep the ambiguity alive in scripts and docs.

### D5: Shell config designates the root MFE

Which MFE owns `"/"` is the **shell's** composition decision, not a property of any MFE. MFEs declare default base paths (`/landing-page`, `/widget`); the shell config names one as root and the generator rewrites its route key to `"/"`. This fixes the standing generator/manifest drift where the generator emitted `"/landing-page"` while the shell served `"/"`.

### D6: `FALLBACK_REMOTES` is deleted — fail visible

The baked-in fallback pointed at **dev** blob URLs. In prod, a transient manifest fetch failure would silently mount dev MFEs: wrong code, wrong data contracts, no alarm. A hard failure with the critical-error UI is strictly better — visible, diagnosable, and already specced as the fetch-failure scenario. Recorded as an amendment to ADR-0006 (graceful failure handling): graceful degradation applies **per-MFE**, never by substituting the whole manifest.

Note: `shell-config-boot-validation` (app-config) keeps its own dev-only fallback; that spec's reference to the "FALLBACK_REMOTES pattern" becomes historical and is untouched here.

### D7: Demo model is documented, not built

Per-customer demos are standing parallel deployments differing by config overlay (manifest + app-config), pinning **versioned immutable artifacts** (never `sha-*`/`pr-*` paths, which expire per ADR-0010 lifecycle policies). Feature variation reaches MFEs via app-config; Kubernetes env vars are transport only, with the repo overlay as source of truth. This lands as ADR-0011 now — the decisions are settled and hard to reverse — but no tooling is built in this change.

## Risks

- **Pending-change collision**: `azure-blob-deployment-pipeline` (not yet archived) specs the prod-config PR workflow against `public/remotes.config.prod.json`. Its delta and workflow must be updated to `config/` paths — called out in tasks.
- **CI paths**: any workflow referencing `public/remotes.config.*.json` breaks until updated; grep in tasks covers this.
- **Behavior change**: environments relying (accidentally) on the baked-in fallback will now show the error UI. That is the intended fail-visible behavior.
