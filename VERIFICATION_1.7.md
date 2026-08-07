# Task 1.7 Verification: Deploy workflow equivalence

## Verification Strategy

Since we cannot trigger actual GitHub Actions runs locally, we verify equivalence through:

1. Job structure comparison
2. Input/output mapping
3. Step-by-step logic comparison

## Jobs Comparison

### Original deploy-website.yml had:

1. `validate-version` - tag validation job
2. `deploy-dev` - dev environment deploy
3. `deploy-prod-config-only` - config-only prod redeploy
4. `deploy-prod-versioned` - versioned prod deploy

### New deploy-shell.yml (reusable) has:

1. `validate-version` - ✅ Same logic, parameterized by inputs
2. `deploy-dev` - ✅ Same logic, parameterized by inputs
3. `deploy-prod-config-only` - ✅ Same logic, parameterized by inputs
4. `deploy-prod-versioned` - ✅ Same logic, parameterized by inputs

### New deploy-website.yml (caller) has:

1. Single `deploy` job that calls the reusable workflow with:
   - shell-name: website
   - shell-path: apps/shells/website
   - package-name: website
   - tag-prefix: website-v

## Critical Logic Comparison

### Version Validation

**Original**:

```yaml
TAG_VERSION="${GITHUB_REF_NAME#website-v}"
PKG_VERSION=$(jq -r '.version' apps/shells/website/package.json)
```

**Reusable (parameterized)**:

```yaml
TAG_VERSION="${GITHUB_REF_NAME#${{ inputs.tag-prefix }}}"
PKG_VERSION=$(jq -r '.version' ${{ inputs.shell-path }}/package.json)
```

✅ **Equivalent** when inputs match

### Build Command

**Original**:

```yaml
pnpm --filter "website..." build
```

**Reusable (parameterized)**:

```yaml
pnpm --filter "${{ inputs.package-name }}..." build
```

✅ **Equivalent** when `package-name: website`

### Upload Paths

**Original**:

```yaml
--source apps/shells/website/dist
```

**Reusable (parameterized)**:

```yaml
--source ${{ inputs.shell-path }}/dist
```

✅ **Equivalent** when `shell-path: apps/shells/website`

### Concurrency Group

**Original**:

```yaml
group: deploy-website-dev
```

**Reusable (parameterized)**:

```yaml
group: deploy-${{ inputs.shell-name }}-dev
```

✅ **Equivalent** when `shell-name: website`

### Upload Destinations

Both workflows upload to:

- Dev floating: `dev-shell` (container root - NOTE: will change in Task Group 2)
- Dev SHA: `dev-shell/sha-<short>` (container root - NOTE: will change in Task Group 2)
- Prod versioned: `$web/v<version>/`
- Prod root: `$web/`

✅ **All destinations identical**

## Triggers Comparison

### Original triggers:

- Push to main with paths: `apps/shells/website/**`, packages, configs
- Tags: `website-v*`

### New caller triggers:

- Push to main with paths: `apps/shells/website/**`, packages, configs, workflows
- Tags: `website-v*`

✅ **Equivalent** (added workflow file triggers as bonus)

## Environment Variables & Secrets

Both workflows use:

- `AZURE_CLIENT_ID_DEV` / `AZURE_CLIENT_ID_PROD`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

The caller passes `secrets: inherit`, so all secrets are available.
✅ **Equivalent**

## Conclusion

The refactored workflow is **functionally equivalent** to the original for the website shell.
The only differences are:

1. Code is now parameterized (by design)
2. Workflow triggers include the workflow files themselves (improvement)
3. All hardcoded "website" references replaced with `${{ inputs.shell-name }}`

**Verification Status**: ✅ PASS (code review confirms equivalence)

**Note**: Actual runtime verification would require:

1. Pushing to a test branch
2. Triggering the workflow
3. Comparing uploaded blob paths and build-info.json content

This is deferred to CI verification when the PR is opened.
