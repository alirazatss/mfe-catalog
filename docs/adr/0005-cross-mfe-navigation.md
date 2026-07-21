# ADR-0005: Cross-MFE Navigation with Global Bridge + React Router

## Status

Accepted (2026-07-14)

## Context

With Chrome MFE pattern, we have multiple MFEs running simultaneously:

- Chrome MFEs (header, sidebar, footer) - always mounted
- Feature MFEs (widget, dashboard) - route-based, use React Router internally

**Critical challenges:**

1. How does `mfe-header` navigate to `/widgets` when it has its own React Router context?
2. How does shell coordinate MFE loading with URL changes?
3. How do MFEs share navigation state without coupling?

## Decision

**Two-layer routing with Global Navigation Bridge:**

- **Layer 1 (Shell)**: `window.__MFE_NAVIGATION__` - Cross-MFE navigation
- **Layer 2 (MFE)**: React Router with `basename` - Internal MFE routing

Shell owns URL-to-MFE mapping. MFEs own their internal routes.

## Alternatives Considered

### Alternative 1: Shared React Router Instance

Share single React Router across all MFEs via Module Federation singleton.

**Rejected because:**

- React Router internals not designed for cross-app sharing
- Version conflicts break silently
- Coupling all MFEs to same React Router version
- Impossible with different frameworks (if we add Vue MFE later)

### Alternative 2: Direct URL Manipulation

Each MFE uses `window.history.pushState` directly.

**Rejected because:**

- `pushState` doesn't trigger `popstate` event
- No way to notify other MFEs of navigation
- Shell can't intercept for MFE loading
- Race conditions when multiple MFEs try to navigate

### Alternative 3: Event Bus Only

All navigation via `eventBus.emit('navigation')`.

**Rejected because:**

- Requires imperative code for every navigation
- No standard API contract
- Can't use browser back/forward properly
- No way to check current path synchronously

### Alternative 4: `<Link>` from React Router Only

Force all MFEs to use React Router's Link.

**Rejected because:**

- Chrome MFEs need to navigate to routes owned by feature MFEs
- Requires all MFEs to be React (breaks framework agnosticism)
- Complex to share Router context across MFEs

## Solution: Global Navigation Bridge

### Layer 1: Shell Navigation Bridge

```typescript
// shell/src/navigation-bridge.ts
export interface MFENavigationAPI {
  version: "1.0.0";
  navigate(path: string, options?: NavigateOptions): void;
  back(): void;
  forward(): void;
  go(delta: number): void;
  getCurrentPath(): string;
  getCurrentQuery(): URLSearchParams;
  onNavigate(callback: (event: NavigationEvent) => void): () => void;
  isActive(path: string, options?: { exact?: boolean }): boolean;
}

interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  query?: Record<string, string>;
}

interface NavigationEvent {
  path: string;
  query: URLSearchParams;
  state: unknown;
  type: "push" | "replace" | "pop";
}

class NavigationBridge implements MFENavigationAPI {
  readonly version = "1.0.0";
  private listeners = new Set<(event: NavigationEvent) => void>();
  private mfeLoader: MFELoader;

  constructor(mfeLoader: MFELoader) {
    this.mfeLoader = mfeLoader;
    window.addEventListener("popstate", this.handlePopState.bind(this));
  }

  navigate(path: string, options: NavigateOptions = {}) {
    const url = this.buildUrl(path, options.query);

    if (options.replace) {
      window.history.replaceState(options.state, "", url);
    } else {
      window.history.pushState(options.state, "", url);
    }

    const event: NavigationEvent = {
      path,
      query: new URLSearchParams(options.query || {}),
      state: options.state,
      type: options.replace ? "replace" : "push",
    };

    // Notify all MFE subscribers
    this.notifyListeners(event);

    // Load appropriate MFE
    this.loadMFEForPath(path);
  }

  back() {
    window.history.back();
  }
  forward() {
    window.history.forward();
  }
  go(delta: number) {
    window.history.go(delta);
  }

  getCurrentPath() {
    return window.location.pathname;
  }
  getCurrentQuery() {
    return new URLSearchParams(window.location.search);
  }

  onNavigate(callback: (event: NavigationEvent) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isActive(path: string, options: { exact?: boolean } = {}) {
    const current = window.location.pathname;
    return options.exact ? current === path : current.startsWith(path);
  }

  private handlePopState() {
    const event: NavigationEvent = {
      path: window.location.pathname,
      query: new URLSearchParams(window.location.search),
      state: window.history.state,
      type: "pop",
    };
    this.notifyListeners(event);
    this.loadMFEForPath(window.location.pathname);
  }

  private buildUrl(path: string, query?: Record<string, string>): string {
    if (!query) return path;
    const params = new URLSearchParams(query);
    return `${path}?${params.toString()}`;
  }

  private notifyListeners(event: NavigationEvent) {
    this.listeners.forEach((cb) => cb(event));
  }

  private async loadMFEForPath(path: string) {
    const mfeName = this.matchRoute(path);
    if (mfeName) {
      await this.mfeLoader.loadFeature(mfeName, "main-slot");
    }
  }

  private matchRoute(path: string): string | null {
    // Check manifest for matching feature MFE
    // e.g., /widgets/* → mfe-widget
    return findMatchingMFE(path);
  }
}

// Initialize in shell bootstrap
export function setupNavigationBridge(mfeLoader: MFELoader) {
  const bridge = new NavigationBridge(mfeLoader);
  (window as any).__MFE_NAVIGATION__ = bridge;
  return bridge;
}
```

