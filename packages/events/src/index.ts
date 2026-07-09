/**
 * @mf-mono/events
 * 
 * Native EventTarget-based event bus for cross-MFE communication
 * Zero dependencies, type-safe, memory-leak prevention
 */

export { EventBus, eventBus } from './EventBus';
export { MFE_EVENTS, type MFEEventMap } from './eventTypes';
export { emitMFEEvent, onMFEEvent } from './helpers';
