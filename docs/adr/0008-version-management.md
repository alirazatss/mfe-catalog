# ADR-0008: Version Management & Framework Upgrades

## Status

Accepted (2026-07-14)

## Context

With Chrome MFE pattern and 10-20+ MFEs deployed independently, we face the hardest problem in MFE architecture: **How do we upgrade React (or any shared dependency) across all MFEs?**

**Real scenarios:**

- React 19 → React 20 (major upgrade)
- React Router 8 → React Router 9 (breaking changes)
- Security patch for shared library
- New MFE built with newer React than existing MFEs

**We cannot:**

- Force all 20 teams to upgrade simultaneously (impossible)
- Rebuild all MFEs for one patch (deployment nightmare)
- Have MFEs stuck on ancient versions forever (security risk)

## Decision

**Use "Progressive Version Migration" pattern** with three phases:

1. **Steady State**: All MFEs on same version (singleton mode)
2. **Migration Window**: Allow multiple versions (non-singleton mode)
3. **Cleanup**: Return to singleton once all MFEs migrated

Combined with:

- **PNPM catalog** for version coordination
- **Runtime version detection** for compatibility warnings
- **Compatibility matrix** documenting supported versions

## Alternatives Considered

### Alternative 1: Big Bang Migration

Coordinate all teams to upgrade React simultaneously.

**Rejected because:**

- Impossible with 10+ independent teams
- One slow team blocks everyone
- No gradual testing possible
- Rollback affects all MFEs
- Not scalable

### Alternative 2: Never Upgrade

Lock React version forever.

**Rejected because:**

- Security vulnerabilities pile up
- Missing React features
- Ecosystem moves on (libraries drop old React support)
- Technical debt spirals

### Alternative 3: Force Independence (No Sharing)

Every MFE bundles own React always.

**Rejected because:**

