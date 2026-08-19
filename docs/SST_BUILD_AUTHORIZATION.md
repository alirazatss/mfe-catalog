# SST Build Authorization Model - GitHub Native Access Control

## Summary

SST Build promotion access control is implemented using **GitHub's native features** - no custom role management or authorization code needed.

---

## How It Works

### ✅ SSTG-3 Requirement

> "SST Build promotion SHALL be access controlled"

**Implementation:** GitHub repository permissions + CODEOWNERS + branch protection rules

---

## Authorization Components

### 1. Repository Collaborators (Push Access)

**Controls:** Who can push directly to release branches

**Configuration:** GitHub Repository Settings → Collaborators and teams

**Example:**

```
Repository: myorg/mfe-catalog
Collaborators with push access:
  - @release-team (team - write access)
  - @senior-engineer (individual - write access)
```

**Effect:** Only these users can merge to `release-*` branches

---

### 2. CODEOWNERS File

**Controls:** Who must approve PRs to release branches

**Configuration:** `.github/CODEOWNERS` file

**Example:**

```
# Release branches require approval from release team
/apps/shells/     @myorg/release-team
/apps/mfes/       @myorg/release-team
*.config.prod.json  @myorg/release-team

# Development can be approved by any team member
/apps/mfes/mfe-widget/  @myorg/widget-team
```

**Effect:**

- PRs touching release artifacts require `@myorg/release-team` approval
- PRs cannot merge without CODEOWNERS approval (enforced by branch protection)

---

### 3. Branch Protection Rules

**Controls:** Enforcement of access control policies

**Configuration:** GitHub Repository Settings → Branches → Branch protection rules

**Pattern:** `release-*`

**Required Settings:**

- ✅ **Require pull request reviews**: 1+ approvers
- ✅ **Require review from Code Owners**: Enabled
- ✅ **Require status checks to pass**: CI, tests, vp check
- ✅ **Require linear history**: Prevents merge commits
- ✅ **Restrict who can push**: Limit to release team
- ✅ **Do not allow bypassing the above settings**: Admins included

**Effect:**

- Direct pushes to `release-*` denied unless authorized
- PRs require CODEOWNERS approval before merge
- Failed status checks block merge

---

## Who Can Promote SST Builds?

### Scenario A: Direct Push (Authorized Collaborators)

**Actor:** User with push access to release branches

**Flow:**

```
1. User commits to release-4.10 locally
2. User pushes: git push origin release-4.10
3. GitHub checks: Does user have push access?
   ✅ YES → Push allowed, workflow triggered
   ❌ NO → Push denied by GitHub
4. If allowed: SST Build promotion workflow runs
5. Evidence bundle records actor: ${{ github.actor }}
```

**Access Control:** GitHub repository collaborators list

---

### Scenario B: Pull Request (CODEOWNERS Approval)

**Actor:** Any repository contributor (even without push access)

**Flow:**

```
1. Contributor creates PR: main → release-4.10
2. PR modifies files in /apps/shells/ (CODEOWNERS: @release-team)
3. GitHub requires: Approval from @release-team
4. @release-team member reviews and approves PR
5. Contributor merges PR (or release-team member merges)
6. Workflow triggered on merge to release-4.10
7. Evidence bundle records approver from PR metadata
```

**Access Control:** CODEOWNERS file + branch protection rules

---

## Comparison: Custom Roles vs GitHub Native

| Aspect                  | Custom Role-Based (Removed)            | GitHub Native (Current)                     |
| ----------------------- | -------------------------------------- | ------------------------------------------- |
| **Authorization Check** | Workflow step queries Teams API        | GitHub enforces before workflow runs        |
| **Infrastructure**      | Requires GitHub Teams API token        | No additional infrastructure                |
| **Configuration**       | Maintain role mappings                 | CODEOWNERS file + branch protection         |
| **Audit Trail**         | Custom audit logging needed            | GitHub audit logs (built-in)                |
| **Complexity**          | High (API integration, error handling) | Low (standard GitHub features)              |
| **Failure Mode**        | API downtime blocks promotions         | GitHub native (highly available)            |
| **Maintenance**         | Update role membership via API         | Update CODEOWNERS file (version controlled) |

---

## Audit Trail

### What GitHub Tracks Automatically

All events are logged in **GitHub audit logs** (Settings → Audit log):

1. **Push Events**:
   - Actor: `user@example.com`
   - Action: `git.push`
   - Target: `release-4.10`
   - Timestamp: `2026-08-19T18:00:00Z`

2. **PR Approval Events**:
   - Actor: `release-manager@example.com`
   - Action: `pull_request_review.submitted`
   - PR: `#123`
   - Approval: `approved`
   - Timestamp: `2026-08-19T17:55:00Z`

3. **PR Merge Events**:
   - Actor: `contributor@example.com`
   - Action: `pull_request.closed` (merged: true)
   - PR: `#123`
   - Target: `release-4.10`
   - Timestamp: `2026-08-19T18:00:00Z`

4. **Denied Push Attempts**:
   - Actor: `unauthorized@example.com`
   - Action: `git.push` (denied)
   - Reason: `protected branch policy`
   - Timestamp: `2026-08-19T18:05:00Z`

### Evidence Bundle Records

In addition to GitHub audit logs, SST Build evidence bundles record:

