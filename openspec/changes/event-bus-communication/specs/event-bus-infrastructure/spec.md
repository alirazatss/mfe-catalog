## ADDED Requirements

### Requirement: Event Bus Singleton

The system SHALL provide a singleton EventBus instance shared across shell and all MFEs.

#### Scenario: Single event bus instance shared

- **WHEN** shell imports eventBus from @mf-mono/events
- **AND** MFE imports eventBus from @mf-mono/events
- **THEN** both receive the same instance (reference equality)
- **AND** events emitted by shell are received by MFE listeners

#### Scenario: Event bus extends native EventTarget

- **WHEN** eventBus is created
- **THEN** it extends native browser EventTarget class
- **AND** uses CustomEvent for all events
- **AND** has zero external dependencies

---

### Requirement: Event Emission

The system SHALL allow emitting events with optional typed payloads.

#### Scenario: Emit event with payload

- **WHEN** code calls eventBus.emit('mfe:auth:logout', { userId: '123' })
- **THEN** event is dispatched using CustomEvent
- **AND** payload is available in event.detail

#### Scenario: Emit event without payload

- **WHEN** code calls eventBus.emit('mfe:auth:session-expired')
- **THEN** event is dispatched with detail as undefined

---

### Requirement: Event Subscription

The system SHALL allow subscribing to events with cleanup function returned.

#### Scenario: Subscribe to event

- **WHEN** code calls cleanup = eventBus.on('mfe:auth:logout', handler)
- **THEN** handler is invoked when event emitted
- **AND** handler receives payload as first argument
- **AND** cleanup function is returned

#### Scenario: Unsubscribe using cleanup function

- **WHEN** cleanup function is called
- **THEN** handler is removed
- **AND** handler no longer invoked on future events

#### Scenario: Multiple listeners for same event

- **WHEN** multiple handlers subscribe to same event name
- **THEN** all handlers are invoked when event emitted
- **AND** handlers execute in registration order

---

### Requirement: One-Time Event Subscription

The system SHALL support listening to events that fire only once.

#### Scenario: Once listener fires only one time

- **WHEN** code calls eventBus.once('app:ready', handler)
- **AND** event 'app:ready' is emitted
- **THEN** handler is invoked
- **AND** handler is automatically removed after first invocation

#### Scenario: Once listener not invoked on subsequent emissions

- **WHEN** once listener has already fired
- **AND** same event is emitted again
- **THEN** handler is not invoked second time

---

### Requirement: Type-Safe Event Helpers

The system SHALL provide TypeScript helpers enforcing event payload types.

#### Scenario: Type-safe event emission

- **WHEN** code calls emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, { userId: '123' })
- **THEN** TypeScript enforces payload shape matches AuthLogoutPayload type
- **AND** incorrect payload shape causes compile error

#### Scenario: Type-safe event subscription

- **WHEN** code calls onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, (data) => ...)
- **THEN** TypeScript infers data type as AuthLogoutPayload
- **AND** data.userId is known to be string at compile time

---

### Requirement: Memory Leak Prevention in React

The system SHALL ensure event listeners are cleaned up to prevent memory leaks.

#### Scenario: Cleanup function used in useEffect

- **WHEN** React component subscribes to event in useEffect
- **AND** cleanup function returned from useEffect
- **THEN** listener is removed when component unmounts
- **AND** no memory leak occurs

#### Scenario: Multiple subscriptions in single component

- **WHEN** component subscribes to multiple events
- **AND** each cleanup function is called on unmount
- **THEN** all listeners are removed
- **AND** no listeners remain after unmount
