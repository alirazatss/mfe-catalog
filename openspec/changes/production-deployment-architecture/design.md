## Context

The current monorepo architecture supports local development with auto-discovery and dynamic loading. Production deployment infrastructure now exists via `azure-blob-deployment-pipeline`: MFEs and (once its task group 4 lands) the shell deploy to Azure Blob Storage account `tssmfestorage` with OIDC auth, per-environment containers, and immutable versioned paths for prod. What's still missing is a way for the shell to discover MFE versions **without** a `remotes.config.prod.json` PR + shell rebuild for every MFE release.

The shell currently uses compile-time configuration (`remotes.config.json`) which couples deployment timing between shell and MFEs for anything beyond the two MFEs already pinned via PR. This change adds a runtime-fetched `manifest.json`, layered on the same Azure Blob Storage account, so MFE releases can update shell-visible routing without a shell redeploy.

**Current State:**

- Turborepo monorepo with `apps/mfes/mfe-*` pattern
- Dynamic loader fetches static config at runtime
- Config generation script discovers MFEs and generates localhost URLs (dev) or `tssmfestorage.blob.core.windows.net` URLs (prod, via `azure-blob-deployment-pipeline`)
- `azure-blob-deployment-pipeline` already provides: Azure Blob Storage infra, OIDC-authenticated CI/CD, immutable versioned MFE asset paths, and PR-based `remotes.config.prod.json` pinning
- No independent-of-shell-rebuild MFE version discovery yet — that's this change's actual scope

**Constraints:**

- Must maintain monorepo structure (no splitting into separate repos)
- Cannot introduce coordination requirements between teams
- Shell must remain backward-compatible with development workflow
- MUST reuse the existing `tssmfestorage` Azure Blob Storage account, its containers, CORS configuration, and OIDC identities — no second cloud provider or parallel CDN
- Build artifacts must be immutable (versioned URLs), matching `azure-blob-deployment-pipeline`'s existing guarantee

**Stakeholders:**

- Frontend teams shipping MFE features
- Platform team maintaining shell and infrastructure
- DevOps extending the existing Azure Blob Storage CI/CD pipeline
- End users requiring zero-downtime deployments

---

## Goals / Non-Goals

**Goals:**

- Enable independent MFE deployment without redeploying shell or opening a config PR per release
- Implement semantic versioning for each MFE
- Extend the existing `deploy-mfes.yml` Turborepo-based change detection with an atomic manifest-update job
- Generate a production manifest mapping MFE names to `tssmfestorage.blob.core.windows.net` URLs and versions
- Update shell to fetch manifest at runtime and resolve MFE URLs dynamically
- Support instant rollbacks by updating manifest without rebuilding, reusing already-immutable per-version blobs
- Preserve development workflow (localhost, no manifest required)

**Non-Goals:**

- Splitting monorepo into separate repositories
- Real-time manifest updates (polling/websocket)
- A/B testing or gradual rollouts (future enhancement)
- Introducing a second cloud provider or a CDN layer in front of Azure Blob Storage (Azure Front Door/Azure CDN fronting is a separate future enhancement, tracked as debt item A7 in ADR-0009)
- MFE-level authentication or API gateways
- Server-side rendering for MFEs (client-side only)

---

## Decisions

### Decision 1: Semantic Versioning from package.json

**Choice:** Derive MFE versions from `package.json` version field, enforce semver format

**Rationale:**

- Standard npm convention, familiar to all developers
- Clear upgrade semantics (major/minor/patch)
- Turborepo already understands package.json dependencies
- Simplifies tooling (no custom version management)

**Alternatives Considered:**

- **Git tags only:** Couples version to commit, harder to pre-release
- **Build timestamp:** Not semantic, rollback requires knowing exact time
- **Manual version file:** Extra maintenance burden, easy to forget

**Trade-off:** Developers must remember to bump versions (mitigate with PR checks)

---

### Decision 2: Manifest JSON Format

**Choice:** Create custom manifest format separate from remotes.config.json

**Rationale:**

- Production needs different fields (integrity hashes, metadata)
- Manifest is public-facing, config is internal development artifact
- Allows schema evolution without breaking development workflow
- Clear separation between dev and prod concerns

**Structure:**

