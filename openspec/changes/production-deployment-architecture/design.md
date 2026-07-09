## Context

The current monorepo architecture supports local development with auto-discovery and dynamic loading, but lacks production deployment capabilities. All micro-frontends live in a single GitHub repository managed by Turborepo, enabling efficient incremental builds. However, there's no mechanism to:

- Version MFEs independently
- Deploy only changed MFEs
- Serve MFEs from CDN with immutable URLs
- Allow shell to discover available MFE versions at runtime

The shell currently uses compile-time configuration (`remotes.config.json`) which couples deployment timing between shell and MFEs, defeating the purpose of micro-frontends.

**Current State:**

- Turborepo monorepo with `apps/mfe-*` pattern
- Dynamic loader fetches static config at runtime
- Config generation script discovers MFEs and generates localhost URLs
- No versioning, no CDN, no independent deployment

**Constraints:**

- Must maintain monorepo structure (no splitting into separate repos)
- Cannot introduce coordination requirements between teams
- Shell must remain backward-compatible with development workflow
- CDN must support CORS for cross-origin script loading
- Build artifacts must be immutable (versioned URLs)

**Stakeholders:**

- Frontend teams shipping MFE features
- Platform team maintaining shell and infrastructure
- DevOps managing CI/CD and CDN
- End users requiring zero-downtime deployments

---

## Goals / Non-Goals

**Goals:**

- Enable independent MFE deployment without redeploying shell
- Implement semantic versioning for each MFE
- Create GitHub Actions pipeline detecting changed MFEs via Turborepo
- Deploy MFE bundles to CDN with versioned, immutable URLs
- Generate production manifest mapping MFE names to CDN URLs and versions
- Update shell to fetch manifest at runtime and resolve MFE URLs dynamically
- Support instant rollbacks by updating manifest without rebuilding
- Preserve development workflow (localhost, no manifest required)

**Non-Goals:**