### Layer 2: MFE Internal Routing (React Router)

```typescript
// mfe-widget/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router';
import WidgetList from './pages/WidgetList';
import WidgetDetail from './pages/WidgetDetail';
import WidgetEdit from './pages/WidgetEdit';

export default function App() {
  return (
    // basename matches shell's route mapping
    <BrowserRouter basename="/widgets">
      <Routes>
        <Route path="/" element={<WidgetList />} />
        <Route path="/:id" element={<WidgetDetail />} />
        <Route path="/:id/edit" element={<WidgetEdit />} />
        <Route path="/new" element={<WidgetCreate />} />
      </Routes>
    </BrowserRouter>
  );
}

// Internal navigation uses React Router
import { useNavigate } from 'react-router';

function WidgetDetail() {
  const navigate = useNavigate(); // Internal to /widgets/*

  const editWidget = () => {
    // Stays within mfe-widget
    navigate('/edit'); // Goes to /widgets/:id/edit
  };

  const goToDashboard = () => {
    // Cross-MFE navigation - use global bridge
    window.__MFE_NAVIGATION__?.navigate('/dashboard');
  };
}
```

### Chrome MFE Navigation Example

```typescript
// mfe-header/src/Navigation.tsx
export function Navigation() {
  const [activePath, setActivePath] = useState('');

  useEffect(() => {
    // Subscribe to navigation changes
    const cleanup = window.__MFE_NAVIGATION__?.onNavigate((event) => {
      setActivePath(event.path);
    });

    // Set initial path
    setActivePath(window.__MFE_NAVIGATION__?.getCurrentPath() || '');

    return cleanup;
  }, []);

  const navigate = (path: string) => {
    window.__MFE_NAVIGATION__?.navigate(path);
  };

  const isActive = (path: string) => {
    return window.__MFE_NAVIGATION__?.isActive(path, { exact: false });
  };

  return (
    <nav>
      <a
        onClick={() => navigate('/widgets')}
        className={isActive('/widgets') ? 'active' : ''}
      >
        Widgets
      </a>
      <a
        onClick={() => navigate('/dashboard')}
        className={isActive('/dashboard') ? 'active' : ''}
      >
        Dashboard
      </a>
      <a
        onClick={() => navigate('/settings')}
        className={isActive('/settings') ? 'active' : ''}
      >
        Settings
      </a>
    </nav>
  );
}
```

## Vite + Module Federation Configuration

### Shell vite.config.ts

```typescript
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "shell",
      // Shell doesn't expose anything, only consumes
      remotes: {}, // Loaded dynamically at runtime
      shared: {
        // Share auth and navigation bridges
        react: { singleton: true, requiredVersion: "^19" },
        "react-dom": { singleton: true, requiredVersion: "^19" },
      },
    }),
  ],
});
```

### Feature MFE vite.config.ts

```typescript
// mfe-widget/vite.config.ts
export default defineConfig({
  plugins: [
    federation({
      name: "widget",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19" },
        "react-dom": { singleton: true, requiredVersion: "^19" },
        "react-router": { singleton: true, requiredVersion: "^8" },
      },
    }),
  ],
});
```

### Chrome MFE vite.config.ts

```typescript
// mfe-header/vite.config.ts
export default defineConfig({
  plugins: [
    federation({
      name: "header",
      filename: "remoteEntry.js",
      exposes: {
        "./Header": "./src/index.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19" },
        "react-dom": { singleton: true, requiredVersion: "^19" },
      },
    }),
  ],
});
```