```json
{
  "version": "1.0.0",
  "timestamp": "2026-07-09T10:00:00Z",
  "environment": "production",
  "microfrontends": {
    "mfe-widget": {
      "version": "1.2.3",
      "url": "https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.3/remoteEntry.js",
      "integrity": "sha384-...",
      "scope": "widget",
      "module": "./App"
    }
  }
}
```

**Alternatives Considered:**

- **Reuse remotes.config.json:** Mixes dev and prod concerns, harder to validate
- **NPM package.json:** Too heavyweight, not designed for runtime fetching
- **Custom binary format:** Overkill, JSON is standard and debuggable

---

### Decision 3: Turborepo-Based Change Detection

**Choice:** Use `turbo run build --filter=[HEAD^1]` to detect changed packages

**Rationale:**

- Turborepo already knows dependency graph
- Automatically handles transitive dependencies (e.g., shared packages)
- No custom change detection logic needed
- Works with both commits and PR-based workflows

**How it works:**

```bash
# In GitHub Actions (extending the existing deploy-mfes.yml from azure-blob-deployment-pipeline)
git fetch origin main
turbo run build --filter='[origin/main...HEAD]'
# Only rebuilds changed MFEs and their dependents
```

Note: `azure-blob-deployment-pipeline`'s current `detect-changed-mfes` job uses git-diff based detection; migrating it to this Turborepo-filter approach is tracked separately in that change's task group 7 ("Turborepo deployment optimization") and is not duplicated here.

**Alternatives Considered:**

- **Git diff + manual parsing:** Error-prone, doesn't handle shared deps (this is what's shipped today, pending the optimization above)
- **Lerna changed:** Another tool to maintain, Turborepo already present
- **Always deploy all MFEs:** Wasteful, defeats purpose of independent deployment

---

### Decision 4: Azure Blob Storage Path Structure

**Choice:** Versioned paths with immutable content: `mfes-<env>/<mfe-name>/v<version>/remoteEntry.js`, matching the layout `azure-blob-deployment-pipeline` already established

**Rationale:**

- Immutable blob paths enable aggressive `Cache-Control: public, max-age=31536000, immutable` caching, already applied by the existing `deploy-mfes.yml` prod job
- Version in path (not query param) avoids any client-side cache-busting complexity
- Rollback = change manifest to point at an already-uploaded, never-deleted version — no blob invalidation needed
- Follows the same convention already used for `remotes.config.prod.json` pinning

**Example:**

```
https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.3/remoteEntry.js
https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.3/assets/chunk-abc123.js
```

**Alternatives Considered:**

- **Latest alias:** Requires cache purging or complex ETag negotiation on a mutable blob
- **Query param version:** Blob-level caching less effective than a distinct immutable path
- **Git hash in path:** Less human-readable, harder to track releases

**Cache headers** (already established by `azure-blob-deployment-pipeline`, reused unchanged here):

- Versioned MFE assets: `Cache-Control: public, max-age=31536000, immutable`
- Manifest (`manifest.json`, mutable): `Cache-Control: public, max-age=60` (1 minute, allows updates)

---

### Decision 5: Subresource Integrity (SRI) Hashes

**Choice:** Compute SHA-384 hashes of remoteEntry.js and include in manifest

**Rationale:**

- Security: Prevents storage account compromise or MITM tampering from altering script content undetected
- Standard browser feature (`<script integrity="...">`)
- Minimal overhead (compute once at build time)

**Implementation:**

```typescript
import crypto from "crypto";
const hash = crypto.createHash("sha384");
const content = fs.readFileSync("remoteEntry.js");
hash.update(content);
const integrity = `sha384-${hash.digest("base64")}`;
```

**Alternatives Considered:**

- **No integrity checks:** Security risk for publicly readable blob storage
- **SHA-256:** Less secure, SHA-384 is recommended standard
- **Runtime verification:** Too late, browser handles it natively

---

### Decision 6: Extend the Existing GitHub Actions Workflow

**Choice:** Add a manifest-update job to the existing `.github/workflows/deploy-mfes.yml` (shipped by `azure-blob-deployment-pipeline`) rather than authoring a new, competing workflow file

**Workflow (illustrative excerpt of the addition):**

