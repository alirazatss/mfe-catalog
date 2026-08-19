# Release Process Guide

This guide covers the release channel workflow for shells and MFEs in the MF Mono repository.

## Overview

Release channels enable stable, versioned deployments isolated from active development:

- **`main` branch** → `dev/` pointer (floating, latest development)
- **`release-X.Y` branch** → `release-X.Y/` channel (stable, receives backported fixes only)

Each release channel has its own blob storage prefix, import map URLs, and preview environments.

## Release Branch Lifecycle

### 1. Cutting a Release Branch

**When**: Ready to stabilize a feature set for release (e.g., preparing v4.10.0).

**Procedure**:

```bash
# 1. Ensure main is green
vp check && vp test

# 2. Create release branch from main
git checkout main
git pull origin main
git checkout -b release-4.10

# 3. Bump version in all affected packages to X.Y.0
# For shells:
cd apps/shells/website
npm version 4.10.0 --no-git-tag-version

# For MFEs (if needed):
cd apps/mfes/mfe-widget
npm version 4.10.0 --no-git-tag-version

# 4. Commit version bumps
git add -A
git commit -m "chore(release): bump versions to 4.10.0"

# 5. Push release branch
git push -u origin release-4.10
```

**What happens next**:

- CI deploys shells and MFEs to `release-4.10/` blob paths
- Unchanged MFEs remain on `dev/` until backported
- Preview PRs targeting `release-4.10` use channel-aware baselines

### 2. Version Bump Discipline

**Rule**: Package versions MUST match the release branch major.minor.

**Example**:

- Branch `release-4.10` → `package.json` version `4.10.x`
- Branch `release-4.11` → `package.json` version `4.11.x`

**Enforcement**: Automated validation in `deploy-shell.yml` and `deploy-mfes-turbo.yml` fails builds if mismatch detected.

**Patch increments**: Increment patch version (`4.10.0` → `4.10.1`) when cherry-picking fixes:

```bash
# After successful backport
cd apps/shells/website
npm version patch --no-git-tag-version
git add package.json
git commit --amend --no-edit
git push --force-with-lease
```

### 3. Fix-on-Main + Backport Rule

**Policy**: All fixes originate on `main`, then backport to release branches.

**Never commit directly to release branches** (except version bumps and emergency hotfixes with explicit approval).

**Workflow**:

1. **Fix on main**:

   ```bash
   git checkout main
   # Make fix, test, commit
   git push origin main
   # Open PR, get reviewed, merge
   ```

2. **Label for backport**:
   - Add label `backport release-4.10` to the merged PR
   - Automation creates backport PR (see Backport Automation below)

3. **Review and merge backport PR**:
   - Verify CI passes on release branch
   - Merge backport PR
   - CI redeploys to `release-4.10/` channel

### 4. Backport Automation

**Trigger**: Merged PR on `main` with label `backport release-X.Y`

**Automation** (`.github/workflows/backport.yml`):

1. Cherry-picks merge commit to `release-X.Y` branch
2. Creates PR from `backport-pr-<N>-to-release-X.Y` → `release-X.Y`
3. On conflict, comments on source PR with manual instructions (no PR created)

**Multiple backports**: Add multiple labels (`backport release-4.10`, `backport release-4.11`) to backport to multiple branches.

**Manual backport** (on conflict):

```bash
git fetch origin
git checkout -b backport-pr-123-to-release-4.10 origin/release-4.10
git cherry-pick <merge-commit-sha>
# Resolve conflicts
git add .
git cherry-pick --continue
git push -u origin backport-pr-123-to-release-4.10
gh pr create --base release-4.10 --head backport-pr-123-to-release-4.10
```

### 5. Shell Redeploy After MFE Backport

**Scenario**: MFE fix backported to `release-4.10`, but shell hasn't been rebuilt.

**Problem**: Shell's bundled import map still points to old MFE build.

**Solution**: Trigger shell redeploy on release branch:

