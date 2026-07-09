# cross-mfe-navigation Specification

## Purpose

TBD - created by archiving change mfe-hybrid-routing. Update Purpose after archive.

## Requirements

### Requirement: MFEs SHALL emit navigation events for cross-MFE routing

Micro-frontends SHALL use custom events to request navigation to routes outside their own namespace.

#### Scenario: MFE emits navigation event to another MFE

- **GIVEN** user is in mfe-products at `/products/123`
- **AND** user clicks "Add to Cart" button
- **WHEN** mfe-products handles button click
- **THEN** mfe-products SHALL dispatch custom event `mfe:navigate`
- **AND** event detail SHALL include `{ path: "/checkout/cart" }`
- **AND** mfe-products SHALL NOT navigate directly

#### Scenario: Navigation event includes path only

- **GIVEN** mfe-products wants to navigate to checkout
- **WHEN** emitting navigation event
- **THEN** event SHALL use type `"mfe:navigate"`
- **AND** event detail SHALL be `{ path: "/checkout/cart" }`
- **AND** SHALL NOT include MFE name or other metadata

#### Scenario: MFE emits event with query parameters

- **GIVEN** mfe-products wants to navigate to `/checkout/cart?productId=123&qty=2`
- **WHEN** emitting navigation event
- **THEN** event detail SHALL include full path with query string
- **AND** event SHALL be `{ path: "/checkout/cart?productId=123&qty=2" }`

---

### Requirement: Shell SHALL listen for navigation events and route

The shell application SHALL listen for MFE navigation events and handle routing.

#### Scenario: Shell receives navigation event and routes

- **GIVEN** shell has event listener for `mfe:navigate`
- **WHEN** mfe-products dispatches event with `{ path: "/checkout/cart" }`
- **THEN** shell SHALL receive the event
- **AND** SHALL call router.navigate("/checkout/cart")
- **AND** SHALL load mfe-checkout
- **AND** URL SHALL change to `/checkout/cart`

#### Scenario: Shell listener registered before MFEs load

- **GIVEN** shell is initializing
- **WHEN** shell root component mounts
- **THEN** shell SHALL register `mfe:navigate` event listener
- **AND** listener SHALL be active before any MFE loads
- **AND** all MFE events SHALL be caught

#### Scenario: Shell cleans up listener on unmount

- **GIVEN** shell has registered `mfe:navigate` listener
- **WHEN** shell component unmounts (e.g., during testing)
- **THEN** shell SHALL remove event listener
- **AND** SHALL prevent memory leaks

---

### Requirement: MFEs SHALL NOT import shell router

Micro-frontends SHALL remain decoupled from the shell's routing implementation.

#### Scenario: MFE navigates without router dependency

- **GIVEN** mfe-products wants to navigate to checkout
- **WHEN** implementing navigation logic
- **THEN** mfe-products SHALL NOT import shell's router
- **AND** SHALL NOT import React Router from shell
- **AND** SHALL only use custom event dispatch

#### Scenario: MFE works with different shell routers

- **GIVEN** shell uses React Router v6
- **WHEN** shell is later migrated to React Router v7 or different router
- **THEN** mfe-products SHALL NOT require code changes
- **AND** navigation events SHALL still work
- **AND** MFE SHALL remain compatible

---

### Requirement: Cross-MFE navigation SHALL preserve history

Navigation between micro-frontends SHALL correctly update browser history.

#### Scenario: Navigation adds history entry

- **GIVEN** user is at `/products/123`
- **WHEN** mfe-products emits event to navigate to `/checkout/cart`
- **AND** shell routes to `/checkout/cart`
- **THEN** browser history SHALL add new entry
- **AND** back button SHALL return to `/products/123`

#### Scenario: History state is maintained

- **GIVEN** navigation from `/products/123` → `/checkout/cart` → `/checkout/payment`
- **WHEN** user clicks back button
- **THEN** browser SHALL navigate to `/checkout/cart`
- **AND** SHALL NOT skip intermediate states

---

### Requirement: Navigation events SHALL be framework-agnostic

The event-based navigation system SHALL work regardless of MFE framework.

#### Scenario: React MFE emits navigation event

- **GIVEN** mfe-products is built with React
- **WHEN** dispatching navigation event
- **THEN** event SHALL use standard browser CustomEvent API
- **AND** SHALL work correctly

#### Scenario: Vue MFE emits navigation event

- **GIVEN** mfe-analytics is built with Vue
- **WHEN** dispatching navigation event
- **THEN** event SHALL use same CustomEvent API
- **AND** shell SHALL handle it identically to React MFE events

#### Scenario: Vanilla JS MFE emits navigation event

- **GIVEN** mfe-custom is built with vanilla JavaScript
- **WHEN** dispatching navigation event
- **THEN** event SHALL use standard DOM API
- **AND** SHALL work without framework dependencies

---

### Requirement: Shell SHALL validate navigation targets

The shell SHALL validate navigation event paths before routing.

#### Scenario: Valid internal path allowed

