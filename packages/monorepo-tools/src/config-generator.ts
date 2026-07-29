import { validateRemoteConfig } from "@mfe-runtime/remote-config";
import type {
  MicroFrontend,
  RemoteConfig,
  ConfigGenerationOptions,
  FeatureMFEEntry,
} from "./types.js";

/**
 * Generate remote manifest (v2 — chrome + features shape) from discovered MFEs.
 *
 * By convention:
 * - Any MFE whose shortName ends with a chrome slot name (header, sidebar, footer)
 *   is placed under `chrome.<slot>`.
 * - All other MFEs are placed under `features["/<shortName>"]` as route-based
 *   feature MFEs. Consumers can further customize the manifest afterwards
 *   (e.g., adjust `requiredRoles`, `basePath`, `requiresAuth`).
 *
 * See:
 * - openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/spec.md
 * - docs/adr/0004-chrome-mfe-pattern.md
 */
export async function generateConfig(
  microFrontends: MicroFrontend[],
  options: ConfigGenerationOptions,
): Promise<RemoteConfig> {
  const { environment, gitHash, baseUrl } = options;
  const version = gitHash || "latest";

  const chrome: NonNullable<RemoteConfig["chrome"]> = {};
  const features: NonNullable<RemoteConfig["features"]> = {};

  for (const mfe of microFrontends) {
    const entryUrl =
      environment === "development"
        ? `http://localhost:${mfe.port}/remoteEntry.js`
        : `${baseUrl || ""}/mfe-${mfe.shortName}/v${version}/remoteEntry.js`;

    const slot = detectChromeSlot(mfe.shortName);
    if (slot) {
      chrome[slot] = {
        mfe: mfe.shortName,
        entryUrl,
        scope: mfe.scope,
        version: gitHash || mfe.version,
        enabled: true,
      };
    } else {
      const basePath = `/${stripMfePrefix(mfe.shortName)}`;
      const entry: FeatureMFEEntry = {
        mfe: mfe.shortName,
        entryUrl,
        scope: mfe.scope,
        version: gitHash || mfe.version,
        basePath,
        requiresAuth: false,
        requiredRoles: [],
        enabled: true,
      };
      features[basePath] = entry;
    }
  }

  const config: RemoteConfig = {
    $schema: "../node_modules/@mfe-runtime/remote-config/schema.json",
    schemaVersion: "2.0.0",
    chrome,
    features,
  };

  try {
    validateRemoteConfig(config);
  } catch (error) {
    throw new Error(
      `Generated config failed validation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return config;
}

const CHROME_SLOTS = ["header", "sidebar", "footer"] as const;

/**
 * If the MFE short name matches or ends with a chrome slot name, return it.
 * Examples:
 *   "mfe-header" -> "header"
 *   "header"     -> "header"
 *   "mfe-widget" -> null
 */
function detectChromeSlot(shortName: string): string | null {
  const normalized = stripMfePrefix(shortName);
  return (CHROME_SLOTS as readonly string[]).includes(normalized) ? normalized : null;
}

function stripMfePrefix(shortName: string): string {
  return shortName.startsWith("mfe-") ? shortName.slice(4) : shortName;
}