```bash
# Option 1: Empty commit to trigger CI
git checkout release-4.10
git commit --allow-empty -m "chore: redeploy shell for updated MFE"
git push origin release-4.10

# Option 2: Bump shell patch version
cd apps/shells/website
npm version patch --no-git-tag-version
git add package.json
git commit -m "chore: bump for MFE update"
git push origin release-4.10
```

**Recommendation**: Automate this via a workflow that detects MFE changes and triggers shell redeployment.

## Branch Protection Recommendations

**For `release-*` branches**:

- ✅ Require pull request reviews (1 approver minimum)
- ✅ Require status checks to pass (CI, tests)
- ✅ Require linear history (no merge commits, rebase or squash only)
- ✅ Restrict who can push (only automation + release managers)
- ✅ Require backport labels on direct commits (policy enforcement)

**GitHub Settings**:

```bash
# Set up branch protection for release-* pattern
# Navigate to: Settings → Branches → Add branch protection rule
# Branch name pattern: release-*
```

## Deployment Paths Reference

### Shells

| Branch                      | Blob Path                                    | Cache-Control | Purpose                           |
| --------------------------- | -------------------------------------------- | ------------- | --------------------------------- |
| `main`                      | `dev-shell/<shell>/`                         | no-cache      | Development, continuously updated |
| `main`                      | `dev-shell/<shell>/sha-<short>`              | immutable     | Immutable dev artifact            |
| `release-4.10`              | `dev-shell/<shell>/release-4.10/`            | no-cache      | Stable release channel            |
| `release-4.10`              | `dev-shell/<shell>/release-4.10/sha-<short>` | immutable     | Immutable channel artifact        |
| PR targeting `main`         | `dev-shell/<shell>/pr-<n>/`                  | no-cache      | PR preview (dev baseline)         |
| PR targeting `release-4.10` | `dev-shell/<shell>/pr-<n>/`                  | no-cache      | PR preview (channel baseline)     |

### MFEs

| Branch                      | Blob Path                                 | Cache-Control | Purpose                           |
| --------------------------- | ----------------------------------------- | ------------- | --------------------------------- |
| `main`                      | `mfes-dev/<mfe>/dev/`                     | no-cache      | Development, continuously updated |
| `main`                      | `mfes-dev/<mfe>/sha-<short>`              | immutable     | Immutable dev artifact            |
| `release-4.10`              | `mfes-dev/<mfe>/release-4.10/`            | no-cache      | Stable release channel            |
| `release-4.10`              | `mfes-dev/<mfe>/release-4.10/sha-<short>` | immutable     | Immutable channel artifact        |
| PR targeting `main`         | `mfes-dev/<mfe>/pr-<n>/`                  | no-cache      | PR preview (dev baseline)         |
| PR targeting `release-4.10` | `mfes-dev/<mfe>/pr-<n>/`                  | no-cache      | PR preview (channel baseline)     |

## Lifecycle Management

**Automatic cleanup** (Azure lifecycle policies):

- **PR previews**: Deleted 14 days after last modification
- **SHA artifacts**: Deleted 30 days after last modification
- **Release channels**: Deleted 90 days after last modification

**Manual cleanup** (end-of-life release):

```bash
# Delete all blobs for a retired release channel
az storage blob delete-batch \
  --account-name tssmfestorage \
  --source mfes-dev \
  --pattern "*/release-4.9/*" \
  --auth-mode login

az storage blob delete-batch \
  --account-name tssmfestorage \
  --source dev-shell \
  --pattern "*/release-4.9/*" \
  --auth-mode login
```

## Import Map Generation with Channels

**Development** (local, no channel):

```bash
tsx scripts/generate-config.ts --shell website --environment development
# Output: localhost URLs
```

**Production with channel** (release-4.10):

