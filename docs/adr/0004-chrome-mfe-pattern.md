# ADR-0004: Chrome MFE Pattern - Thin Shell with Modular UI Chrome

## Status

Accepted (2026-07-14)

## Context

With multiple shells owned by different teams and multiple environments, we need to decide how much UI chrome (header, sidebar, footer, navigation) lives in the shell vs. as separate MFEs.

**The question:** Should the shell be a "fat container" with all UI chrome, or a "thin coordinator" with chrome as MFEs?

## Decision

**Adopt the "Chrome MFE" pattern.** Shell is a thin bootstrap coordinator (~200 lines). All UI chrome (header, sidebar, footer, navigation) are separate MFEs loaded from CDN.

### Shell Responsibilities (~200 lines total):

1. Empty HTML template with named slots
2. Auth bootstrap (`tokenManager.initialize()`)
3. Setup `window.__MFE_AUTH__` bridge
4. Fetch manifest and load MFEs into slots
5. Basic CSS grid layout

### MFE Responsibilities:

- **Chrome MFEs**: Header, Sidebar, Footer, Navigation (always mounted)
- **Feature MFEs**: Widgets, Dashboards, Settings (route-based)

## Alternatives Considered

### Alternative 1: Fat Shell (Traditional)

Shell owns all chrome components (header, footer, nav, layout).

**Rejected because:**

- Every header/nav change requires shell deployment
- All shells must have similar chrome (no team autonomy)
- Design team needs access to every shell repo
- Bundle size grows with each feature
- Difficult to A/B test navigation changes

### Alternative 2: Hybrid (Shell Chrome + MFE Chrome)

Shell owns critical chrome (auth-aware header), MFEs own content chrome.

**Rejected because:**

- Unclear boundary between shell chrome and MFE chrome
- Design system split between shell package and MFE package
- Team ownership becomes fuzzy
- Doesn't fully realize MFE benefits

### Alternative 3: Pure Feature MFEs (No Chrome MFEs)

Each feature MFE brings its own header/footer.

**Rejected because:**

- Inconsistent UX (each MFE looks different)
- Duplication of navigation logic
- Difficult to maintain corporate branding
- Users see visual jumps between features

## Consequences

### Positive

- **Team autonomy**: Design team owns `mfe-header`, deploys independently
- **Shell simplicity**: ~200 lines, rarely changes
- **Independent chrome updates**: Update header without shell deployment
- **A/B testing**: Deploy `mfe-header@v2-beta` for testing new navigation
- **Multi-shell reuse**: Same chrome MFEs work across shells (different manifest)
- **Reduced blast radius**: Header bug doesn't affect features
- **Better performance**: Chrome MFEs cached separately from features
- **Industry-proven**: Spotify, Zalando, DAZN, Booking.com use this pattern

### Negative

- **More MFEs to manage**: Chrome MFEs add to catalog count
- **Manifest complexity**: Must specify chrome + feature MFEs
- **Loading orchestration**: Shell must coordinate multiple MFE mounts
- **First paint slower**: Chrome MFEs load after shell (mitigated by caching)
- **CSS coordination**: MFEs must not conflict with shell layout

### Neutral

- Chrome MFEs have different lifecycle than feature MFEs (always mounted)
- Requires strict CSS isolation strategy (Shadow DOM or CSS Modules)
- Different shells can use different chrome MFEs

## Implementation

### Shell HTML Template

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Customer Portal</title>
    <link rel="stylesheet" href="/shell-base.css" />
  </head>
  <body>
    <div id="app">
      <div id="header-slot"></div>
      <div id="sidebar-slot"></div>
      <div id="main-slot"></div>
      <div id="footer-slot"></div>
    </div>
    <script type="module" src="/shell.js"></script>
  </body>
</html>
```

### Shell Bootstrap (shell.ts)

```typescript
import { tokenManager } from "@mfe-runtine/auth";
import { setupAuthBridge } from "@mfe-runtine/auth";
import { MFELoader } from "@mfe-runtine/dynamic-loader";

async function bootstrap() {
  // 1. Initialize authentication
  await tokenManager.initialize();
  setupAuthBridge(); // Exposes window.__MFE_AUTH__

  // 2. Fetch manifest
  const manifest = await fetch(`/manifest-${ENV}.json`).then((r) => r.json());

  // 3. Initialize MFE loader
  const loader = new MFELoader(manifest);

  // 4. Load chrome MFEs (always mounted, parallel)
  await Promise.all([
    loader.load("header", "header-slot"),
    loader.load("sidebar", "sidebar-slot"),
    loader.load("footer", "footer-slot"),
  ]);

  // 5. Load feature MFE based on route
  const featureName = matchRoute(window.location.pathname);
  if (featureName) {
    await loader.load(featureName, "main-slot");
  }

  // 6. Listen for route changes
  window.addEventListener("popstate", handleRouteChange);
}

