## ADDED Requirements

### Requirement: Type-Safe Event Emission Helper

The system SHALL provide emitMFEEvent function enforcing event name and payload types.

#### Scenario: Emit event with correct payload type

- **WHEN** code calls emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { userId: '123', email: 'user@example.com' })
- **THEN** TypeScript validates payload matches AuthLoginPayload type
- **AND** event is emitted successfully

#### Scenario: Compile error on wrong payload type

- **WHEN** code calls emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { wrongKey: 'value' })
- **THEN** TypeScript compiler shows error
- **AND** error indicates missing required fields

#### Scenario: Emit event with no payload

- **WHEN** code calls emitMFEEvent(MFE_EVENTS.AUTH_SESSION_EXPIRED)
- **THEN** no payload parameter required
- **AND** event emitted with undefined detail

---

### Requirement: Type-Safe Event Subscription Helper

The system SHALL provide onMFEEvent function with inferred payload types.

#### Scenario: Subscribe with inferred payload type

- **WHEN** code calls onMFEEvent(MFE_EVENTS.AUTH_LOGIN, (data) => { ... })
- **THEN** TypeScript infers data type as AuthLoginPayload
- **AND** data.userId and data.email are accessible with autocomplete

#### Scenario: Cleanup function returned

- **WHEN** cleanup = onMFEEvent(...)
- **THEN** cleanup is callable function
- **AND** calling cleanup removes listener

---

### Requirement: Generic Event Bus Methods Support Any Event

The system SHALL allow emitting custom events not in catalog.

#### Scenario: Emit custom event not in catalog

- **WHEN** code calls eventBus.emit('custom:event', { custom: 'data' })
- **THEN** event is emitted successfully
- **AND** listeners receive payload

#### Scenario: Subscribe to custom event

- **WHEN** code calls eventBus.on('custom:event', handler)
- **THEN** handler is registered
- **AND** receives payload when custom event emitted

---

### Requirement: Type Safety Does Not Break JavaScript Usage

The system SHALL allow JavaScript projects to use event bus without TypeScript.

#### Scenario: JavaScript imports work without types

- **WHEN** JavaScript file imports eventBus
- **THEN** emit and on methods work normally
- **AND** no TypeScript errors (library compiles to plain JS)
