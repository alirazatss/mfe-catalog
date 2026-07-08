import type { LoaderEventType, LoaderEventListener, LoaderEventData } from "./types.js";

/**
 * Simple event emitter for loader lifecycle events
 */
export class LoaderEvents {
  private listeners = new Map<LoaderEventType, Set<LoaderEventListener<any>>>();

  /**
   * Register an event listener
   */
  on<T extends LoaderEventType>(event: T, listener: LoaderEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Remove an event listener
   */
  off<T extends LoaderEventType>(event: T, listener: LoaderEventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  emit<T extends LoaderEventType>(event: T, data: LoaderEventData[T]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  clear(event?: LoaderEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