- **GIVEN** navigation event with `{ path: "/checkout/cart" }`
- **AND** `/checkout/*` is a valid shell route
- **WHEN** shell receives event
- **THEN** shell SHALL validate path is internal
- **AND** SHALL allow navigation
- **AND** SHALL route to `/checkout/cart`

#### Scenario: External URL rejected

- **GIVEN** navigation event with `{ path: "https://evil.com/phishing" }`
- **WHEN** shell receives event
- **THEN** shell SHALL detect external URL
- **AND** SHALL reject navigation
- **AND** SHALL log security warning
- **AND** SHALL NOT navigate

#### Scenario: Invalid internal path handled gracefully

- **GIVEN** navigation event with `{ path: "/invalid-route" }`
- **AND** no route matches `/invalid-route`
- **WHEN** shell receives event
- **THEN** shell SHALL attempt navigation
- **AND** router SHALL render 404 page
- **AND** application SHALL NOT crash

---

### Requirement: MFEs SHALL provide navigation helper utilities

A shared utility function SHALL simplify emitting navigation events.

#### Scenario: MFE uses navigateTo helper

- **GIVEN** utility function `navigateTo(path)` is available
- **WHEN** mfe-products calls `navigateTo("/checkout/cart")`
- **THEN** helper SHALL dispatch `mfe:navigate` event
- **AND** SHALL set event detail to `{ path: "/checkout/cart" }`
- **AND** MFE SHALL NOT need to know event structure

#### Scenario: Helper validates path format

- **GIVEN** MFE calls `navigateTo("/checkout")`
- **WHEN** helper processes path
- **THEN** helper SHALL ensure path starts with `/`
- **AND** SHALL normalize path format
- **AND** SHALL dispatch correctly formatted event

#### Scenario: Helper supports query parameters

- **GIVEN** MFE calls `navigateTo("/checkout/cart", { productId: 123, qty: 2 })`
- **WHEN** helper processes request
- **THEN** helper SHALL build query string `?productId=123&qty=2`
- **AND** SHALL dispatch event with `{ path: "/checkout/cart?productId=123&qty=2" }`

---

### Requirement: Navigation events SHALL support state passing

MFEs SHALL be able to pass state along with navigation requests.

#### Scenario: MFE navigates with state data

- **GIVEN** mfe-products wants to pass product data to checkout
- **WHEN** mfe-products calls `navigateTo("/checkout/cart", { state: { productId: 123, name: "Widget" } })`
- **THEN** event SHALL include state in detail
- **AND** shell SHALL pass state to router
- **AND** mfe-checkout SHALL have access to state via router location

#### Scenario: State preserved during navigation

- **GIVEN** navigation event includes state `{ productId: 123 }`
- **WHEN** shell routes to `/checkout/cart`
- **THEN** shell SHALL preserve state in router location
- **AND** mfe-checkout SHALL read state from `location.state`

---

### Requirement: Cross-MFE navigation SHALL support programmatic and user-initiated flows

Navigation SHALL work for both user clicks and programmatic triggers.

#### Scenario: User clicks link in MFE

- **GIVEN** mfe-products renders link "View Cart"
- **WHEN** user clicks link
- **THEN** click handler SHALL emit navigation event
- **AND** shell SHALL route to `/checkout/cart`

#### Scenario: MFE navigates programmatically after async operation

- **GIVEN** user submits product form in mfe-products
- **WHEN** API call succeeds
- **THEN** mfe-products SHALL emit navigation event to `/products/list`
- **AND** shell SHALL route to product list

#### Scenario: MFE navigates on error condition

- **GIVEN** mfe-checkout payment fails
- **WHEN** error occurs
- **THEN** mfe-checkout SHALL emit event to `/checkout/payment-failed`
- **AND** shell SHALL route to error page

---

### Requirement: Navigation events SHALL be logged in development

Development mode SHALL log all navigation events for debugging.

#### Scenario: Dev mode logs navigation events

- **GIVEN** application is running in development mode
- **WHEN** mfe-products emits navigation event
- **THEN** console SHALL log `[Navigation] mfe:navigate → /checkout/cart`
- **AND** log SHALL include timestamp and source

#### Scenario: Production mode does not log events

- **GIVEN** application is running in production mode
- **WHEN** navigation events occur
- **THEN** console SHALL NOT log events
- **AND** performance SHALL not be impacted by logging

---

### Requirement: MFEs SHALL handle navigation failure gracefully

If navigation fails, the MFE SHALL remain functional.

#### Scenario: Navigation event dispatched but not handled

- **GIVEN** MFE emits navigation event
- **AND** shell listener is somehow not registered
- **WHEN** event is dispatched
- **THEN** event SHALL be ignored (no error thrown)
- **AND** MFE SHALL remain functional
- **AND** user stays on current page

#### Scenario: Shell rejects invalid navigation

- **GIVEN** MFE emits event with invalid path
- **AND** shell rejects navigation
- **WHEN** rejection occurs
- **THEN** MFE SHALL NOT be notified of rejection
- **AND** MFE SHALL continue normal operation
- **AND** user stays on current page
