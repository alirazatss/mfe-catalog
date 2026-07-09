## Why

Micro-frontends need a lightweight, type-safe way to communicate without tight coupling. Currently, navigation events use CustomEvent directly, but there's no standardized event bus or naming convention. MFEs need to emit and listen for events (logout, session expiry, errors) without knowing about each other's implementation, using native browser APIs instead of external libraries.

## What Changes

- **Event Bus Package**: Create `@mf-mono/events` package with native ES6 EventTarget-based event bus
- **Standard Event Names**: Define naming convention and event catalog for auth, navigation, and errors
- **Type-Safe Helpers**: Provide TypeScript-typed event emission and subscription functions
- **Memory Leak Prevention**: Ensure cleanup functions prevent listener leaks in React components
- **Zero Dependencies**: Use native browser APIs only (CustomEvent, EventTarget)

## Capabilities

### New Capabilities

- `event-bus-infrastructure`: Native EventTarget-based singleton event bus with type-safe emit/on/once methods
- `event-naming-convention`: Standard event naming pattern (mfe:domain:action) and event catalog
- `typed-event-helpers`: TypeScript helpers ensuring compile-time safety for event payloads

### Modified Capabilities

- `cross-mfe-navigation`: Formalize existing navigation events to use standard event bus package

## Impact

**Affected Code**:

- `apps/website/src/utils/navigation.ts` — Use event bus package instead of direct CustomEvent
- `apps/website/src/components/NavigationEventListener.tsx` — Use event bus subscription
- `apps/mfe-widget/src/utils/navigation.ts` — Use event bus package

**New Files**:

- `packages/events/` — New package for event bus
- `packages/events/src/EventBus.ts` — Native EventTarget wrapper class
- `packages/events/src/eventTypes.ts` — Standard event names and payload types
- `packages/events/src/index.ts` — Public API exports

**Infrastructure**:

- No backend changes required
- No deployment changes required

**Breaking Changes**:

- **BREAKING**: Existing navigation event listeners must migrate to event bus package (simple find/replace)
