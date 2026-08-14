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
 * Implements CG-1: environment mode 'local' replaces 'development', old name rejected with guidance
 * See: openspec/changes/remote-config-environment-cleanup/specs/config-generation/spec.md
 * See: openspec/changes/release-channel-deployments/specs/config-generation/spec.md
 */
async function computeEntryUrl(
  mfe: MicroFrontend,
  context: {
    environment: "local" | "production" | "development";
    gitHash?: string;
    baseUrl?: string;
    channel?: string;
    version: string;
  },
): Promise<string> {
  const { environment, baseUrl, channel, version } = context;

  // Reject deprecated "development" mode with guidance (CG-1)
  if (environment === "development") {
    throw new Error(
      'Environment mode "development" has been renamed to "local". ' +
        "Please use --environment local instead. " +
        "See openspec/changes/remote-config-environment-cleanup/specs/config-generation/spec.md",
    );
  }

  // Local environment: always use localhost (CG-1)
  if (environment === "local") {
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
 * Implements CG-2: generator honors shell's root MFE designation
 * When rootMfe is provided, that MFE's route key becomes "/" instead of its default basePath.
 *
 * See:
 * - openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/spec.md
 * - openspec/changes/release-channel-deployments/specs/config-generation/spec.md
 * - openspec/changes/remote-config-environment-cleanup/specs/config-generation/spec.md
 * - docs/adr/0004-chrome-mfe-pattern.md
 */
export async function generateConfig(
  microFrontends: MicroFrontend[],
  options: ConfigGenerationOptions,
): Promise<RemoteConfig> {
  const { environment, gitHash, baseUrl, channel, rootMfe } = options;
  const version = gitHash || "latest";

  // Validate root MFE designation if provided (CG-2)
  if (rootMfe) {
    const rootMfeExists = microFrontends.some((mfe) => mfe.shortName === rootMfe);
    if (!rootMfeExists) {
      throw new Error(
        `Root MFE designation failed: no MFE named "${rootMfe}" found. ` +
          `Available MFEs: ${microFrontends.map((m) => m.shortName).join(", ")}`,
      );
    }
  }

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
      // Implements CG-2: designated root MFE gets route key "/"
      const defaultBasePath = `/${stripMfePrefix(mfe.shortName)}`;
      const routeKey = mfe.shortName === rootMfe ? "/" : defaultBasePath;
      const basePath = routeKey; // basePath and routeKey are the same in the current schema

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
      features[routeKey] = entry;
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