bootstrap().catch(handleBootstrapError);
```

### Shell Layout CSS

```css
/* shell-base.css - Layout only, no styling */
#app {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr 40px;
  min-height: 100vh;
}

#header-slot {
  grid-area: header;
}
#sidebar-slot {
  grid-area: sidebar;
}
#main-slot {
  grid-area: main;
  overflow: auto;
}
#footer-slot {
  grid-area: footer;
}
```

### Manifest Structure

```json
{
  "chrome": {
    "header": {
      "name": "mfe-header",
      "entryUrl": "https://cdn.example.com/prod/mfe-header@1.2.0/remoteEntry.js",
      "scope": "header"
    },
    "sidebar": {
      "name": "mfe-sidebar",
      "entryUrl": "https://cdn.example.com/prod/mfe-sidebar@1.0.0/remoteEntry.js",
      "scope": "sidebar"
    },
    "footer": {
      "name": "mfe-footer",
      "entryUrl": "https://cdn.example.com/prod/mfe-footer@1.1.0/remoteEntry.js",
      "scope": "footer"
    }
  },
  "features": {
    "/widgets/*": {
      "name": "mfe-widget",
      "entryUrl": "https://cdn.example.com/prod/mfe-widget@2.1.0/remoteEntry.js",
      "scope": "widget"
    },
    "/dashboard/*": {
      "name": "mfe-dashboard",
      "entryUrl": "https://cdn.example.com/prod/mfe-dashboard@1.5.0/remoteEntry.js",
      "scope": "dashboard"
    }
  }
}
```

### Chrome MFE Structure

```
mfe-header/
├── src/
│   ├── Header.tsx           ← Main component
│   ├── UserMenu.tsx         ← Uses window.__MFE_AUTH__
│   ├── NavigationMenu.tsx
│   ├── SearchBar.tsx
│   └── index.tsx            ← Mounts to #header-slot
├── package.json
└── vite.config.ts (Module Federation)
```

### Chrome MFE Entry Point

```typescript
// mfe-header/src/index.tsx
import { createRoot } from 'react-dom/client';
import Header from './Header';

const container = document.getElementById('header-slot');
if (container) {
  const root = createRoot(container);
  root.render(<Header />);
}
```

## Chrome MFE vs Feature MFE

| Aspect           | Chrome MFE                | Feature MFE                   |
| ---------------- | ------------------------- | ----------------------------- |
| **Mount timing** | Always on shell load      | Route-based                   |
| **Slot**         | Fixed (header-slot, etc.) | Dynamic (main-slot)           |
| **Lifecycle**    | Long-lived                | Mount/unmount on route change |
| **State**        | Persistent across routes  | Route-scoped                  |
| **Examples**     | Header, Sidebar, Footer   | Widget, Dashboard, Settings   |
| **Team owner**   | Design/Platform Team      | Feature Teams                 |

## Team Ownership

### Design/Platform Team owns:

- `mfe-header` - Corporate branded header
- `mfe-sidebar` - Navigation sidebar
- `mfe-footer` - Legal/corporate footer
- `mfe-notifications` - Global notifications

### Feature Teams own:

- `mfe-widget` - Widget management (Customer Team)
- `mfe-dashboard` - Analytics dashboard (Customer Team)
- `mfe-analytics` - Admin analytics (Admin Team)
- `mfe-settings` - User settings (Admin Team)

## Trade-offs

We accepted **increased loading complexity** in exchange for:

- **Team autonomy**: Design team deploys independently
- **Shell simplicity**: Thin, rarely-changing shells
- **Update velocity**: Chrome changes without shell deployment
- **Consistency**: Same chrome MFEs across all shells
- **Testability**: Each chrome MFE tested in isolation

## When to Revisit

Reconsider this decision if:

- Chrome MFEs become too coupled to specific shells
- Loading orchestration becomes complex bottleneck
- CSS isolation causes visual issues
- Performance metrics show shell chrome pattern is faster
- Teams collapse into single team (no ownership boundary)

## Industry References

Companies using Chrome MFE pattern:

- **Spotify**: Player, Sidebar, TopBar as separate MFEs
- **Zalando**: Chrome MFEs per team (header, cart, navigation)
- **DAZN**: ~150 line shell, everything else is MFE
- **Booking.com**: Modular chrome across product areas
- **American Express**: Card management via chrome MFE pattern