```json
{
  "canonicalId": "4.10-12-a1b2c3d-9f84ab21",
  "promotedBy": "release-manager@example.com", // From ${{ github.actor }}
  "promotedAt": "2026-08-19T18:00:00Z",
  "commitSha": "a1b2c3d4e5f6...",
  "approvalSource": "github-codeowners" // or "github-push-access"
}
```

---

## Setup Instructions

### 1. Configure CODEOWNERS

Create `.github/CODEOWNERS`:

```
# SST Build promotion requires release team approval
/apps/shells/                    @myorg/release-team
/apps/mfes/                      @myorg/release-team
*.config.prod.json               @myorg/release-team
/scripts/azure/lifecycle-policy.json  @myorg/release-team

# Development changes can be approved by feature teams
/apps/mfes/mfe-widget/           @myorg/widget-team
/apps/mfes/mfe-landing-page/     @myorg/landing-page-team
```

### 2. Configure Branch Protection

**Pattern:** `release-*`

**Settings:**

```yaml
Require pull request reviews:
  ✅ Enabled
  Required approving reviewers: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from Code Owners

Require status checks to pass:
  ✅ Enabled
  Required checks:
    - vp check
    - vp test
    - deploy-shell (if applicable)

Require linear history: ✅ Enabled

Restrict who can push to matching branches:
  ✅ Enabled
  Allowed to push:
    - @myorg/release-team

Do not allow bypassing the above settings:
  ✅ Enabled (includes administrators)
```

### 3. Configure Repository Collaborators

**Settings → Collaborators and teams → Manage access**

**Teams:**

- `@myorg/release-team` - **Write** access
- `@myorg/developers` - **Read** access

**Effect:**

- Release team can push directly to release branches
- Developers must use PRs (CODEOWNERS approval required)

---

## Verification

### Test 1: Authorized Direct Push

```bash
# As release-team member
git checkout release-4.10
git commit --allow-empty -m "test: SST Build promotion"
git push origin release-4.10

# Expected: ✅ Push succeeds, workflow runs
```

### Test 2: Unauthorized Direct Push

```bash
# As developer (not in release-team)
git checkout release-4.10
git commit --allow-empty -m "test: unauthorized push"
git push origin release-4.10

# Expected: ❌ GitHub denies push
# Error: "required status checks" or "protected branch policy"
```

### Test 3: PR with CODEOWNERS Approval

```bash
# As any contributor
git checkout -b fix/widget-bug
# Make changes to apps/mfes/mfe-widget/
git commit -m "fix: widget bug"
git push origin fix/widget-bug
gh pr create --base release-4.10 --head fix/widget-bug

# PR requires @myorg/release-team approval
# Release team member approves PR
# Contributor merges PR

# Expected: ✅ Merge succeeds, workflow runs
```

### Test 4: PR without CODEOWNERS Approval

```bash
# PR created as above
# Attempt to merge without approval

# Expected: ❌ GitHub blocks merge
# Error: "Required review from Code Owners not met"
```

---

## Benefits

### ✅ Simplicity

- No custom authorization code
- No API token management
- No role mapping maintenance

### ✅ Security

- Leverages GitHub's proven access control
- Branch protection prevents bypass
- Multiple layers (push access + CODEOWNERS + status checks)

### ✅ Auditability

- GitHub audit logs (built-in, 90-day retention)
- Evidence bundles (custom, 180-day retention)
- No custom audit infrastructure needed

### ✅ Maintainability

- CODEOWNERS file version-controlled (reviewable, traceable)
- Branch protection rules UI-configurable
- No external service dependencies

### ✅ Compliance

- SSTG-3 requirement satisfied
- Access control enforced before workflow runs
- All promotion attempts logged

---

## Migration from Custom Roles (If Applicable)

If previously using custom role-based authorization:

1. **Identify current "release managers"**
2. **Create GitHub team** `@myorg/release-team`
3. **Add release managers to team**
4. **Create CODEOWNERS file** (reference team)
5. **Configure branch protection** (require CODEOWNERS approval)
6. **Remove custom authorization code** (workflow steps, API calls)
7. **Update documentation** (operational checklist)

**No runtime changes** - access control still enforced, just via GitHub instead of custom code.

---

## FAQ

**Q: Can organization admins bypass branch protection?**

A: No, if "Do not allow bypassing the above settings" is enabled (includes administrators).

**Q: What if someone needs emergency access?**

A:

- Temporary: Add to `@myorg/release-team` via GitHub UI
- Emergency: Disable branch protection (requires admin, audited by GitHub)
- Best practice: Use CODEOWNERS approval via expedited PR review

**Q: How long are GitHub audit logs retained?**

A: 90 days for standard repositories. Evidence bundles provide 180-day retention for SST Build promotions.

**Q: Can CODEOWNERS be bypassed?**

A: No, if branch protection enforces "Require review from Code Owners" (enabled in setup).

**Q: What happens if CODEOWNERS file is deleted?**

A: Branch protection still enforces required reviews, but any reviewer can approve (not specific to owners). Prevention: Protect `.github/CODEOWNERS` via separate rule.

---

## Summary

**SSTG-3 Compliance:** ✅ Achieved via GitHub-native access control

**Implementation:** Zero custom code, standard GitHub features

**Authorization Model:**

1. Repository collaborators (who can push)
2. CODEOWNERS (who must approve PRs)
3. Branch protection (enforcement)

**Audit Trail:** GitHub audit logs + SST Build evidence bundles

**Maintenance:** Update CODEOWNERS file (version-controlled)

**Security:** Multi-layer protection, no bypass without audit trail