- Splitting monorepo into separate repositories
- Real-time manifest updates (polling/websocket)
- A/B testing or gradual rollouts (future enhancement)
- Custom CDN implementation (use existing providers)
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
      "url": "https://cdn.example.com/mfe-widget/1.2.3/remoteEntry.js",
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
# In GitHub Actions
git fetch origin main
turbo run build --filter='[origin/main...HEAD]'
# Only rebuilds changed MFEs and their dependents
```

**Alternatives Considered:**

- **Git diff + manual parsing:** Error-prone, doesn't handle shared deps
- **Lerna changed:** Another tool to maintain, Turborepo already present
- **Always deploy all MFEs:** Wasteful, defeats purpose of independent deployment

---

### Decision 4: CDN Path Structure

**Choice:** Versioned paths with immutable content: `/<mfe-name>/<version>/remoteEntry.js`

**Rationale:**

- Immutable URLs enable aggressive CDN caching (1 year max-age)
- Version in path (not query param) works better with CDN edge caching
- Rollback = change manifest, no CDN invalidation needed
- Follows best practices (e.g., Webpack's chunkhash pattern)

**Example:**

```
https://cdn.example.com/mfe-widget/1.2.3/remoteEntry.js
https://cdn.example.com/mfe-widget/1.2.3/assets/chunk-abc123.js
```

**Alternatives Considered:**

- **Latest alias:** Requires CDN purging, cache invalidation complexity
- **Query param version:** CDN edge caching less effective
- **Git hash in path:** Less human-readable, harder to track releases

**Cache headers:**

- Versioned assets: `Cache-Control: public, max-age=31536000, immutable`
- Manifest: `Cache-Control: public, max-age=60` (1 minute, allows updates)

---

### Decision 5: Subresource Integrity (SRI) Hashes

**Choice:** Compute SHA-384 hashes of remoteEntry.js and include in manifest

**Rationale:**

- Security: Prevents CDN compromise or MITM tampering
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

- **No integrity checks:** Security risk, especially for public CDN
- **SHA-256:** Less secure, SHA-384 is recommended standard
- **Runtime verification:** Too late, browser handles it natively

---

### Decision 6: GitHub Actions Workflow Structure

**Choice:** Single workflow file with matrix strategy for parallel MFE deployment

**Workflow:**

```yaml
name: Deploy MFEs

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      changed-mfes: ${{ steps.detect.outputs.mfes }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - run: pnpm install
      - id: detect
        run: |
          CHANGED=$(pnpm turbo run build --filter='[HEAD^1]' --dry-run=json | jq -r '.packages[]')
          echo "mfes=$CHANGED" >> $GITHUB_OUTPUT

  deploy-mfes:
    needs: detect-changes
    strategy:
      matrix:
        mfe: ${{ fromJson(needs.detect-changes.outputs.changed-mfes) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm turbo build --filter=${{ matrix.mfe }}
      - run: pnpm deploy:cdn --mfe=${{ matrix.mfe }}
      - run: git tag "${{ matrix.mfe }}-v$(cat apps/${{ matrix.mfe }}/package.json | jq -r '.version')"

  update-manifest:
    needs: deploy-mfes
    runs-on: ubuntu-latest
    steps:
      - run: pnpm generate:manifest --env=production
      - run: pnpm upload:manifest
```

**Rationale:**

- Matrix parallelizes MFE deployments (faster)
- Detect stage prevents unnecessary builds
- Separate manifest update ensures atomic consistency
- Workflow dispatch allows manual deployments

**Alternatives Considered:**

- **Separate workflow per MFE:** Too many workflows, hard to coordinate
- **Sequential deployment:** Slow for multiple MFEs
- **Monolithic script:** Less visible, harder to debug failures

---

### Decision 7: Manifest Fetching in Shell

**Choice:** Fetch manifest at application bootstrap, cache in localStorage with 24h TTL

**Implementation:**

```typescript
// apps/website/src/config/remotes.ts
export async function initializeRemotes() {
  const manifestUrl = import.meta.env.PROD
    ? "https://cdn.example.com/manifest.json"
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

### Risk 2: CDN Outage Prevents MFE Loading

**Mitigation:**

- Use CDN with 99.99% SLA (CloudFront, Cloudflare)
- Deploy to multiple CDN regions for redundancy
- Monitor CDN health and auto-failover if available
- Keep cached manifest for offline operation

**Trade-off:** Increased infrastructure cost for multi-region CDN

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

- Queue manifest updates (one at a time)
- Use atomic S3 upload with ETag conditional writes
- Implement manifest merge strategy (combine both changes)
- Monitor for manifest overwrites in CI logs

**Trade-off:** Slows down parallel deployments slightly

---

### Risk 5: Rollback Requires Manual Manifest Edit

**Mitigation:**

- Create `pnpm rollback:mfe --name=mfe-widget --version=1.2.2` script
- Store previous manifest versions in S3 with timestamps
- Provide GitHub Action for one-click rollback
- Document rollback procedure in runbook

**Trade-off:** Not instant (requires pipeline run, ~2-3 minutes)

---

### Risk 6: SRI Hash Mismatch Blocks MFE Loading

**Scenario:** CDN corrupts file or deploy uploads wrong version

**Mitigation:**

- Validate uploaded files by fetching and comparing hashes
- Fail deployment if validation fails
- Retry upload up to 3 times before failing
- Alert on SRI mismatches in production

**Trade-off:** Deployment takes slightly longer (validation step)

---

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1)

1. Provision CDN bucket (S3 + CloudFront or Cloudflare R2)
2. Configure CORS headers on CDN
3. Create GitHub Actions secrets for CDN credentials
4. Test manual upload/download from CDN

**Validation:** Upload test file, verify HTTPS + CORS headers work

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

### Phase 4: GitHub Actions CI/CD Pipeline (Week 2-3)

1. Create `.github/workflows/deploy-mfes.yml`
2. Implement Turborepo change detection step
3. Implement CDN upload script (`scripts/deploy-to-cdn.ts`)
4. Add manifest update step
5. Test pipeline on staging branch first

**Validation:** Push to staging triggers deployment, manifest updates

---

### Phase 5: Shell Bootstrap Update (Week 3)

1. Update `apps/website/src/config/remotes.ts` to fetch manifest
2. Add environment-based URL selection (dev vs prod)
3. Add error handling and retry logic
4. Test locally with production manifest
5. Deploy shell to staging

**Validation:** Staging shell loads MFEs from CDN manifest

---

### Phase 6: Production Rollout (Week 4)

1. Deploy pipeline to main branch
2. Deploy first MFE (mfe-widget) to production CDN
3. Verify manifest updates correctly
4. Deploy shell to production
5. Monitor for errors, rollback if needed

**Validation:** Production users see MFEs loaded from CDN

---

### Phase 7: Cleanup & Documentation (Week 4)

1. Document deployment process in README.md
2. Create runbook for rollbacks
3. Add monitoring dashboards for manifest fetch success rate
4. Remove old static config fallbacks (if any)
5. Team training on new deployment workflow

---

## Rollback Strategy

### Scenario 1: Bad MFE Version Deployed

**Steps:**

1. Identify last known good version from git tags
2. Update manifest to point to previous version
3. Deploy manifest (users see old version immediately)
4. Fix MFE, bump version, redeploy

**Downtime:** ~30-60 seconds (manifest CDN cache TTL)

---

### Scenario 2: Manifest Corruption

**Steps:**

1. Fetch previous manifest version from S3 bucket history
2. Re-upload previous manifest
3. Verify shell loads correct MFE versions
4. Investigate root cause

**Downtime:** ~2-5 minutes

---

### Scenario 3: CDN Outage

**Steps:**

1. Confirm CDN provider status page
2. If prolonged: switch CDN provider (update manifest URL environment variable)
3. If brief: wait for resolution, users use cached manifest

**Downtime:** Depends on CDN SLA (typically <10 minutes)

---

## Open Questions

1. **Which CDN provider?** (AWS CloudFront, Cloudflare, Netlify)
   - **Decision needed by:** Phase 1
   - **Impact:** Different upload scripts, pricing models

2. **Automatic version bumping?** (semantic-release integration)
   - **Decision needed by:** Phase 6
   - **Impact:** Developer workflow friction vs automation complexity

3. **Manifest versioning strategy?** (Single manifest vs per-environment)
   - **Decision needed by:** Phase 2
   - **Impact:** Multiple manifests increase complexity but enable staging isolation

4. **MFE health checks?** (Ping endpoint before updating manifest)
   - **Decision needed by:** Phase 4
   - **Impact:** Slower deployments but safer rollouts

5. **Gradual rollout support?** (Multiple manifest versions for A/B testing)
   - **Decision needed by:** Post-launch (future enhancement)
   - **Impact:** Significant complexity, deferred to Phase 2 roadmap
