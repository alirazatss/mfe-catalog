# Dynamic Micro-Frontend Monorepo

A modern **Vite+ monorepo** demonstrating **auto-discovered Module Federation** with **dynamic runtime loading**, **zero-config micro-frontends**, and **specification-driven development**.

## Features

### Auto-Discovery System

- **Zero-config micro-frontends** - Just create `apps/mfe-*` and it's automatically discovered
- **Convention-based naming** - Package names like `@mf-mono/mfe-widget` auto-generate config
- **Automatic port allocation** - Alphabetically sorted, starting at 5174, with conflict detection
- **Generated configuration** - `remotes.config.json` created at build time (gitignored)

### Dynamic Runtime Loader

- **Framework-agnostic loader** - Works with any Module Federation setup
- **Exponential backoff retry** - Configurable retries for config/remote loading
- **Event-driven telemetry** - 7 lifecycle events for observability
- **Memory caching** - Config and remote containers cached in-memory
- **Singleton pattern** - One loader instance across the application
- **Bundle size**: 6.12 KB (gzipped: 1.94 KB)

### Developer Experience

- **Development logging** - All loader events logged in dev mode (silent in production)
- **Specific error messages** - Helpful error messages for each failure scenario
- **Hot Module Replacement** - HMR works for both host and remotes
- **TypeScript support** - Full type safety with auto-generated declarations
- **Static config fallback** - Commented static config for emergency fallback

### Production Ready

- **Environment-specific URLs** - Dev uses localhost, prod uses versioned CDN URLs
- **Git hash versioning** - Production URLs include git hash for cache busting
- **Graceful degradation** - App continues if config fails to load
- **Error boundaries** - Fallback UI for remote loading failures

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Host Application                             │
│                     (apps/website)                               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Dynamic Loader                                           │   │
│  │  - Fetches /remotes.config.json                          │   │
│  │  - Validates against JSON Schema                         │   │
│  │  - Caches config in memory                               │   │
│  │  - Loads remotes on demand                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                        │
│                          ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Remote: mfe-widget                                       │   │
│  │  - Scope: "widget"                                        │   │
│  │  - Port: 5174                                             │   │
│  │  - Exposes: ./CounterWidget                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Auto-Discovery Pipeline                         │
│                                                                   │
│  1. Scan apps/mfe-* directories                                 │
│  2. Read package.json for name and port                         │
│  3. Detect port conflicts (alphabetical fallback)               │
│  4. Derive scope from package name (mfe-widget → widget)        │
│  5. Generate environment-specific URLs                           │
│  6. Write remotes.config.json to host public/                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
mf-mono/
├── apps/
│   ├── website/                    # Host application (port 5173)
│   │   ├── public/
│   │   │   └── remotes.config.json # Auto-generated (gitignored)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── remotes.ts      # Loader initialization
│   │   │   ├── main.ts             # App entry (calls initializeRemotes)
│   │   │   ├── RemoteWidgetLoader.ts # Remote loading logic
│   │   │   └── types/
│   │   │       └── remotes.d.ts    # TypeScript declarations
│   │   └── vite.config.ts          # Host Module Federation config
│   │
│   └── mfe-widget/                 # Micro-frontend (port 5174)
│       ├── src/
│       │   ├── components/
│       │   │   └── CounterWidget.ts # Exposed component
│       │   └── main.ts             # Standalone entry (for dev)
│       └── vite.config.ts          # Remote Module Federation config
│
├── packages/
│   ├── monorepo-tools/             # Auto-discovery and config generation
│   │   ├── src/
│   │   │   ├── discovery.ts        # Filesystem scanner
│   │   │   └── generation.ts       # Config generator
│   │   └── README.md
│   │
│   ├── remote-config/              # JSON Schema and types
│   │   ├── schema.json             # Validation schema
│   │   └── src/types.ts            # TypeScript types
│   │
│   ├── dynamic-loader/             # Runtime loader
│   │   ├── src/
│   │   │   ├── DynamicLoader.ts    # Main loader class
│   │   │   ├── config.ts           # Config fetching with retry
│   │   │   ├── events.ts           # Event system
│   │   │   └── types.ts            # Type definitions
│   │   └── tests/                  # Vitest unit tests
│   │
│   └── utils/                      # Shared utilities
│
├── scripts/
│   └── generate-config.ts          # CLI for config generation
│
├── openspec/                       # Specification-driven docs
│   ├── specs/                      # Living specifications
│   │   ├── monorepo-discovery/
│   │   ├── config-generation/
│   │   ├── dynamic-loader/
│   │   └── module-federation-host/
│   └── changes/                    # Change proposals
│       └── archive/                # Completed changes
│           ├── 2026-07-08-turborepo-setup/
│           ├── 2026-07-08-mfe-convention-and-packages/
│           ├── 2026-07-08-mfe-discovery-and-generation/
│           ├── 2026-07-08-mfe-dynamic-loader/
│           └── 2026-07-09-mfe-host-integration/
│
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml             # pnpm workspace + catalog
└── package.json                    # Root scripts
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run All Applications

