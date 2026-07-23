/**
 * @mfe-runtine/events
 *
 * Native EventTarget-based event bus for cross-MFE communication
 * Zero dependencies, type-safe, memory-leak prevention
 */

export { EventBus, eventBus } from "./EventBus.js";
export { MFE_EVENTS, type MFEEventMap } from "./eventTypes.js";
export { emitMFEEvent, onMFEEvent } from "./helpers.js";