- 20 MFEs × 130KB React = 2.6MB extra
- Multiple React instances (state doesn't share)
- React Context breaks across MFEs
- Performance regression

### Alternative 4: Runtime Framework Detection

Load different React versions based on MFE metadata.

**Rejected because:**

- Extremely complex
- Race conditions
- Framework-specific
- Not standard pattern

## Solution: Progressive Version Migration

### Phase 1: Steady State (Same Version)

**All MFEs and shells use same React version:**

```yaml
# mf-catalog/pnpm-workspace.yaml
catalog:
  react: 19.1.0
  react-dom: 19.1.0
  react-router: 8.2.0
```

```typescript
// All MFEs use singleton mode
shared: {
  react: {
    singleton: true,               // Only one instance
    requiredVersion: '19.1.0',
    strictVersion: false,          // Warn on mismatch, don't error
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '19.1.0'
  },
}
```

**Result:**

- Shell loads React 19.1.0
- All MFEs share shell's React instance
- Zero duplication
- React Context works across MFEs
- Small bundle sizes

### Phase 2: Migration Window (Multiple Versions)

**When upgrading (e.g., React 19 → 20):**

```typescript
// Shell upgrades first, supports BOTH versions
shared: {
  react: {
    singleton: false,                    // Allow multiple versions
    requiredVersion: '^19 || ^20',      // Accept both
    strictVersion: false,
  },
  'react-dom': {
    singleton: false,
    requiredVersion: '^19 || ^20'
  },
}
```

**Migration timeline:**

```
Week 1: Shell upgraded to React 20 (supports both)
  ↓
  Shell can now load:
  - MFEs with React 19 ✅ (existing)
  - MFEs with React 20 ✅ (new)

Week 2-4: mfe-widget upgrades to React 20
  - Deploys independently
  - Users experience: identical

Week 5-8: mfe-dashboard upgrades to React 20
  ...

Week 9-12: mfe-analytics upgrades to React 20
  - Different teams, different pace
  - Coordination handled by version status page
```

**During migration:**

- Shell shows version compatibility warnings in dev tools
- Analytics tracks which MFEs use which React version
- Slack notifications when teams upgrade

### Phase 3: Cleanup (Return to Singleton)

**Once all MFEs migrated:**

```typescript
// Update catalog
catalog:
  react: 20.0.0
  react-dom: 20.0.0

// All MFEs re-enable singleton
shared: {
  react: {
    singleton: true,                // Enforce single instance
    requiredVersion: '20.0.0',      // Exact version
    strictVersion: true,            // Fail on mismatch
  },
}
```

**Result:** Back to steady state on new version.

## Version Coordination Mechanisms

### 1. PNPM Catalog (Source of Truth)

```yaml
# mf-catalog/pnpm-workspace.yaml
catalog:
  # Framework
  react: 19.1.0
  react-dom: 19.1.0
  react-router: 8.2.0

  # UI Libraries
  '@testing-library/react': 16.3.2

  # Build tools
  vite: 7.1.0
  '@module-federation/vite': 1.16.12

# All MFEs use catalog references
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "react-router": "catalog:"
  }
}
```

### 2. Version Manifest Package

**`@mf-mono/versions` npm package publishes current version requirements:**

```typescript
// @mf-mono/versions/src/index.ts
export const REQUIRED_VERSIONS = {
  react: "19.1.0",
  reactDom: "19.1.0",
  reactRouter: "8.2.0",
} as const;

export const SUPPORTED_VERSIONS = {
  react: ["19.0.0", "19.1.0"], // Migration window
  reactDom: ["19.0.0", "19.1.0"],
  reactRouter: ["8.0.0", "8.1.0", "8.2.0"],
} as const;

export function checkCompatibility(
  package: string,
  version: string,
): "exact" | "compatible" | "incompatible" {
  const required = REQUIRED_VERSIONS[package];
  const supported = SUPPORTED_VERSIONS[package];

  if (version === required) return "exact";
  if (supported.includes(version)) return "compatible";
  return "incompatible";
}
```

**Shells import this:**

```typescript
// customer-shell/package.json
{
  "dependencies": {
    "@mf-mono/versions": "^1.0.0",
    "react": "19.1.0",  // From @mf-mono/versions REQUIRED_VERSIONS
  }
}
```

### 3. Runtime Version Validation

**Shell checks versions when loading MFEs:**

```typescript
// packages/dynamic-loader/src/version-check.ts
import { checkCompatibility } from "@mf-mono/versions";

async function loadMFE(mfeConfig: MFEConfig) {
  const module = await loadRemoteModule(mfeConfig);

  // Check MFE's declared versions
  const mfeVersions = module.__VERSIONS__ || {};

  const issues = [];
  for (const [pkg, version] of Object.entries(mfeVersions)) {
    const status = checkCompatibility(pkg, version);

    if (status === "incompatible") {
      issues.push({ pkg, version, status: "incompatible" });
    } else if (status === "compatible") {
      console.warn(
        `[MFE ${mfeConfig.name}] ${pkg} version ${version} is compatible but not preferred. ` +
          `Recommended: ${REQUIRED_VERSIONS[pkg]}`,
      );
    }
  }

  if (issues.length > 0) {
    // Report to monitoring but don't block
    reportVersionMismatch(mfeConfig.name, issues);

    // Optionally: fail load in strict mode
    if (STRICT_VERSION_MODE) {
      throw new Error(`MFE ${mfeConfig.name} has incompatible versions`);
    }
  }
}
```

**MFE exports versions:**

```typescript
// mfe-widget/src/index.tsx
import { version as reactVersion } from "react";
import { version as reactDomVersion } from "react-dom";

export const __VERSIONS__ = {
  react: reactVersion,
  reactDom: reactDomVersion,
  reactRouter: "8.2.0",
};

export const { bootstrap, mount, unmount, update } = lifecycle;
```

### 4. Version Compatibility Matrix

**Published documentation:**

```markdown
# MFE Version Compatibility Matrix

## Current State (as of 2026-07-14)

| Component      | React  | React Router | Status                    |
| -------------- | ------ | ------------ | ------------------------- |
| customer-shell | 19.1.0 | 8.2.0        | ✅ Current                |
| admin-shell    | 19.1.0 | 8.2.0        | ✅ Current                |
| mfe-header     | 19.1.0 | 8.2.0        | ✅ Current                |
| mfe-widget     | 19.1.0 | 8.2.0        | ✅ Current                |
| mfe-dashboard  | 19.0.0 | 8.1.0        | 🟡 Old but compatible     |
| mfe-analytics  | 18.3.0 | 6.20.0       | 🔴 Migration needed by Q3 |

## Migration Windows

**Active Migration**: React 19 → 20 (Jan 2027 - Apr 2027)

Progress:

- [x] customer-shell
- [x] admin-shell
- [x] mfe-header
- [x] mfe-widget
- [ ] mfe-dashboard (target: Feb 2027)
- [ ] mfe-analytics (target: Mar 2027)
- [ ] mfe-settings (target: Apr 2027)
```

## Upgrade Playbook

### Minor/Patch Upgrades (Automated)

```
1. Renovate/Dependabot creates PR to bump version in catalog
2. CI runs tests across all MFEs
3. If green, merge → all MFEs auto-updated on next build
4. Deploy affected MFEs (Turborepo detects changes)
5. Done in 24 hours
```

### Major Upgrades (Manual Coordination)

**Week 0: Preparation**

```
1. Platform team creates upgrade plan
2. Test React 20 with critical MFE
3. Document breaking changes
4. Communicate to all teams
5. Set target migration date (3-6 months out)
```

**Week 1: Shell Upgrade**

```
1. Shells upgrade to React 20
2. Enable "multiple version" mode in Module Federation
3. Deploy shells (customer-shell, admin-shell)
4. Verify existing MFEs still work
5. Publish new @mf-mono/versions with dual support
```

**Week 2-24: MFE Migrations**

```
Each MFE team, on their own timeline:
1. Update catalog reference: react: catalog: (19.1.0 → 20.0.0)
2. Run tests
3. Fix breaking changes (React 20 breaking APIs)
4. Deploy MFE
5. Verify in production
6. Update version status page
```

**Week 25: Cleanup**

```
1. All MFEs on React 20 (verified via status page)
2. Update catalog to require React 20
3. Return to singleton mode in Module Federation
4. Deprecate React 19 support
5. Publish @mf-mono/versions with only React 20
```

## Vite + Module Federation Configuration Examples

### Steady State Config (99% of the time)

```typescript
// All MFEs use this
shared: {
  react: {
    singleton: true,
    requiredVersion: '19.1.0',
    strictVersion: false,
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '19.1.0'
  },
  'react-router': {
    singleton: true,
    requiredVersion: '8.2.0'
  },
  '@mf-mono/dynamic-loader': {
    singleton: true,
    requiredVersion: '^1'
  },
}
```

### Migration Window Config

```typescript
// During React 19 → 20 migration
shared: {
  react: {
    singleton: false,                  // Allow multiple versions
    requiredVersion: '^19 || ^20',
    strictVersion: false,
    eager: false,                      // Lazy load per MFE
  },
  'react-dom': {
    singleton: false,
    requiredVersion: '^19 || ^20'
  },
}
```

### Post-Migration Config

```typescript
// After all MFEs on React 20
shared: {
  react: {
    singleton: true,
    requiredVersion: '20.0.0',
    strictVersion: true,  // Enforce
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '20.0.0',
    strictVersion: true
  },
}
```

## Consequences

### Positive

- **Zero coordination burden**: Teams upgrade at their own pace
- **Safe migrations**: Multiple versions coexist during transition
- **Explicit versioning**: Clear source of truth (catalog + versions package)
- **Runtime validation**: Catches incompatibilities early
- **Industry-proven**: Same as Spotify, Netflix, Zalando pattern
- **Rollback friendly**: Individual MFE can rollback without affecting others

### Negative

- **Bundle size (temporary)**: Multiple React versions during migration = ~130KB extra per MFE
- **Complexity**: Multiple modes (singleton vs multi-version)
- **Longer migration**: 3-6 months vs 1 week big bang
- **Testing overhead**: Must test all version combinations
- **Documentation burden**: Compatibility matrix must be maintained

### Neutral

- Requires version tracking service/page
- CI needs to test with multiple versions
- Developers must understand version modes
- Platform team owns migration coordination

## Real-World Timeline Example

```
Jan 2027: React 20 announced
  ↓
Jan 15: Platform team starts evaluation
  ↓
Feb 1: Test with 1 MFE (mfe-widget)
  ↓
Feb 15: Fix issues, document breaking changes
  ↓
Mar 1: Shell upgrade PR (customer-shell)
  ↓
Mar 5: customer-shell deployed with dual React support
  ↓
Mar 5-Jun 30: MFEs migrate individually
  - Week 1: mfe-header (Design team, 1 day)
  - Week 3: mfe-widget (Customer team, 3 days)
  - Week 5: mfe-dashboard (Customer team, 1 week)
  - Week 8: mfe-analytics (Admin team, 2 weeks - complex)
  - ...
  ↓
Jul 1: All MFEs on React 20
  ↓
Jul 15: Cleanup: singleton mode enabled
  ↓
Aug 1: Migration complete, back to steady state
```

**Total: 7 months for major React upgrade across 20 MFEs**
**Coordination effort: ~2 people (platform team)**
**Team disruption: Minimal (each MFE ~1-3 days)**

## Trade-offs

We accepted **longer upgrade timelines** in exchange for:

- **Team autonomy**: No forced coordination
- **Safety**: Gradual rollout catches issues
- **Business continuity**: No "upgrade freeze" periods
- **Scalability**: Works with 5 or 500 MFEs

## References

- Spotify's approach: 6-9 month React upgrades
- Zalando's approach: Version manifest + gradual migration
- Netflix's approach: Non-singleton for major upgrades
- Module Federation docs on shared dependencies
