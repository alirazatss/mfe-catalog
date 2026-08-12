## Context

Local development for shells and MFEs currently depends on implicit or hardcoded port choices. When a preferred port is already occupied, developers have to reconcile the port change manually across dev startup, remote URLs, and manifest generation. The result is avoidable drift between what is running locally and what the shell thinks it should load.

This change introduces a canonical local port map so the resolved dev port is a shared source of truth for discovery and local manifest generation.

## Goals / Non-Goals

**Goals:**

- Keep local manifest URLs aligned with the actual resolved runtime port.
- Avoid manual edits when a preferred local port is occupied.
- Preserve stable port assignments while they remain available.
- Make port resolution explicit and observable for developers.

**Non-Goals:**

- Changing production or CDN URL generation.
- Reworking Module Federation runtime behavior.
- Introducing a new remote discovery protocol.
- Changing shell routing or app bootstrap behavior beyond port lookup.

## Decisions

1. **Use a canonical local port map as the source of truth.**
   The map records the resolved local port for each shell and MFE so discovery and manifest generation read the same value.
   Alternatives considered: keeping ports only in vite config, or deriving them on the fly without persistence. Those options still require manual sync and make local manifest output drift.

2. **Treat `package.json mfe.port` as a preferred port, not an absolute lock.**
   If the preferred port is available, it is used. If it is occupied, tooling resolves another free port and stores the resolved value.
   Alternatives considered: strict port failure, which is predictable but still forces manual intervention, and silent fallback, which hides port drift.

3. **Reuse resolved ports while they remain available.**
   This keeps URLs stable across restarts and reduces churn for shell-to-MFE links.
   Alternatives considered: always reassign on startup, which increases surprise and forces manifest churn.

4. **Have local manifest generation consume the resolved map directly.**
   The manifest should always reflect the current resolved runtime port, so no manual editing is needed when a port changes.
   Alternatives considered: editing the manifest after startup or keeping a separate port list for manifest generation. Both duplicate state.

## Risks / Trade-offs

- Port resolution can drift if two local sessions mutate the map at the same time. → Use atomic writes and keep the map update path narrow.
- Automatic remapping may surprise developers who expect fixed ports. → Emit the resolved port in startup output and keep the map visible in the repo.
- Existing tests and docs assume alphabetical assignment. → Update tests and documentation in the same change set.

## Migration Plan

1. Introduce the local port map and wire discovery to read and update it.
2. Update local manifest generation to read resolved ports from the map.
3. Convert existing MFE defaults to preferred ports so the current dev layout still starts cleanly.
4. Update tests and fixtures that assert alphabetical port assignment or manual manifest edits.
5. Roll out by verifying a shell can start, load MFEs, and generate consistent local URLs without manual file edits.

Rollback strategy: revert the port-map lookup and restore the previous discovery-based assignment behavior if the new resolution flow causes startup regressions.

## Open Questions

- Where should the resolved local port map live in the repo so it is easy to inspect but does not get confused with production config?
- Should the resolved map be committed or treated as a generated local artifact?