```yaml
# .github/workflows/deploy-mfes.yml (existing file, azure-blob-deployment-pipeline)
# ...existing detect-changed-mfes / deploy-dev / deploy-prod jobs unchanged...

jobs:
  # ...existing jobs...

  update-manifest:
    needs: [deploy-dev] # or deploy-prod, depending on trigger
    if: success()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2 # reuses existing gha-mfe-dev / gha-mfe-prod OIDC federated credential
      - run: pnpm generate:manifest --env=${{ env.TARGET_ENV }}
      - run: az storage blob upload --account-name tssmfestorage --container-name mfes-${{ env.TARGET_ENV }} --name manifest.json --file manifest.${{ env.TARGET_ENV }}.json --overwrite --content-cache-control "public, max-age=60"
```

**Rationale:**

- Reuses the existing matrix deploy, OIDC auth, and change-detection logic instead of duplicating it
- `update-manifest` only runs after **all** matrix MFEs in that run succeed, giving atomic consistency
- No new workflow file, no new triggers, no new secrets

**Alternatives Considered:**

- **Separate workflow per MFE:** Too many workflows, hard to coordinate
- **A brand-new `deploy-mfes.yml`:** Would collide with and duplicate the already-shipped workflow from `azure-blob-deployment-pipeline`
- **Monolithic script:** Less visible, harder to debug failures

---

### Decision 7: Manifest Fetching in Shell

**Choice:** Fetch manifest at application bootstrap, cache in localStorage with 24h TTL

**Implementation:**

```typescript
// apps/shells/website/src/config/remotes.ts
export async function initializeRemotes() {
  const manifestUrl = import.meta.env.PROD
    ? "https://tssmfestorage.blob.core.windows.net/mfes-prod/manifest.json"
    : "/remotes.config.json";

  const manifest = await fetchWithCache(manifestUrl, {
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    cacheKey: "mfe-manifest",
  });

  await loader.init({ manifest });
}
```

**Rationale:**

- Bootstrap fetch ensures manifest available before any MFE loads
- localStorage cache enables offline operation and reduces network calls
- 24h TTL balances freshness with offline UX
- Environment variable switch keeps dev workflow unchanged
- Cross-origin fetch works because the account-level CORS `azure-blob-deployment-pipeline` already configured (`GET`/`OPTIONS` from `*`) covers this blob too

**Alternatives Considered:**

- **No caching:** Poor offline UX, extra network overhead
- **Service worker caching:** More complex, requires SW registration
- **Fetch on-demand per MFE:** Race conditions, duplicate requests

---

### Decision 8: Dynamic Loader Manifest Support

**Choice:** Extend dynamic loader to accept manifest, transform to internal config format

**API Change:**

```typescript
// Before
loader.init(); // Fetches /remotes.config.json

// After
loader.init({ manifest }); // Transforms manifest to config
loader.init(); // Still works, fetches /remotes.config.json
```

**Transformation:**

```typescript
function manifestToConfig(manifest: Manifest): RemoteConfig {
  return {
    remotes: Object.entries(manifest.microfrontends).map(([name, mfe]) => ({
      name,
      scope: mfe.scope,
      module: mfe.module,
      entryUrl: mfe.url,
      version: mfe.version,
      enabled: true,
    })),
  };
}
```

**Rationale:**

- Backward compatible (existing code works)
- Keeps loader's internal logic unchanged
- Manifest format isolated from loader internals

---

## Risks / Trade-offs

### Risk 1: Manifest Fetch Failure Breaks Application

**Mitigation:**

- Implement exponential backoff retry (3 attempts)
- Cache manifest in localStorage for offline fallback
- Display user-friendly error with "Retry" button
- Monitor manifest fetch failures in production telemetry

**Trade-off:** Adds ~500ms to startup time (fetch + parse)

---

### Risk 2: Azure Storage Outage Prevents MFE Loading

**Mitigation:**

- Azure Storage carries its own published SLA (99.9%+ for LRS, higher for GRS/ZRS); confirm the storage account's redundancy tier (per ADR-0009) is adequate before production rollout
- Keep cached manifest in localStorage for offline/degraded operation
- Monitor `tssmfestorage` availability via Azure Monitor and Azure Service Health alerts
- Treat a CDN/Front Door fronting layer as a future enhancement (ADR-0009 debt item A7), not a blocker for this change

