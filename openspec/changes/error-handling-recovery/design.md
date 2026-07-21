## Context

Micro-frontends introduce new failure modes: MFEs can fail to load from CDN, React components can error, API calls can fail. Currently, errors crash the entire app or show generic "Something went wrong" messages. Production apps need graceful error handling with recovery options.

**Current State**:

- Basic ErrorBoundary exists but no retry
- No handling for MFE lazy-load failures
- No standardized API error handling
- Errors cascade and break entire app

**Constraints**:

- Must not crash shell when MFE fails
- Must provide clear recovery paths for users
- Should integrate with error monitoring services (future)
- Must work across Module Federation boundaries

**Stakeholders**:

- End users experiencing errors
- Developers debugging production issues
- DevOps monitoring app health

---

## Goals / Non-Goals

**Goals:**

- Handle MFE load failures gracefully with fallback UI
- Provide retry functionality for transient errors
- Isolate errors to prevent cascading failures
- Emit error events for monitoring
- Show user-friendly error messages

**Non-Goals:**

- Full error monitoring platform (use existing: Sentry, LogRocket)
- Automatic error recovery AI
- Custom error analytics dashboard
- Error replay/reproduction tools

---

## Decisions

### Decision 1: Error Boundaries Per MFE Route

**Choice**: Wrap each lazy-loaded MFE in separate ErrorBoundary.

**Rationale**:

- ✅ Isolates MFE errors from shell
- ✅ Shell remains functional if MFE crashes
- ✅ Can show MFE-specific error messages

**Pattern**:

```tsx
<Route
  path="/widgets/*"
  element={
    <ErrorBoundary fallback={<MFEErrorFallback mfeName="widget" />}>
      <Suspense fallback={<LoadingSpinner />}>
        <WidgetMFE />
      </Suspense>
    </ErrorBoundary>
  }
/>
```

---

### Decision 2: Automatic Retry for Network Errors Only

**Choice**: Auto-retry on network failures, manual retry for other errors.

**Rationale**:

- ✅ Network errors often transient (poor connection)
- ✅ Other errors (404, 500) need investigation
- ✅ Prevents infinite retry loops

**Pattern**:

```typescript
if (error.code === "NETWORK_ERROR") {
  // Auto-retry with exponential backoff
} else {
  // Show error, user must manually retry
}
```

---

### Decision 3: Error Events for Monitoring

**Choice**: Emit error events using event bus, don't couple to specific monitoring tool.

**Rationale**:

- ✅ Decoupled from monitoring service
- ✅ Can add Sentry/LogRocket later
- ✅ Consistent with auth/navigation event pattern

---

### Decision 4: User-Friendly Messages, Technical Logs

**Choice**: Show friendly messages to users, log technical details to console/monitoring.

**Rationale**:

- ✅ Users don't care about ChunkLoadError details
- ✅ Developers need stack traces for debugging
- ✅ Separation of concerns

---

### Decision 5: No Automatic Recovery (User Initiated)

**Choice**: Provide retry button, don't auto-reload page.

**Rationale**:

- ✅ Gives user control
- ✅ Avoids jarring auto-reload experience
- ✅ User can save work before retry

**Trade-off**: Requires user action, but better UX than silent reload.

---

## Risks / Trade-offs

### Risk 1: Retry Could Cause Duplicate Actions

**Risk**: Auto-retrying POST request creates duplicate records.  
**Mitigation**: Only auto-retry idempotent methods (GET). POST requires manual retry.

### Risk 2: Error Boundary Doesn't Catch Async Errors

**Risk**: Errors in useEffect, event handlers not caught by boundary.  
**Mitigation**: Document proper error handling in async code. Use try/catch.

### Risk 3: Too Many Retries Waste Resources

**Risk**: Infinite retry loops on permanent failures.  
**Mitigation**: Max 3 retries with exponential backoff. After limit, stop.

### Risk 4: Error Messages Too Generic

**Risk**: "Something went wrong" doesn't help user.  
**Mitigation**: Contextualize errors: "Unable to load Widget Dashboard", not "Error occurred".

---

## Migration Plan

### Phase 1: Enhance Error Boundary

1. Add retry state to ErrorBoundary
2. Add retry button to fallback UI
3. Add retry count limiting
4. Test error catching and retry

### Phase 2: MFE Load Error Handling

1. Wrap each lazy MFE route in ErrorBoundary
2. Create MFEErrorFallback component
3. Test MFE load failure scenarios
4. Emit error events

### Phase 3: API Error Handling

1. Add retry logic to Axios interceptors
2. Implement exponential backoff
3. Add toast notifications for errors
4. Test network retry

### Phase 4: Error Reporting Integration

1. Create ErrorReporter utility
2. Listen for error events
3. Send to console in dev, monitoring in prod
4. Document integration with Sentry/LogRocket

---

## Open Questions

1. **Should we auto-reload page after multiple failures?**
   - **Decision**: No, let user decide when to reload

2. **Should we cache last working MFE version as fallback?**
   - **Decision**: Defer to v2, complex for first version

3. **Should we show degraded mode banner?**
   - **Decision**: Yes, inform users some features unavailable