```bash
pnpm dev:all
```

This starts:

- **Host** at `http://localhost:5173`
- **mfe-widget** at `http://localhost:5174`

### 3. Build for Production

```bash
pnpm build
```

This will:

1. Auto-generate `remotes.config.json`
2. Build all packages in dependency order
3. Build all applications

## Development Workflow

### Run Host and Remotes Individually

**Start all at once (recommended):**

```bash
pnpm turbo dev --filter=website --filter=@mf-mono/mfe-widget
```

**Or start individually:**

```bash
# Terminal 1: Start the remote
pnpm --filter @mf-mono/mfe-widget dev

# Terminal 2: Start the host
pnpm --filter website dev
```

### Generate Config Manually

```bash
# Generate config for development
pnpm generate:config

# Dry-run (preview without writing)
pnpm tsx scripts/generate-config.ts --dry-run

# Generate for production (includes git hash)
NODE_ENV=production pnpm generate:config
```

### Run Tests

```bash
# All tests
pnpm turbo test

# Specific package
pnpm --filter @mf-mono/dynamic-loader test

# Watch mode
pnpm --filter @mf-mono/dynamic-loader test -- --watch
```

### Build Individual Packages

```bash
# Build dynamic-loader
pnpm turbo build --filter=@mf-mono/dynamic-loader

# Build website
pnpm turbo build --filter=website
```

## Creating a New Micro-Frontend

### Step 1: Create Package

```bash
mkdir -p apps/mfe-analytics
cd apps/mfe-analytics
```

### Step 2: Add `package.json`

```json
{
  "name": "@mf-mono/mfe-analytics",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vp dev",
    "build": "vp build"
  },
  "mf-config": {
    "port": 5175
  }
}
```

**Key points**:

- Name MUST follow `@mf-mono/mfe-*` pattern
- Add `mf-config.port` for desired port (optional, auto-assigned if missing)

### Step 3: Add `vite.config.ts`

```typescript
import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "analytics", // Scope name (derived from mfe-analytics)
      filename: "remoteEntry.js",
      exposes: {
        "./Dashboard": "./src/components/Dashboard.ts",
      },
      shared: {},
    }),
  ],
  server: {
    port: 5175,
    origin: "http://localhost:5175",
  },
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
});
```

### Step 4: Create Exposed Component

```typescript
// src/components/Dashboard.ts
export class AnalyticsDashboard {
  constructor(container: HTMLElement) {
    container.innerHTML = `<div>Analytics Dashboard</div>`;
  }
}
```

### Step 5: Regenerate Config

```bash
pnpm generate:config
```

Output:

```
✅ Found 2 micro-frontend(s):
   - mfe-widget (@mf-mono/mfe-widget) on port 5174
   - mfe-analytics (@mf-mono/mfe-analytics) on port 5175
```

### Step 6: Load in Host

```typescript
// In host application
import { loader } from "./config/remotes.ts";

const dashboard = await loader.loadRemote("mfe-analytics");
const factory = await dashboard.get("./Dashboard");
const { AnalyticsDashboard } = factory();

new AnalyticsDashboard(container);
```

**That's it!** No manual configuration needed.

## Configuration

### Auto-Generated Config Format

`apps/website/public/remotes.config.json`:

```json
{
  "$schema": "../node_modules/@mf-mono/remote-config/schema.json",
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "http://localhost:5174/remoteEntry.js",
      "scope": "widget",
      "version": "0.0.0",
      "enabled": true
    },
    {
      "name": "mfe-analytics",
      "entryUrl": "http://localhost:5175/remoteEntry.js",
      "scope": "analytics",
      "version": "0.0.0",
      "enabled": true
    }
  ]
}
```

**Production config** (with git hash):

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "https://cdn.example.com/mfe-widget/v1a2b3c4/remoteEntry.js",
      "scope": "widget",
      "version": "1a2b3c4",
      "enabled": true
    }
  ]
}
```

### Dynamic Loader API

#### Initialize Loader

```typescript
import { loader } from "@mf-mono/dynamic-loader";

await loader.init({
  configPath: "/remotes.config.json",
  maxRetries: 3,
  retryDelay: 1000,
});
```

#### Load a Remote

```typescript
const remoteContainer = await loader.loadRemote("mfe-widget");
const factory = await remoteContainer.get("./CounterWidget");
const module = factory();
```

#### Preload a Remote

```typescript
await loader.preload("mfe-analytics"); // Loads script, doesn't execute yet
```

#### Check Status

```typescript
const status = loader.getStatus();
console.log(status);
// {
//   configLoaded: true,
//   loadedRemotes: ["mfe-widget"],
//   failedRemotes: []
// }
```

#### Clear Cache

```typescript
loader.clearCache(); // Clear all cached remote containers
```

### Event System

The loader emits 7 lifecycle events:

```typescript
import { loader } from "@mf-mono/dynamic-loader";

// Config events
loader.on("config:fetch:start", ({ configPath }) => {
  console.log(`Fetching config from ${configPath}...`);
});

loader.on("config:fetch:success", ({ config }) => {
  console.log("Config loaded:", config);
});

loader.on("config:fetch:error", ({ error }) => {
  console.error("Config failed:", error);
});

// Remote events
loader.on("remote:load:start", ({ name }) => {
  console.log(`Loading remote '${name}'...`);
});

loader.on("remote:load:success", ({ name }) => {
  console.log(`Remote '${name}' loaded!`);
});

loader.on("remote:load:error", ({ name, error }) => {
  console.error(`Failed to load '${name}':`, error);
});

loader.on("remote:preload:success", ({ name }) => {
  console.log(`Remote '${name}' preloaded`);
});
```

**Development mode** (in `apps/website/src/config/remotes.ts`):

```typescript
if (import.meta.env.DEV) {
  loader.on("config:fetch:success", ({ config }) => {
    console.log("[Remotes] Config loaded:", config);
  });
  // ... other events
}
```

## Port Allocation

Ports are auto-assigned using this algorithm:

1. **Start at 5174** (first remote port)
2. **Sort packages alphabetically** by name
3. **Check package.json `mf-config.port`** - use if specified
4. **Check for conflicts** - if port taken, use next available
5. **Increment** until free port found

Example:

```
@mf-mono/mfe-analytics  → 5174  (alphabetically first)
@mf-mono/mfe-dashboard  → 5175
@mf-mono/mfe-widget     → 5176  (alphabetically last)
```

With explicit port:

```json
// apps/mfe-widget/package.json
{
  "name": "@mf-mono/mfe-widget",
  "mf-config": {
    "port": 5174 // Explicit port assignment
  }
}
```

## Error Handling

### Error Scenarios Covered

1. **Config not found** - Fails after 3 retries, app continues with degraded mode
2. **Remote not in config** - Throws `Remote 'X' not found in config`
3. **Remote disabled** - Throws `Remote 'X' is disabled`
4. **Script load failure** - Throws `Failed to load script from {url}`
5. **Network errors** - Retries with exponential backoff

### Error Boundaries

The host application has error boundaries that display specific messages:

```typescript
// Error UI automatically shows:
// - "Remote not found in config" → suggests running pnpm generate:config
// - "Remote is disabled" → suggests checking enabled flag
// - "Failed to load script" → suggests checking if remote is running
// - "Config failed to load" → suggests checking public/ directory
```

### Fallback Strategy

If dynamic loader fails, uncomment static config in `apps/website/vite.config.ts`:

```typescript
federation({
  name: "host",
  remotes: {
    // Uncomment for static fallback:
    mfeWidget: {
      type: "module",
      name: "mfeWidget",
      entry: "http://localhost:5174/remoteEntry.js",
      entryGlobalName: "mfeWidget",
      shareScope: "default",
    },
  },
});
```

Then rebuild:

```bash
pnpm turbo build --filter=website --force
```

## Turborepo Integration

### Task Pipeline

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".vite/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "generate:config": {
      "cache": false,
      "outputs": ["apps/website/public/remotes.config.json"]
    }
  }
}
```