**Trade-off:** Without a fronting CDN, there is no independent multi-region edge cache; acceptable for current MVP scale, revisit if global latency becomes an issue

---

### Risk 3: Forgetting to Bump package.json Version

**Mitigation:**

- Add PR check that fails if version unchanged in changed MFE
- Conventional commits integration (auto-bump via semantic-release)
- Document version bump requirement in CONTRIBUTING.md
- Consider automated version bumping tool

**Trade-off:** Extra friction in PR workflow if automation not added

---

### Risk 4: Manifest Update Race Condition

**Scenario:** Two MFEs deploy simultaneously, last write wins, one MFE version lost in manifest

**Mitigation:**

- Queue manifest updates (one at a time) via the single `update-manifest` job gated on all matrix deploys succeeding
- Use Azure Blob conditional headers (`If-Match`/`If-None-Match` on the blob's ETag) for the manifest upload to avoid a lost-update race
- Implement manifest merge strategy (combine both changes) if conditional-write conflicts are detected
- Monitor for manifest overwrite conflicts in CI logs

**Trade-off:** Slows down parallel deployments slightly

---

### Risk 5: Rollback Requires Manual Manifest Edit

**Mitigation:**

- Create `pnpm rollback:mfe --name=mfe-widget --version=1.2.2` script
- Rely on the immutable, never-deleted per-version blob paths `azure-blob-deployment-pipeline` already guarantees — no separate manifest version history store needed, since any previously deployed version's blob still exists at its versioned path
- Provide a GitHub Action for one-click rollback
- Document rollback procedure in a runbook alongside `docs/runbooks/azure-blob-provisioning.md`

**Trade-off:** Not instant (requires pipeline run, ~2-3 minutes)

---

### Risk 6: SRI Hash Mismatch Blocks MFE Loading

**Scenario:** Upload is interrupted or a deploy step uploads the wrong version's build output

**Mitigation:**

- Validate uploaded files by fetching and comparing hashes (reusing the same verification pattern as `azure-blob-deployment-pipeline`'s existing upload step)
- Fail deployment if validation fails
- Retry upload up to 3 times before failing
- Alert on SRI mismatches in production

**Trade-off:** Deployment takes slightly longer (validation step)

---

## Migration Plan

### Phase 1: Azure Infrastructure Verification (Week 1)

1. Confirm `azure-blob-deployment-pipeline`'s Azure Blob Storage account (`tssmfestorage`), containers (`mfes-dev`, `mfes-prod`), and CORS configuration are provisioned and merged
2. Confirm the `gha-mfe-dev`/`gha-mfe-prod` OIDC identities have sufficient RBAC to write a new `manifest.json` blob (same containers, no new role assignment expected)
3. No new CDN bucket, custom domain, or credentials are provisioned in this phase — this change reuses existing infrastructure entirely

**Validation:** `az storage blob upload` a test `manifest.json` to `mfes-dev` using the existing OIDC identity locally (via `az login --federated-token` or a scratch service principal) and confirm HTTPS + CORS headers work

---

### Phase 2: Manifest Schema & Generation (Week 1)

1. Create `manifest.schema.json`
2. Implement `scripts/generate-manifest.ts`
3. Add SRI hash computation
4. Add unit tests for manifest generation
5. Generate sample production manifest locally

**Validation:** Run `pnpm generate:manifest` and validate output against schema

---

### Phase 3: Dynamic Loader Manifest Support (Week 2)

1. Add manifest parameter to `loader.init()`
2. Implement manifest-to-config transformation
3. Add localStorage caching logic
4. Add unit tests for manifest parsing
5. Test with mock manifest in development

**Validation:** Shell loads MFEs from test manifest URL

---

### Phase 4: Extend Existing GitHub Actions Pipeline (Week 2-3)

1. Add an `update-manifest` job to the existing `.github/workflows/deploy-mfes.yml` (from `azure-blob-deployment-pipeline`) — do not create a new workflow file
2. Reuse the workflow's existing Turborepo/git-diff change detection (migrating it to Turborepo filters is tracked separately in that change's task group 7)
3. Implement manifest upload via `az storage blob upload` (reusing the existing OIDC identities), not a new upload script or provider abstraction
4. Gate the manifest update on all matrix MFE deploys succeeding
5. Test the extended workflow on a scratch branch/tag before merging

**Validation:** Push to a scratch branch triggers the extended workflow; `mfes-dev/manifest.json` updates correctly

---

### Phase 5: Shell Bootstrap Update (Week 3)

1. Update `apps/shells/website/src/config/remotes.ts` to fetch manifest
2. Add environment-based URL selection (dev vs prod, pointing at `tssmfestorage.blob.core.windows.net/mfes-<env>/manifest.json`)
3. Add error handling and retry logic
4. Test locally with a production manifest fetched from `mfes-prod`
5. Deploy shell to the `dev-shell` container behind a feature flag

**Validation:** Shell in the `dev-shell` container loads MFEs from the Azure Blob Storage manifest

---

### Phase 6: Production Rollout (Week 4)

1. Merge the extended `deploy-mfes.yml` to main
2. Deploy first MFE (mfe-widget) and confirm `mfes-prod/manifest.json` updates correctly
3. Verify manifest updates correctly and matches the deployed SRI hash
4. Deploy shell to production (`$web` container) with manifest fetching enabled
5. Monitor for errors, roll back via manifest edit if needed

**Validation:** Production users see MFEs loaded from `tssmfestorage.blob.core.windows.net`

---

### Phase 7: Cleanup & Documentation (Week 4)

1. Document the manifest system in README.md, cross-linking `azure-blob-deployment-pipeline`'s existing docs rather than duplicating them
2. Create runbook for rollbacks alongside `docs/runbooks/azure-blob-provisioning.md`
3. Add monitoring dashboards for manifest fetch success rate (Azure Monitor)
4. Remove the `remotes.config.prod.json` static fallback only after manifest-based loading is stable
5. Team training on the new manifest-based deployment workflow

---

## Rollback Strategy

### Scenario 1: Bad MFE Version Deployed

**Steps:**

1. Identify last known good version from git tags
2. Update manifest to point to previous version
3. Deploy manifest (users see old version immediately)
4. Fix MFE, bump version, redeploy

**Downtime:** ~30-60 seconds (manifest cache max-age of 60s)

---

### Scenario 2: Manifest Corruption

**Steps:**

1. Regenerate the manifest from the current state of the `mfes-prod` container (each MFE's immutable versioned blob is still present) via `scripts/generate-manifest.ts`
2. Re-upload the regenerated manifest
3. Verify shell loads correct MFE versions
4. Investigate root cause

**Downtime:** ~2-5 minutes

---

### Scenario 3: Azure Storage Outage

**Steps:**

1. Confirm Azure Service Health status for the storage account's region
2. If prolonged: users fall back to the cached manifest in localStorage (up to 24h TTL)
3. If brief: wait for resolution, users use cached manifest

**Downtime:** Depends on Azure Storage SLA for the account's redundancy tier (typically well under the manifest's 24h client-side cache TTL)

---

## Open Questions

1. ~~**Which CDN provider?**~~ **Resolved:** Azure Blob Storage (`tssmfestorage`), already provisioned by `azure-blob-deployment-pipeline`. No separate CDN/edge layer in this MVP; Azure Front Door/CDN fronting is a tracked future enhancement (ADR-0009 debt item A7).

2. **Automatic version bumping?** (semantic-release integration)
   - **Decision needed by:** Phase 6
   - **Impact:** Developer workflow friction vs automation complexity

3. **Manifest versioning strategy?** (Single manifest vs per-environment)
   - **Decision needed by:** Phase 2
   - **Impact:** Multiple manifests increase complexity but enable staging isolation; likely one `manifest.json` per container (`mfes-dev`, `mfes-prod`), mirroring the existing `remotes.config.<env>.json` split

4. **MFE health checks?** (Ping endpoint before updating manifest)
   - **Decision needed by:** Phase 4
   - **Impact:** Slower deployments but safer rollouts

5. **Gradual rollout support?** (Multiple manifest versions for A/B testing)
   - **Decision needed by:** Post-launch (future enhancement)
   - **Impact:** Significant complexity, deferred to Phase 2 roadmap
