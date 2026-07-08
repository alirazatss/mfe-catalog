import { validateRemoteConfig } from "@mf-mono/remote-config";
import type { MicroFrontend, RemoteConfig, ConfigGenerationOptions } from "./types.js";

/**
 * Generate remote configuration from discovered micro-frontends
 *
 * Takes an array of discovered micro-frontends and generates a RemoteConfig
 * object with environment-specific URLs.
 *
 * @param microFrontends - Array of discovered micro-frontends
 * @param options - Configuration options (environment, gitHash, baseUrl, outputPath)
 * @returns RemoteConfig object validated against JSON Schema
 */
export async function generateConfig(
  microFrontends: MicroFrontend[],
  options: ConfigGenerationOptions,
): Promise<RemoteConfig> {
  const { environment, gitHash, baseUrl } = options;

  const remotes = microFrontends.map((mfe) => {
    // Generate entry URL based on environment
    let entryUrl: string;

    if (environment === "development") {
      // Development: http://localhost:{port}/remoteEntry.js
      entryUrl = `http://localhost:${mfe.port}/remoteEntry.js`;
    } else {
      // Production: {baseUrl}/mfe-{shortName}/v{gitHash}/remoteEntry.js
      const hash = gitHash || "latest";
      const base = baseUrl || "";
      entryUrl = `${base}/mfe-${mfe.shortName}/v${hash}/remoteEntry.js`;
    }

    return {
      name: mfe.shortName,
      entryUrl,
      scope: mfe.scope,
      version: gitHash || mfe.version,
      enabled: true,
    };
  });

  const config: RemoteConfig = {
    $schema: "../node_modules/@mf-mono/remote-config/schema.json",
    remotes,
  };

  // Validate against JSON Schema
  try {
    validateRemoteConfig(config);
  } catch (error) {
    throw new Error(
      `Generated config failed validation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return config;
}
