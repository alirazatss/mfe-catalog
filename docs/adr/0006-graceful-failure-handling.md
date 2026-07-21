# ADR-0006: Graceful Failure Handling for MFEs

## Status

Accepted (2026-07-14)

## Context

With multiple MFEs loaded from CDN at runtime, failures are inevitable:

- Network errors, 404s, CORS issues
- MFE runtime crashes (JS errors, React errors)
- Auth token refresh failures
- Manifest fetch failures
- Version mismatches (React 18 vs 19)
- Backend API failures within MFEs

**The question:** How should the shell and MFEs respond to failures?

## Decision

**Fail gracefully with slot-level error boundaries.** A failed MFE should not break other MFEs. Users should see helpful fallback UI, not white screens.

**Core principle:** Isolate failures to their slot. Keep the rest of the app functional.

## Alternatives Considered

### Alternative 1: Fail Hard

Any MFE loading failure = show global error page, force reload.

**Rejected because:**

- Poor user experience (whole app broken for one MFE issue)
- Users lose current state (form data, scroll position)
- Not resilient to CDN hiccups
- Doesn't match industry standards

### Alternative 2: Silent Failures

Log errors, show nothing when MFE fails.

**Rejected because:**

- Users confused (empty section?)
- No feedback = no bug reports
- Hard to debug in production
- Broken UX (missing sidebar, no navigation)

### Alternative 3: Full Retry Loop

Keep retrying MFE loads indefinitely.

**Rejected because:**

- Network storm during outages
- Battery drain on mobile
- Blocks other MFE loads
- User has no control

## Solution: Layered Error Handling

### Layer 1: Shell-level Bootstrap Errors

```typescript
// shell/src/shell.ts
async function bootstrap() {
  try {
    // Critical failures = full page error
    await tokenManager.initialize();
    setupAuthBridge();

    const manifest = await fetchManifestWithRetry();
    if (!manifest) {
      renderCriticalError("Unable to load application manifest");
      return;
    }

    // Load MFEs with graceful failure
    await loadMFEsGracefully(manifest);
  } catch (error) {
    // Only truly critical errors reach here
    renderCriticalError("Application failed to start", error);
  }
}

function renderCriticalError(message: string, error?: Error) {
  document.getElementById("app")!.innerHTML = `
    <div class="critical-error">
      <h1>Something went wrong</h1>
      <p>${message}</p>
      <button onclick="location.reload()">Reload</button>
      <details>
        <summary>Technical Details</summary>
        <pre>${error?.stack || "Unknown error"}</pre>
      </details>
    </div>
  `;

  // Report to error tracking
  reportError("critical-bootstrap-failure", error);
}
```

### Layer 2: Slot-level Error Boundaries

```typescript
// shell/src/mfe-loader.ts
async function loadMFEIntoSlot(mfeConfig: MFEConfig, slotId: string) {
  const slot = document.getElementById(slotId);
  if (!slot) return;

  try {
    // Show loading state
    renderSlotLoading(slot);

    // Attempt to load MFE
    const module = await loadRemoteModule(mfeConfig, {
      timeout: 10000, // 10 second timeout
      retries: 2, // Retry twice
    });

    // Mount MFE
    module.mount(slot);

    // Report success
    reportMFELoaded(mfeConfig.name);
  } catch (error) {
    // Render slot-specific fallback
    renderSlotError(slot, mfeConfig, error);

    // Report to error tracking
    reportError(`mfe-load-failure-${mfeConfig.name}`, error);

    // Notify other MFEs
    window.dispatchEvent(
      new CustomEvent("mfe:load:failed", {
        detail: { name: mfeConfig.name, slot: slotId, error },
      }),
    );
  }
}

function renderSlotError(slot: HTMLElement, mfe: MFEConfig, error: Error) {
  slot.innerHTML = `
    <div class="mfe-error" data-mfe="${mfe.name}">
      <div class="mfe-error-icon">⚠️</div>
      <div class="mfe-error-message">
        ${
          mfe.type === "chrome"
            ? `${mfe.name} temporarily unavailable`
            : "Feature temporarily unavailable"
        }
      </div>
      <button onclick="retryMFE('${mfe.name}', '${slot.id}')">
        Try Again
      </button>
    </div>
  `;
}

// Retry function exposed globally
(window as any).retryMFE = async (mfeName: string, slotId: string) => {
  const mfeConfig = findMFEConfig(mfeName);
  if (mfeConfig) {
    await loadMFEIntoSlot(mfeConfig, slotId);
  }
};
```

### Layer 3: Runtime Error Boundaries (Inside MFEs)

```typescript
// mfe-widget/src/App.tsx
import { ErrorBoundary } from 'react-error-boundary';

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={WidgetErrorFallback}
      onError={(error, info) => {
        // Report but don't crash whole page
        window.__MFE_ERROR__?.report({
          mfe: 'mfe-widget',
          error,
          info,
        });
      }}
      onReset={() => {
        // Reset MFE state
        window.location.reload();
      }}
    >
      <BrowserRouter basename="/widgets">
        <Routes>
          <Route path="/" element={<WidgetList />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function WidgetErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="widget-error">
      <h2>Widget encountered an error</h2>
      <details>
        <summary>Error details</summary>
        <pre>{error.message}</pre>
      </details>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  );
}
```