```bash
tsx scripts/generate-config.ts \
  --shell website \
  --environment production \
  --base-url https://tssmfestorage.blob.core.windows.net/mfes-dev \
  --channel release-4.10
# Output: MFEs with release-4.10 build → release-4.10/ URLs
#         MFEs without release-4.10 build → dev/ URLs (fallback)
```

## Troubleshooting

### Version Mismatch Error on Deploy

**Symptom**: CI fails with "Version mismatch! Tag version (4.10.1) does not match package.json version (4.10.0)"

**Cause**: Forgot to bump package.json after cherry-pick.

**Fix**:

```bash
git checkout release-4.10
cd apps/shells/website
npm version 4.10.1 --no-git-tag-version
git add package.json
git commit -m "chore: bump version to 4.10.1"
git push origin release-4.10
```

### MFE Not Found in Channel Config

**Symptom**: Shell loads but MFE is missing; console error "Failed to load remoteEntry.js"

**Cause**: MFE was never backported to this release branch; config generator fell back to dev, but dev has breaking changes.

**Fix**: Backport the MFE to the release branch, or pin the shell to a compatible MFE SHA.

### Backport Workflow Didn't Create PR

**Symptom**: Labeled PR, but no backport PR appeared.

**Possible causes**:

1. PR wasn't merged (workflow only runs for merged PRs)
2. Label format wrong (must be exactly `backport release-X.Y`)
3. Cherry-pick conflict → check source PR for conflict comment

**Manual backport**: See "Manual backport (on conflict)" above.

## SST Build Governance

### Terminology

The system uses precise terminology to distinguish between mutable and immutable release artifacts:

- **SST Build**: An immutable system test candidate promoted for QA sign-off. Once promoted, the artifact set is frozen and cannot be modified.
- **SST Integration**: The mutable release-channel stream that continues to receive backported fixes and evolves independently from any active SST Build.

Release and QA records MUST use these qualified terms. Plain "SST" without a qualifier is ambiguous and prohibited in handoff documentation.

### One Active SST Build for Sign-Off

Multiple release branches may maintain independent SST Build queues, but **exactly one SST Build is globally active for sign-off** at any point in time.

**Example**:

- `release-4.10` has promoted SST Build `4.10-12-a1b2c3d-9f84ab21`
- `release-4.11` has promoted SST Build `4.11-03-e5f6789-3a21cd98`
- Only one of these is marked as the **active global sign-off target** for QA validation
- The other remains non-active until explicitly promoted to active status

This ensures QA resources focus on a single reproducible candidate while allowing parallel release preparation.

### Promotion Authority and Access Control

**Only release managers or designated leads** may promote, replace, or retire an active SST Build.

Unauthorized promotion attempts are **denied and audited**. The system records all denied actions in audit logs for compliance review.

### Active SST Build Immutability

Once an SST Build is active, it remains **frozen and immutable**. Ongoing backports and merges to the release branch update **SST Integration** but do NOT mutate the active SST Build.

**Example**:

- Active SST Build: `4.10-12-a1b2c3d-9f84ab21`
- New commits merge into `release-4.10`
- Deployment updates **SST Integration** artifacts
- SST Build `4.10-12-a1b2c3d-9f84ab21` **remains unchanged**

### Blocker Remediation: N+1 Build Policy

If validation finds a blocker, the fix flow produces a **new SST Build (N+1)** and promotes it. The previously active SST Build remains immutable and is retired from active sign-off without modification.

**Workflow**:

1. Active SST Build `N` fails validation with a blocker
2. Fix is merged to main and backported to the release branch
3. Release manager promotes a **new SST Build `N+1`**
4. SST Build `N` is retired (not patched in place)

This ensures every SST Build is reproducible and traceable.

### SST Build Identity and Evidence

Every promoted SST Build publishes a **canonical identifier** with the format:

```
<release-train>-<build-number>-<short-sha>-<manifest-hash>
```

**Example**: `4.10-12-a1b2c3d-9f84ab21`

Each SST Build retains an **evidence bundle** for at least **180 days**, containing:

- Manifest snapshot
- Resolved artifact URLs
- Approver record
- Test report

This evidence ensures reproducibility and supports compliance audits.

### Operational Checklist for SST Build Actions

**Promotion**:

- [ ] Verify release manager or designated lead authority
- [ ] Generate canonical ID with release-train, build-number, commit-sha, manifest-hash
- [ ] Capture manifest snapshot and resolved artifact URLs
- [ ] Record approver and timestamp
- [ ] Mark as active global sign-off target (retire previous active build)
- [ ] Persist evidence bundle with 180-day retention
- [ ] **Verification**: Query metadata store to confirm exactly one active SST Build globally
- [ ] **Verification**: Confirm evidence bundle accessible via canonical ID
- [ ] **Verification**: Audit log entry created with approver, timestamp, and canonical ID

**Replacement** (blocker remediation):

- [ ] Verify blocker is documented and fix is merged/backported
- [ ] Increment build number (N+1)
- [ ] Promote new SST Build following promotion checklist
- [ ] Retire previous active SST Build (do not modify in place)
- [ ] **Verification**: Retired SST Build N status = 'retired', evidence bundle preserved
- [ ] **Verification**: New SST Build N+1 status = 'active', canonical ID = `<release-train>-<N+1>-<new-sha>-<new-hash>`
- [ ] **Verification**: Both SST Build N and N+1 exist in metadata store
- [ ] **Verification**: Audit log includes retirement reason for SST Build N

**Retirement**:

- [ ] Mark SST Build as retired in tracking system
- [ ] Preserve evidence bundle (180-day retention still applies)
- [ ] Update active sign-off target to new SST Build if replacement exists
- [ ] **Verification**: Evidence bundle remains accessible for 180 days post-retirement
- [ ] **Verification**: Lifecycle policy enforces minimum 180-day retention for sst-builds/\* prefix
- [ ] **Verification**: Retired SST Build cannot be reactivated or modified

### Verification Commands (Stub)

**Query active SST Build** (TODO: Implement with metadata store):

```bash
# TODO: Replace with actual metadata store query
# az storage table query \
#   --account-name tssmfestorage \
#   --table-name SSTBuilds \
#   --filter "PartitionKey eq 'release-4.10' and status eq 'active'"
echo "⚠️  STUB: Query active SST Build for release-4.10"
```

**Retrieve evidence bundle** (TODO: Implement with Azure Blob Storage):

```bash
# TODO: Replace with actual evidence bundle retrieval
# CANONICAL_ID="4.10-12-a1b2c3d-9f84ab21"
# az storage blob download \
#   --account-name tssmfestorage \
#   --container-name sst-evidence \
#   --name "sst-builds/${CANONICAL_ID}/evidence.json" \
#   --file "evidence-${CANONICAL_ID}.json"
echo "⚠️  STUB: Retrieve evidence bundle for canonical ID"
```

**Verify 180-day retention policy** (TODO: Implement with lifecycle policy check):

```bash
# TODO: Replace with actual lifecycle policy verification
# az storage account management-policy show \
#   --account-name tssmfestorage \
#   --query "policy.rules[?definition.filters.prefixMatch==['sst-builds/']]"
echo "⚠️  STUB: Verify 180-day retention policy for sst-builds/ prefix"
```

See: `scripts/azure/SST_BUILD_IMPLEMENTATION.md` for full production implementation guide.

## References

- **Spec**: `openspec/changes/release-channel-deployments/`, `openspec/changes/sst-build-governance/`
- **Workflows**: `.github/workflows/deploy-shell.yml`, `.github/workflows/deploy-mfes-turbo.yml`, `.github/workflows/backport.yml`
- **Config generation**: `scripts/generate-config.ts`, `packages/monorepo-tools/src/config-generator.ts`
- **Lifecycle policy**: `scripts/azure/lifecycle-policy.json`
- **Provisioning runbook**: `docs/runbooks/azure-blob-provisioning.md`
