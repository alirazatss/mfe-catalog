import { eventBus } from './EventBus';
import { MFE_EVENTS, type MFEEventMap } from './eventTypes';

/**
 * Type-safe event emission helper
 * Enforces event name and payload type matching at compile time
 * 
 * @param eventName - Event name from MFE_EVENTS constant
 * @param data - Payload data matching the event's expected type
 * 
 * @example
 * // TypeScript ensures payload matches AuthLoginPayload
 * emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { userId: '123', email: 'user@example.com' });
 * 
 * // Compile error: missing required fields
 * emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { wrongKey: 'value' });
 */
export function emitMFEEvent<K extends keyof MFEEventMap>(
  eventName: K,
  ...args: MFEEventMap[K] extends undefined ? [] : [MFEEventMap[K]]
): void {
  const data = args[0];
  eventBus.emit(eventName, data);
}

/**
 * Type-safe event subscription helper
 * Automatically infers payload type based on event name
 * 
 * @param eventName - Event name from MFE_EVENTS constant
 * @param handler - Callback receiving typed payload
 * @returns Cleanup function to remove listener
 * 
 * @example
 * const cleanup = onMFEEvent(MFE_EVENTS.AUTH_LOGIN, (data) => {
 *   // TypeScript knows data is { userId: string; email: string }
 *   console.log('User logged in:', data.userId, data.email);
 * });
 * 
 * // Later: cleanup to prevent memory leaks
 * cleanup();
 */
export function onMFEEvent<K extends keyof MFEEventMap>(
  eventName: K,
  handler: (data: MFEEventMap[K]) => void
): () => void {
  return eventBus.on(eventName, handler);
}

// Re-export for convenience
export { eventBus, MFE_EVENTS, type MFEEventMap };