### Smart Caching

Turborepo caches build outputs based on:

- Source code changes
- Dependencies changes
- Config changes

Example:

```bash
pnpm turbo build --filter=@mf-mono/dynamic-loader
# Cache miss, executing...
# ✓ Build complete

pnpm turbo build --filter=@mf-mono/dynamic-loader
# Cache hit, replaying logs
# ⚡ FULL TURBO
```

## TypeScript Support

### Remote Type Declarations

```typescript
// apps/website/src/types/remotes.d.ts
declare module "mfe-widget/CounterWidget" {
  export class CounterWidget {
    constructor(
      container: HTMLElement,
      options: {
        initialValue?: number;
        theme?: "light" | "dark";
        onCountChange?: (count: number) => void;
      },
    );
    destroy(): void;
  }
}
```

### Loader Types

```typescript
import type { DynamicLoader, LoaderConfig, LoaderStatus } from "@mf-mono/dynamic-loader";

const config: LoaderConfig = {
  configPath: "/remotes.config.json",
  maxRetries: 3,
  retryDelay: 1000,
};

const status: LoaderStatus = loader.getStatus();
```

## Production Deployment

### Environment-Specific URLs

Development:

```json
{
  "entryUrl": "http://localhost:5174/remoteEntry.js"
}
```

Production (with CDN):

```json
{
  "entryUrl": "https://cdn.example.com/mfe-widget/v1a2b3c4/remoteEntry.js"
}
```

### Build Pipeline

```bash
# 1. Set NODE_ENV
export NODE_ENV=production

# 2. Generate config with git hash
pnpm generate:config

# 3. Build all packages and apps
pnpm turbo build

# 4. Deploy host to hosting (Vercel, Netlify, etc.)
# Deploy apps/website/dist/

# 5. Deploy each remote to CDN
# Deploy apps/mfe-widget/dist/ to cdn.example.com/mfe-widget/v{hash}/
```

### Versioning Strategy

The system uses **git commit hash** for versioning in production:

```
https://cdn.example.com/mfe-widget/v1a2b3c4/remoteEntry.js
                                       ^^^^^^^^
                                       git hash (first 7 chars)
```

Benefits:

- **Cache busting** - Each commit gets unique URL
- **Rollback support** - Keep old versions on CDN
- **Immutable deploys** - Never overwrite existing versions

## Technologies

| Category          | Technology                     |
| ----------------- | ------------------------------ |
| Build Tool        | Vite 8.x + Vite Plus 0.2.x     |
| Module Federation | @module-federation/vite 2.x    |
| Language          | TypeScript 6.x                 |
| Package Manager   | pnpm 11.x (workspaces)         |
| Monorepo          | Turborepo 2.x                  |
| Bundler           | tsdown 0.22.x (Rolldown-based) |
| Testing           | Vitest 3.x                     |
| Specification     | OpenSpec                       |

## Testing

### Unit Tests

```bash
# Run all tests
pnpm turbo test

# Run specific package tests
pnpm --filter @mf-mono/dynamic-loader test

# Watch mode
pnpm --filter @mf-mono/dynamic-loader test -- --watch

# Coverage
pnpm --filter @mf-mono/dynamic-loader test -- --coverage
```

### Integration Tests

The host application has integration tests for:

- Config loading
- Remote loading via loader API
- Error scenarios (not found, disabled, network failure)
- Widget rendering end-to-end

### Manual Testing

```bash
# Start dev servers
pnpm turbo dev --filter=website --filter=@mf-mono/mfe-widget

# Visit http://localhost:5173
# - Widget should load automatically
# - Check console for loader events
# - Test increment/decrement buttons
# - Verify HMR works (edit widget, see changes)

# Test error scenarios:
# 1. Stop mfe-widget server → see error boundary
# 2. Delete remotes.config.json → see config error
# 3. Set enabled: false → see "disabled" error
```

