/**
 * EventBus - Native EventTarget-based event bus for cross-MFE communication
 * 
 * Uses browser's native CustomEvent and EventTarget APIs for zero-dependency,
 * type-safe event emission and subscription across micro-frontends.
 */
export class EventBus extends EventTarget {
  /**
   * Emit an event to all listeners
   * 
   * @param eventName - Name of the event to emit
   * @param data - Optional payload data
   * 
   * @example
   * eventBus.emit('mfe:auth:logout', { userId: '123' });
   */
  emit<T = any>(eventName: string, data?: T): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  /**
   * Subscribe to an event
   * Returns cleanup function to unsubscribe
   * 
   * @param eventName - Name of the event to listen for
   * @param handler - Callback function receiving event data
   * @returns Cleanup function to remove listener
   * 
   * @example
   * const cleanup = eventBus.on('mfe:auth:logout', (data) => {
   *   console.log('User logged out:', data.userId);
   * });
   * // Later: cleanup();
   */
  on<T = any>(
    eventName: string,
    handler: (data: T) => void
  ): () => void {
    const listener = (event: Event) => {
      handler((event as CustomEvent<T>).detail);
    };

    this.addEventListener(eventName, listener);

    // Return cleanup function
    return () => this.removeEventListener(eventName, listener);
  }

  /**
   * Subscribe to an event that fires only once
   * Listener is automatically removed after first invocation
   * 
   * @param eventName - Name of the event to listen for
   * @param handler - Callback function receiving event data
   * 
   * @example
   * eventBus.once('app:ready', () => {
   *   console.log('App initialized');
   * });
   */
  once<T = any>(
    eventName: string,
    handler: (data: T) => void
  ): void {
    const listener = (event: Event) => {
      handler((event as CustomEvent<T>).detail);
    };

    this.addEventListener(eventName, listener, { once: true });
  }
}

// Singleton instance shared across shell and all MFEs
export const eventBus = new EventBus();
