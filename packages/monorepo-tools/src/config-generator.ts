import { validateRemoteConfig } from "@mfe-runtime/remote-config";
import type {
  MicroFrontend,
  RemoteConfig,
  ConfigGenerationOptions,
  FeatureMFEEntry,
} from "./types.js";

/**
 * Compute entry URL for an MFE, with channel-based routing and dev fallback.
 *
 * Implements release-channel-deployments: config-generation requirement
 * See: openspec/changes/release-channel-deployments/specs/config-generation/spec.md
 */
async function computeEntryUrl(
  mfe: MicroFrontend,
  context: {
    environment: "development" | "production";
    gitHash?: string;
    baseUrl?: string;
    channel?: string;
    version: string;
  },
): Promise<string> {
  const { environment, baseUrl, channel, version } = context;

  // Development environment: always use localhost
  if (environment === "development") {
    return `http://localhost:${mfe.port}/remoteEntry.js`;
  }

  // Production environment without channel: use versioned path (legacy behavior)
  if (!channel) {
    return `${baseUrl || ""}/mfe-${mfe.shortName}/v${version}/remoteEntry.js`;
  }

  // Production with channel: check channel build exists, fallback to dev
  const channelUrl = `${baseUrl || ""}/${mfe.shortName}/${channel}/remoteEntry.js`;
  const devFallbackUrl = `${baseUrl || ""}/${mfe.shortName}/dev/remoteEntry.js`;

  // Check if channel build exists
  const channelExists = await checkBlobExists(channelUrl);

  if (channelExists) {
    return channelUrl;
  } else {
    // Fallback to dev pointer
    console.warn(`⚠️  No ${channel} build found for ${mfe.shortName}, falling back to dev pointer`);
    return devFallbackUrl;
  }
}

/**
 * Check if a blob exists at the given URL using HTTP HEAD request.
 *
 * Returns true if status is 200, false otherwise.
 */
async function checkBlobExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

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
 * When a channel is provided (e.g., "release-4.10"), the generator will:
 * - Check if the MFE has a build under <mfe>/release-X.Y/remoteEntry.js
 * - If yes, use the channel URL
 * - If no, fall back to <mfe>/dev/remoteEntry.js
 *
 * See:
 * - openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/spec.md
 * - openspec/changes/release-channel-deployments/specs/config-generation/spec.md
 * - docs/adr/0004-chrome-mfe-pattern.md
 */
export async function generateConfig(
  microFrontends: MicroFrontend[],
  options: ConfigGenerationOptions,
): Promise<RemoteConfig> {
  const { environment, gitHash, baseUrl, channel } = options;
  const version = gitHash || "latest";

  const chrome: NonNullable<RemoteConfig["chrome"]> = {};
  const features: NonNullable<RemoteConfig["features"]> = {};

  for (const mfe of microFrontends) {
    const entryUrl = await computeEntryUrl(mfe, {
      environment,
      gitHash,
      baseUrl,
      channel,
      version,
    });

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
