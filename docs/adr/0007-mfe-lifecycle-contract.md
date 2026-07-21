# ADR-0007: MFE Lifecycle Contract - Standardized Interface

## Status

Accepted (2026-07-14)

## Context

With Chrome MFE pattern and graceful failure handling, MFEs need a **standardized interface** that:

- Supports mounting to specific DOM slots
- Enables proper cleanup on unmount
- Passes context (user, theme, config) from shell
- Allows shell to control MFE lifecycle
- Works with dynamic loading via Module Federation

Currently, MFEs expose React components directly. This doesn't scale for:

- Chrome MFEs that persist across routes
- Feature MFEs that unmount/remount on navigation
- Framework flexibility (if we add Vue/Svelte MFEs later)
- Proper cleanup (event listeners, timers, subscriptions)

## Decision

**Every MFE exports a standardized lifecycle interface** based on the Single-SPA pattern.

While all MFEs will be React (React 19 + Vite + Module Federation), the lifecycle contract:

1. Enforces proper mount/unmount semantics
2. Handles React 19's `createRoot` lifecycle
3. Provides clean upgrade path if we add other frameworks
4. Standardizes prop passing from shell

## Alternatives Considered

### Alternative 1: React Components Only

Just export React components, shell handles mounting.

**Rejected because:**

- No standardized cleanup mechanism
- Shell must know React internals
- Chrome MFEs need persistent state management
- Can't easily add non-React MFEs
- Doesn't handle async initialization

### Alternative 2: Custom React Wrapper

Create a React-specific `mount(component)` wrapper.

**Rejected because:**

- Reinvents Single-SPA wheel
- Not battle-tested
- No standard for community
- Custom = maintenance burden

### Alternative 3: Full Single-SPA Framework

Use the actual Single-SPA library.

**Rejected because:**

- Overkill for our needs
- Adds dependency (we prefer minimal)
- Complex configuration
- We control everything, no need for their orchestration

## Solution: Standard MFE Lifecycle Interface

### Core Contract

```typescript
// packages/dynamic-loader/src/types.ts

export interface MFEProps {
  // Shell provides these to every MFE
  container: HTMLElement; // Where to mount
  slot?: string; // Slot name (header-slot, main-slot, etc.)

  // App context
  user?: User | null;
  isAuthenticated?: boolean;
  theme?: "light" | "dark";
  locale?: string;

  // Configuration
  basePath?: string; // Base URL for MFE (matches React Router basename)
  config?: Record<string, any>; // MFE-specific config from manifest

  // Navigation
  onNavigate?: (path: string) => void;

  // Custom props (feature-specific)
  [key: string]: any;
}

export interface MFELifecycle {
  /**
   * One-time initialization when MFE is first loaded.
   * Runs before mount. Use for expensive setup that should
   * only happen once, even if MFE is mounted multiple times.
   */
  bootstrap: (props: MFEProps) => Promise<void>;

  /**
   * Mount the MFE into the DOM.
   * Creates React root, renders components, sets up subscriptions.
   */
  mount: (props: MFEProps) => Promise<void>;

  /**
   * Unmount the MFE from the DOM.
   * Cleanup: unsubscribe events, destroy React root, clear timers.
   */
  unmount: (props: MFEProps) => Promise<void>;

  /**
   * Optional: Update MFE without unmounting.
   * Called when props change (user login, theme change).
   */
  update?: (props: MFEProps) => Promise<void>;
}
```

### Standard React MFE Implementation