## Complete Flow Example

```
1. User is on /dashboard (mfe-dashboard in main-slot)
   ↓
2. User clicks "Widgets" in mfe-header
   ↓
3. mfe-header calls: window.__MFE_NAVIGATION__.navigate('/widgets')
   ↓
4. NavigationBridge:
   a. Updates URL: window.history.pushState('', '', '/widgets')
   b. Notifies subscribers:
      - mfe-header (updates active state)
      - mfe-sidebar (highlights Widgets item)
      - mfe-analytics (tracks page view)
   c. Calls loadMFEForPath('/widgets')
      → Matches manifest: '/widgets/*' → 'mfe-widget'
      → mfeLoader.loadFeature('mfe-widget', 'main-slot')
   ↓
5. Shell unloads mfe-dashboard from main-slot
   ↓
6. Shell loads mfe-widget from CDN
   ↓
7. mfe-widget mounts with React Router basename="/widgets"
   ↓
8. React Router matches "/" (relative to basename) → shows WidgetList
   ↓
9. User clicks widget #123
   ↓
10. WidgetList uses React Router: navigate('/123')
    ↓
11. URL becomes /widgets/123 (basename prepended)
    ↓
12. Shell sees URL change via popstate
    ↓
13. matchRoute('/widgets/123') → 'mfe-widget' (same MFE!)
    ↓
14. Shell does NOT reload (same MFE mounted)
    ↓
15. React Router internally matches /:id → shows WidgetDetail
```

## Consequences

### Positive

- **Clear separation**: Shell handles MFE routing, MFEs handle internal routing
- **Framework agnostic**: MFEs can use any router (React Router, Vue Router, etc.)
- **Chrome MFEs work**: Header can navigate to any feature MFE
- **Browser controls work**: Back/forward buttons behave correctly
- **URL is source of truth**: Bookmarkable, shareable URLs
- **No routing library coupling**: MFEs independent of each other
- **Industry-standard**: Same as Spotify, Zalando, DAZN

### Negative

- **Two mental models**: Developers must know when to use which layer
- **Global state**: `window.__MFE_NAVIGATION__` is global (well-namespaced)
- **Basename coordination**: MFE basename must match shell's route mapping
- **Complexity**: More setup than single-app routing

### Neutral

- Navigation events are broadcast to all subscribers (may impact performance)
- MFE must handle case where `window.__MFE_NAVIGATION__` doesn't exist yet
- Requires coordination between shell manifest and MFE basenames

## Routing Rules

### Use `window.__MFE_NAVIGATION__` when:

- Navigating from Chrome MFE to Feature MFE
- Navigating between Feature MFEs (`/widgets` → `/dashboard`)
- Any cross-MFE navigation
- Programmatic navigation from shell

### Use React Router (or MFE's internal router) when:

- Navigating within the same MFE
- `/widgets/1` → `/widgets/1/edit`
- Sub-routes within a feature
- Component-level navigation

### Manifest Route Mapping

```json
{
  "features": {
    "/widgets": {
      "mfe": "mfe-widget",
      "url": "https://cdn.example.com/prod/mfe-widget@2.1.0/remoteEntry.js",
      "scope": "widget"
    },
    "/dashboard": {
      "mfe": "mfe-dashboard",
      "url": "https://cdn.example.com/prod/mfe-dashboard@1.5.0/remoteEntry.js",
      "scope": "dashboard"
    }
  }
}
```

Shell matches URL prefixes:

- `/widgets/*` → loads `mfe-widget`
- `/dashboard/*` → loads `mfe-dashboard`

MFE uses basename matching:

- `mfe-widget` uses `<BrowserRouter basename="/widgets">`
- `mfe-dashboard` uses `<BrowserRouter basename="/dashboard">`

## Trade-offs

We accepted **two-layer routing complexity** in exchange for:

- **True MFE isolation**: Each MFE self-contained
- **Framework flexibility**: Any router library works
- **Chrome MFE support**: Header can navigate globally
- **Standard pattern**: Industry-proven approach

## References

- Single-SPA routing: https://single-spa.js.org/docs/routing/
- Module Federation Router: https://module-federation.io/practice/frameworks/react/router.html
- Spotify's approach: `window.SP_NAV`
- Zalando's approach: `window.__ZALANDO_ROUTING__`