### Layer 4: Auth Failure Handling

```typescript
// shell/src/auth-bridge.ts
setupAuthBridge = () => {
  window.__MFE_AUTH__ = {
    version: "1.0.0",
    getToken: () => tokenManager.getAccessToken(),

    // Handle refresh failure gracefully
    onTokenRefreshFailed: (callback) => {
      tokenManager.on("refresh:failed", callback);
    },
  };

  // Global auth failure handler
  tokenManager.on("refresh:failed", async (error) => {
    // Try one more time with exponential backoff
    const retrySuccess = await tokenManager.refreshWithBackoff();

    if (!retrySuccess) {
      // Logout gracefully
      await tokenManager.clearSession();

      // Redirect to login with return URL
      const returnUrl = window.location.pathname;
      window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  });
};
```

### Layer 5: Manifest Fetch with Retry

```typescript
async function fetchManifestWithRetry(retries = 3): Promise<Manifest | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`/manifest-${ENV}.json`, {
        cache: "no-cache",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === retries - 1) {
        // Last attempt failed, try cached version
        return await loadCachedManifest();
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  return null;
}

async function loadCachedManifest(): Promise<Manifest | null> {
  try {
    const cached = localStorage.getItem("mfe-manifest-cache");
    if (cached) {
      const { manifest, timestamp } = JSON.parse(cached);
      // Use cache if less than 24 hours old
      if (Date.now() - timestamp < 86400000) {
        console.warn("Using cached manifest");
        return manifest;
      }
    }
  } catch {}
  return null;
}
```

## Failure Scenarios & Behaviors

### Scenario 1: Header MFE fails to load

```
User Experience:
- Shell loads successfully
- Header slot shows: "Header temporarily unavailable [Try Again]"
- Sidebar, footer, main content ALL work normally
- User can navigate via sidebar
- Retry button attempts to reload header

Technical:
- Error reported to monitoring
- Event dispatched: mfe:load:failed
- Other MFEs can subscribe and react
```

### Scenario 2: Feature MFE crashes at runtime

```
User Experience:
- Chrome MFEs (header, sidebar) continue working
- Main content area shows: "Widget encountered an error [Try Again]"
- User can navigate to other pages
- Reset button reloads the specific MFE

Technical:
- React Error Boundary catches the error
- Component tree replaced with fallback
- Auth state preserved
- Navigation still functional
```

### Scenario 3: Auth refresh fails

```
User Experience:
- Attempt automatic retry with backoff
- If all retries fail:
  - Clear local session
  - Redirect to /login?returnUrl=/current-page
  - After login, return to original page

Technical:
- tokenManager emits 'refresh:failed' event
- Shell listens and handles gracefully
- No infinite refresh loops
- Session cleaned up properly
```

### Scenario 4: Manifest fetch fails

```
User Experience:
- Try 3 times with exponential backoff
- If all fail, try cached manifest (< 24 hours old)
- If no cache, show critical error page with retry

Technical:
- Cached manifest stored in localStorage
- Cache invalidated after 24 hours
- Falls back to critical error page
```

### Scenario 5: MFE version mismatch (React 18 vs 19)

```
User Experience:
- MFE fails to mount
- Slot shows error with technical details
- Chrome MFEs continue working

Technical:
- Module Federation logs version mismatch
- Error boundary catches mount failure
- Report includes version info for debugging
```

## Consequences

### Positive

- **Resilient app**: One broken MFE doesn't break everything
- **Better UX**: Users see helpful errors, can retry
- **Debugging**: Errors reported with context
- **Progressive degradation**: Core functionality survives failures
- **Industry standard**: Matches Spotify, Zalando patterns

### Negative

- **More complex code**: Multiple error boundaries needed
- **Testing complexity**: Must test failure scenarios
- **Additional bundle size**: Error boundary code in every MFE
- **False confidence**: Silent failures may hide bugs

### Neutral

- Requires error monitoring service (Sentry, DataDog, etc.)
- Requires standardized error reporting API
- MFE developers must handle their own errors

## Error Contract

### Global Error API

```typescript
window.__MFE_ERROR__ = {
  version: '1.0.0';

  // Report an error
  report(error: MFEError): void;

  // Subscribe to errors
  onError(callback: (error: MFEError) => void): () => void;
};

interface MFEError {
  mfe: string;              // MFE name
  slot?: string;            // Which slot
  type: 'load' | 'runtime' | 'auth' | 'network';
  error: Error;
  info?: unknown;           // React error info, etc.
  timestamp: number;
}
```

### Error Events

```typescript
// MFE load failed
window.dispatchEvent(
  new CustomEvent("mfe:load:failed", {
    detail: { name, slot, error },
  }),
);

// MFE runtime error
window.dispatchEvent(
  new CustomEvent("mfe:runtime:error", {
    detail: { name, error, info },
  }),
);

// MFE loaded successfully
window.dispatchEvent(
  new CustomEvent("mfe:loaded", {
    detail: { name, slot },
  }),
);
```

## Trade-offs

We accepted **increased complexity** in exchange for:

- **Resilience**: App survives partial failures
- **Better UX**: Graceful degradation instead of white screens
- **Maintainability**: Clear error boundaries
- **Observability**: Structured error reporting
