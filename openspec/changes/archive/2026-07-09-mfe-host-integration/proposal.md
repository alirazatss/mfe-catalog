## Why

With all components ready (discovery, generation, dynamic loader), we need to integrate the dynamic loader into the host application to replace hardcoded imports with runtime loading from the generated config.

## What Changes

- Update host to use dynamic loader instead of hardcoded imports
- Replace `import("remoteWidget/CounterWidget")` with `loader.loadRemote('mfe-widget')`
- Add event listeners for logging and debugging
- Update error boundaries with helpful messages
- Maintain fallback to static vite.config.ts for safety

## Capabilities

### Modified Capabilities

- `module-federation-host`: Update to load remotes via dynamic loader from generated config

## Impact

### Affected Code

- `apps/shells/website/package.json` - Add dynamic-loader dependency
- `apps/shells/website/src/config/remotes.ts` - Initialize and use DynamicLoader
- `apps/shells/website/src/RemoteWidgetLoader.ts` - Replace hardcoded imports
- `apps/shells/website/src/ErrorBoundary.ts` - Enhanced error messages

### Deployment Changes

- Host now loads remotes dynamically from generated config
- Can add new micro-frontends without rebuilding host
