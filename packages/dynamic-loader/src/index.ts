export { DynamicLoader } from "./DynamicLoader.js";
export { LoaderEvents } from "./events.js";
export { fetchConfig } from "./config.js";
export type {
  LoaderStatus,
  LoaderEventType,
  LoaderEventListener,
  LoaderEventData,
  Container,
} from "./types.js";
export type { FetchConfigOptions } from "./config.js";

// Export singleton instance
import { DynamicLoader } from "./DynamicLoader.js";
export const loader = new DynamicLoader();
export default loader;