```typescript
// mfe-widget/src/index.tsx
import { createRoot, type Root } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App';
import type { MFELifecycle, MFEProps } from '@mf-mono/dynamic-loader';

let root: Root | null = null;

const lifecycle: MFELifecycle = {
  async bootstrap(props: MFEProps) {
    // One-time setup (analytics, error tracking, etc.)
    console.log('[mfe-widget] Bootstrap');

    // Load any required data
    // await preloadCriticalData();
  },

  async mount(props: MFEProps) {
    console.log('[mfe-widget] Mount', { slot: props.slot });

    // Create React root
    root = createRoot(props.container);

    // Render app with props from shell
    root.render(
      <StrictMode>
        <App
          basePath={props.basePath || '/widgets'}
          user={props.user}
          isAuthenticated={props.isAuthenticated}
          theme={props.theme}
        />
      </StrictMode>
    );
  },

  async unmount(props: MFEProps) {
    console.log('[mfe-widget] Unmount');

    // Cleanup React root
    if (root) {
      root.unmount();
      root = null;
    }

    // Clear container
    props.container.innerHTML = '';

    // Cleanup any subscriptions, timers, etc.
    // globalCleanup();
  },

  async update(props: MFEProps) {
    // Optional: re-render with new props without unmount
    if (root) {
      root.render(
        <StrictMode>
          <App
            basePath={props.basePath || '/widgets'}
            user={props.user}
            isAuthenticated={props.isAuthenticated}
            theme={props.theme}
          />
        </StrictMode>
      );
    }
  },
};

// Export lifecycle functions individually (Module Federation friendly)
export const { bootstrap, mount, unmount, update } = lifecycle;

// Also export as default for convenience
export default lifecycle;
```

### Chrome MFE Implementation

```typescript
// mfe-header/src/index.tsx
import { createRoot, type Root } from 'react-dom/client';
import Header from './Header';
import type { MFELifecycle, MFEProps } from '@mf-mono/dynamic-loader';

let root: Root | null = null;
let navigationCleanup: (() => void) | null = null;

const lifecycle: MFELifecycle = {
  async bootstrap(props: MFEProps) {
    // Load user preferences, theme, etc.
  },

  async mount(props: MFEProps) {
    root = createRoot(props.container);

    root.render(
      <Header
        user={props.user}
        theme={props.theme}
        onNavigate={props.onNavigate}
      />
    );

    // Chrome MFEs often subscribe to shell events
    navigationCleanup = window.__MFE_NAVIGATION__?.onNavigate((event) => {
      // Update active state in header
    });
  },

  async unmount(props: MFEProps) {
    // Cleanup subscriptions
    navigationCleanup?.();

    // Unmount React
    if (root) {
      root.unmount();
      root = null;
    }
  },

  async update(props: MFEProps) {
    // Chrome MFEs often update when user state changes
    if (root) {
      root.render(
        <Header
          user={props.user}
          theme={props.theme}
          onNavigate={props.onNavigate}
        />
      );
    }
  },
};

export const { bootstrap, mount, unmount, update } = lifecycle;
```

### Vite + Module Federation Configuration

```typescript
// mfe-widget/vite.config.ts
import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "widget",
      filename: "remoteEntry.js",
      exposes: {
        // Expose lifecycle module (not just App component)
        "./lifecycle": "./src/index.tsx",

        // Optional: Also expose individual components for testing
        "./App": "./src/App.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19" },
        "react-dom": { singleton: true, requiredVersion: "^19" },
        "react-router": { singleton: true, requiredVersion: "^8" },
        "@mf-mono/dynamic-loader": { singleton: true, requiredVersion: "^1" },
      },
    }),
  ],
  build: {
    target: "esnext",
    modulePreload: false,
    minify: false,
    cssCodeSplit: false,
  },
});
```

### Shell MFE Loader Implementation