## Troubleshooting

### Remote not loading

**Symptom**: Error boundary shows "Failed to load remote"

**Solutions**:

1. Ensure remote is running:

   ```bash
   pnpm --filter @mf-mono/mfe-widget dev
   ```

2. Check config exists:

   ```bash
   cat apps/website/public/remotes.config.json
   ```

3. Regenerate config:

   ```bash
   pnpm generate:config
   ```

4. Verify remote URL is accessible:
   ```bash
   curl http://localhost:5174/remoteEntry.js
   ```

### TypeScript errors

**Symptom**: `Cannot find module 'mfe-widget/CounterWidget'`

**Solutions**:

1. Check type declarations exist:

   ```bash
   cat apps/website/src/types/remotes.d.ts
   ```

2. Restart TypeScript server (VS Code):
   - Cmd+Shift+P → "TypeScript: Restart TS Server"

3. Build the remote package first:
   ```bash
   pnpm turbo build --filter=@mf-mono/mfe-widget
   ```

### Port conflicts

**Symptom**: `Error: Port 5174 is already in use`

**Solutions**:

1. Kill process on port:

   ```bash
   lsof -ti:5174 | xargs kill -9
   ```

2. Change port in `package.json`:

   ```json
   {
     "mf-config": {
       "port": 5175
     }
   }
   ```

3. Regenerate config:
   ```bash
   pnpm generate:config
   ```

### Config not found in production

**Symptom**: `Failed to fetch /remotes.config.json`

**Solutions**:

1. Ensure config is in `public/` directory
2. Check build output includes `remotes.config.json`
3. Verify hosting serves static files from `public/`

### Cache issues

**Symptom**: Old remote version loading

**Solutions**:

1. Clear loader cache:

   ```typescript
   loader.clearCache();
   ```

2. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

3. Clear Turborepo cache:
   ```bash
   pnpm turbo build --force
   ```

## Documentation

- [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md) - Production URL configuration
- [Remote Widget README](./apps/mfe-widget/README.md) - Remote application docs
- [OpenSpec Specifications](./openspec/specs/) - Living documentation
  - [Monorepo Discovery](./openspec/specs/monorepo-discovery/spec.md)
  - [Config Generation](./openspec/specs/config-generation/spec.md)
  - [Dynamic Loader](./openspec/specs/dynamic-loader/spec.md)
  - [Module Federation Host](./openspec/specs/module-federation-host/spec.md)

## Roadmap

Completed phases (archived in `openspec/changes/archive/`):

- [x] **Phase 0**: Turborepo setup with task pipeline
- [x] **Phase 1**: Convention and package structure
- [x] **Phase 2**: Discovery and config generation
- [x] **Phase 3**: Dynamic loader implementation
- [x] **Phase 4**: Host integration

Future enhancements:

- [ ] React hooks for remote loading (`useRemote`, `useRemoteComponent`)
- [ ] Remote health checks and circuit breakers
- [ ] A/B testing support (load different remote versions)
- [ ] Remote feature flags
- [ ] Monitoring and analytics integration
- [ ] Server-side rendering (SSR) support
- [ ] Remote dependency tree visualization

## Contributing

This project follows **specification-driven development** using OpenSpec:

1. **Propose** - Create proposal in `openspec/changes/`
2. **Spec** - Write requirements with GIVEN/WHEN/THEN scenarios
3. **Design** - Document technical approach
4. **Implement** - Build according to spec
5. **Test** - Verify all scenarios pass
6. **Archive** - Move to `openspec/changes/archive/`

See [OpenSpec README](./openspec/README.md) for workflow details.

## Learn More

- [Module Federation](https://module-federation.io/) - Official Module Federation docs
- [Vite](https://vite.dev/) - Vite documentation
- [Vite Plus](https://viteplus.dev/) - Vite Plus documentation
- [Turborepo](https://turbo.build/repo) - Turborepo documentation
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - Specification-driven development
- [pnpm Workspaces](https://pnpm.io/workspaces) - pnpm workspace documentation

## License

MIT
