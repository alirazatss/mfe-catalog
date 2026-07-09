## Context

Micro-frontends need to communicate without tight coupling. Currently, navigation uses direct `window.dispatchEvent(new CustomEvent(...))` calls with no standardization. As we add auth events, error events, and future features, we need a consistent, type-safe event system.

**Current State**:
- Navigation events use CustomEvent directly
- No standard event naming convention
- No type safety for event payloads
- Risk of memory leaks if cleanup not handled properly

**Constraints**:
- Must use native browser APIs only (zero dependencies)
- Must work across Module Federation boundaries
- Must be type-safe in TypeScript but work in JavaScript
- Must prevent memory leaks in React components

**Stakeholders**:
- Frontend developers implementing MFEs
- Shell developers coordinating cross-MFE communication

---

## Goals / Non-Goals

**Goals:**
- Create lightweight event bus using native EventTarget
- Define standard event naming convention (mfe:domain:action)
- Provide type-safe helpers for emit/subscribe
- Document all standard events in catalog
- Ensure cleanup functions prevent memory leaks
- Zero external dependencies

**Non-Goals:**
- Complex pub/sub features (channels, wildcards, priorities)
- Event replay or history
- Persistent event storage
- Event middleware or interceptors

---

## Decisions

### Decision 1: Use Native EventTarget Class

**Choice**: Extend native `EventTarget` class instead of custom implementation.

**Rationale**:
- ✅ Native browser API, zero dependencies
- ✅ Proven performance and reliability
- ✅ Built-in features: `once`, `addEventListener`, `removeEventListener`
- ✅ ~100 bytes of wrapper code vs 500+ bytes for libraries

**Alternatives Considered**:
- ❌ **mitt library**: 500 bytes, adds dependency
- ❌ **Custom implementation**: Reinvents the wheel

**Trade-off**: EventTarget doesn't have `off()` to remove all listeners for an event, but we don't need this feature.

---

### Decision 2: Singleton Pattern (Same as tokenManager)

**Choice**: Export singleton instance, not class constructor.

**Rationale**:
- ✅ Consistent with `tokenManager` pattern
- ✅ Ensures all code uses same event bus instance
- ✅ Simpler API: `eventBus.emit()` vs `new EventBus().emit()`

**Pattern**:
```typescript
export const eventBus = new EventBus();
```

**Alternatives Considered**:
- ❌ **Export class**: Users could create multiple instances (defeats purpose)
- ❌ **Window property**: Pollutes global namespace

---

### Decision 3: Event Naming Convention `mfe:domain:action`

**Choice**: Use pattern `mfe:domain:action` for all event names.

**Rationale**:
- ✅ Clear prefix prevents collision with browser events
- ✅ Domain groups related events (auth, cart, error)
- ✅ Action describes what happened (login, logout, failed)
- ✅ Easy to filter in DevTools

**Examples**:
- `mfe:auth:login`
- `mfe:auth:logout`
- `mfe:navigate`
- `mfe:error:api-failed`

**Alternatives Considered**:
- ❌ **No prefix**: Could collide with browser events
- ❌ **Dot notation**: Less common in browser events

---

### Decision 4: Constants Object for Event Names

**Choice**: Define `MFE_EVENTS` object with all standard event names.

**Rationale**:
- ✅ Prevents typos (autocomplete in IDE)
- ✅ Single source of truth for event catalog
- ✅ Easy to discover what events exist

**Pattern**:
```typescript
export const MFE_EVENTS = {
  AUTH_LOGIN: 'mfe:auth:login',
  AUTH_LOGOUT: 'mfe:auth:logout',
  // ...
} as const;
```

**Alternatives Considered**:
- ❌ **Magic strings**: Typo-prone, hard to discover

---

### Decision 5: Type-Safe Helpers with Generics

**Choice**: Provide `emitMFEEvent` and `onMFEEvent` with TypeScript generics.

**Rationale**:
- ✅ Compile-time safety for event payloads
- ✅ Autocomplete for event data
- ✅ Doesn't break JavaScript usage (compiles to plain JS)

**Pattern**:
```typescript
interface MFEEventMap {
  'mfe:auth:login': { userId: string; email: string };
  'mfe:auth:logout': { userId?: string };
}

export function emitMFEEvent<K extends keyof MFEEventMap>(
  name: K,
  data: MFEEventMap[K]
) { ... }
```

**Alternatives Considered**:
- ❌ **No type helpers**: Users would cast manually
- ❌ **Separate emit functions**: `emitAuthLogin()`, `emitAuthLogout()` (verbose, not scalable)

---

### Decision 6: Return Cleanup Function (React-Friendly)

**Choice**: `on()` returns cleanup function instead of event bus instance.

**Rationale**:
- ✅ Perfect for React `useEffect` cleanup
- ✅ Prevents memory leaks
- ✅ Clear ownership: caller responsible for cleanup

**Pattern**:
```typescript
useEffect(() => {
  const cleanup = eventBus.on('mfe:auth:logout', handler);
  return cleanup; // Called on unmount
}, []);
```

**Alternatives Considered**:
- ❌ **Method chaining**: `eventBus.on(...).off()` harder to use in React
- ❌ **Manual cleanup**: `eventBus.off(name, handler)` error-prone

---

## Risks / Trade-offs

### Risk 1: Event Names Could Collide
**Risk**: Two MFEs emit events with same name but different payloads.  
**Mitigation**: 
- Document naming convention clearly
- Use domain prefix (mfe:widget:action vs mfe:cart:action)
- Review event names in PR process

### Risk 2: Memory Leaks if Cleanup Ignored
**Risk**: Developer forgets to return cleanup function from useEffect.  
**Mitigation**:
- Document pattern in examples
- ESLint rule could check useEffect cleanup (future)
- Code review catches missing cleanup

### Risk 3: Type Safety Only at Compile Time
**Risk**: JavaScript code can emit wrong payload shape.  
**Mitigation**:
- Encourage TypeScript usage
- Runtime validation not needed (internal events, not external API)
- Accept this trade-off for zero-dependency approach

### Risk 4: No Event History/Replay
**Risk**: If MFE mounts after event fired, it misses event.  
**Mitigation**:
- Events are notifications, not state
- For state, use backend as source of truth
- If needed, MFE can query current state on mount

---

## Migration Plan

### Phase 1: Create Event Bus Package
1. Create `packages/events/` with EventBus class
2. Define standard event names
3. Create type-safe helpers
4. Write unit tests

### Phase 2: Migrate Existing Navigation Events
1. Update `apps/website/src/utils/navigation.ts` to use event bus
2. Update `apps/mfe-widget/src/utils/navigation.ts`
3. Update NavigationEventListener component
4. Test navigation still works

### Phase 3: Add Auth Events
1. Emit auth events from AuthProvider
2. Listen for session-expired event in shell
3. Test logout flow

### Phase 4: Documentation
1. Document event bus API
2. Document standard event catalog
3. Add React usage examples
4. Add memory leak prevention guide

**Rollback Strategy**: Event bus is additive, doesn't break existing code. Can migrate incrementally.

---

## Open Questions

1. **Should we add event namespacing per MFE?**
   - **Decision**: No, events are global by design. Domain prefix is sufficient.

2. **Should we log events in dev mode?**
   - **Recommendation**: Yes, add optional debug flag to log all events.

3. **Should we validate event payloads at runtime?**
   - **Decision**: No, adds complexity and bundle size. Trust TypeScript at compile time.