```typescript
// packages/dynamic-loader/src/loader.ts
import type { MFELifecycle, MFEProps } from "./types";

interface MFEInstance {
  name: string;
  lifecycle: MFELifecycle;
  container: HTMLElement;
  props: MFEProps;
  bootstrapped: boolean;
  mounted: boolean;
}

class MFELoader {
  private instances = new Map<string, MFEInstance>();

  async load(mfeName: string, slotId: string, props: Partial<MFEProps> = {}): Promise<void> {
    const container = document.getElementById(slotId);
    if (!container) {
      throw new Error(`Slot not found: ${slotId}`);
    }

    // Unload existing MFE in this slot if different
    const existing = this.getBySlot(slotId);
    if (existing && existing.name !== mfeName) {
      await this.unload(existing.name);
    }

    // Load MFE module from CDN
    const mfeConfig = this.manifest.getMFE(mfeName);
    const module = await this.loadRemoteModule(mfeConfig);

    // Extract lifecycle (either named exports or default)
    const lifecycle: MFELifecycle = {
      bootstrap: module.bootstrap || module.default?.bootstrap,
      mount: module.mount || module.default?.mount,
      unmount: module.unmount || module.default?.unmount,
      update: module.update || module.default?.update,
    };

    // Validate lifecycle contract
    this.validateLifecycle(mfeName, lifecycle);

    // Prepare full props
    const fullProps: MFEProps = {
      container,
      slot: slotId,
      user: this.getCurrentUser(),
      isAuthenticated: this.isAuthenticated(),
      theme: this.getCurrentTheme(),
      locale: this.getCurrentLocale(),
      basePath: mfeConfig.basePath,
      config: mfeConfig.config,
      onNavigate: (path) => window.__MFE_NAVIGATION__?.navigate(path),
      ...props,
    };

    // Create instance
    const instance: MFEInstance = {
      name: mfeName,
      lifecycle,
      container,
      props: fullProps,
      bootstrapped: false,
      mounted: false,
    };

    this.instances.set(mfeName, instance);

    // Execute lifecycle: bootstrap → mount
    if (!instance.bootstrapped) {
      await lifecycle.bootstrap(fullProps);
      instance.bootstrapped = true;
    }

    await lifecycle.mount(fullProps);
    instance.mounted = true;

    // Notify success
    window.dispatchEvent(
      new CustomEvent("mfe:loaded", { detail: { name: mfeName, slot: slotId } }),
    );
  }

  async unload(mfeName: string): Promise<void> {
    const instance = this.instances.get(mfeName);
    if (!instance || !instance.mounted) return;

    await instance.lifecycle.unmount(instance.props);
    instance.mounted = false;

    // Clear container
    instance.container.innerHTML = "";
  }

  async update(mfeName: string, propsUpdate: Partial<MFEProps>): Promise<void> {
    const instance = this.instances.get(mfeName);
    if (!instance || !instance.mounted) return;

    // Merge props
    instance.props = { ...instance.props, ...propsUpdate };

    // Call update if available, otherwise unmount + mount
    if (instance.lifecycle.update) {
      await instance.lifecycle.update(instance.props);
    } else {
      await instance.lifecycle.unmount(instance.props);
      await instance.lifecycle.mount(instance.props);
    }
  }

  private validateLifecycle(name: string, lifecycle: any): void {
    const required = ["bootstrap", "mount", "unmount"];
    const missing = required.filter((fn) => typeof lifecycle[fn] !== "function");

    if (missing.length > 0) {
      throw new Error(`MFE ${name} missing required lifecycle: ${missing.join(", ")}`);
    }
  }

  private getBySlot(slotId: string): MFEInstance | undefined {
    return Array.from(this.instances.values()).find((i) => i.props.slot === slotId);
  }
}

export const mfeLoader = new MFELoader();
```

## Complete Usage Example

```typescript
// shell/src/shell.ts
import { mfeLoader } from "@mf-mono/dynamic-loader";

async function bootstrap() {
  await tokenManager.initialize();
  setupAuthBridge();

  const manifest = await fetchManifest();
  mfeLoader.setManifest(manifest);

  // Load chrome MFEs (parallel)
  await Promise.all([
    mfeLoader.load("mfe-header", "header-slot"),
    mfeLoader.load("mfe-sidebar", "sidebar-slot"),
    mfeLoader.load("mfe-footer", "footer-slot"),
  ]);

  // Load feature MFE for current route
  const featureName = matchRoute(window.location.pathname);
  if (featureName) {
    await mfeLoader.load(featureName, "main-slot");
  }

  // Listen for navigation
  window.__MFE_NAVIGATION__?.onNavigate(async (event) => {
    const newFeature = matchRoute(event.path);
    if (newFeature) {
      await mfeLoader.load(newFeature, "main-slot");
    }
  });

  // Update MFEs when auth state changes
  window.__MFE_AUTH__?.onTokenChange((token) => {
    const user = decodeUser(token);
    // Update all mounted MFEs with new user
    mfeLoader.updateAll({ user });
  });
}

bootstrap();
```

## Consequences

### Positive

- **Standardized contract**: Every MFE follows same pattern
- **Proper cleanup**: No memory leaks from unmount
- **Future flexibility**: Can add Vue/Svelte MFEs later
- **Testable**: Lifecycle functions easy to test
- **Chrome MFE support**: Persistent state management
- **Async-first**: Handles data preloading
- **Prop-driven**: Shell controls MFE state
- **Industry-standard**: Single-SPA compatible pattern

### Negative

- **Slight boilerplate**: Every MFE has lifecycle wrapper
- **Learning curve**: New pattern for developers
- **More code per MFE**: ~50 lines vs just exporting component
- **Framework detection**: Loader must handle default vs named exports

### Neutral

- MFEs must be built as ES modules
- Requires React 18+ (createRoot API)
- StrictMode recommended but optional
- Module Federation `shared` config critical

## Lifecycle Flow Diagrams

### Chrome MFE Lifecycle

```
Shell Load
    ↓
Fetch manifest
    ↓
Load mfe-header module from CDN
    ↓
lifecycle.bootstrap({ user, theme })
    ↓
lifecycle.mount({ container: #header-slot, ... })
    ↓
[User interacts with header]
    ↓
User changes theme
    ↓
lifecycle.update({ theme: 'dark' })
    ↓
[Continue interaction]
    ↓
[App is closed]
    ↓
lifecycle.unmount({ container: #header-slot })
```

### Feature MFE Lifecycle

```
User navigates to /widgets
    ↓
Load mfe-widget from CDN
    ↓
lifecycle.bootstrap({ user })
    ↓
lifecycle.mount({ container: #main-slot, basePath: '/widgets' })
    ↓
[User navigates within widget]
    ↓
User navigates to /dashboard
    ↓
lifecycle.unmount({ container: #main-slot })
    ↓
Load mfe-dashboard from CDN
    ↓
[dashboard lifecycle continues...]
    ↓
User navigates back to /widgets
    ↓
lifecycle.mount({ container: #main-slot, basePath: '/widgets' })
   (bootstrap SKIPPED - already bootstrapped)
```

## Testing Contract

```typescript
// mfe-widget/src/index.test.ts
import { describe, it, expect, vi } from "vitest";
import { bootstrap, mount, unmount } from "./index";

describe("mfe-widget lifecycle", () => {
  it("should have all required lifecycle functions", () => {
    expect(typeof bootstrap).toBe("function");
    expect(typeof mount).toBe("function");
    expect(typeof unmount).toBe("function");
  });

  it("should mount and unmount cleanly", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    await bootstrap({ container });
    await mount({ container, user: mockUser });

    expect(container.children.length).toBeGreaterThan(0);

    await unmount({ container });

    expect(container.innerHTML).toBe("");

    document.body.removeChild(container);
  });
});
```

## Trade-offs

We accepted **lifecycle boilerplate** in exchange for:

- **Standardization**: Every MFE follows same pattern
- **Cleanup guarantee**: No memory leaks
- **Future flexibility**: Framework-agnostic contract
- **Testability**: Standard interface easy to mock
- **Industry alignment**: Compatible with Single-SPA ecosystem
