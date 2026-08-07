// Implements PPD-2: Preview config generator
// Implements release-channel-deployments Task 3.2: base-channel argument
// See: openspec/changes/dev-preview-deployments/specs/pr-preview-deployments/spec.md
// See: openspec/changes/release-channel-deployments/specs/pr-preview-deployments/spec.md
//
// Generates a per-PR remote config by rewriting entryUrls for changed MFEs
// from dev/ paths to pr-<number>/ paths.
// When base-channel is provided, unchanged MFEs resolve to the base channel URL
// with dev fallback (blob existence check).

interface RemoteConfig {
  $schema: string;
  schemaVersion: string;
  chrome: Record<string, unknown>;
  features: {
    [route: string]: {
      mfe: string;
      entryUrl: string;
      scope: string;
      version: string;
      basePath: string;
      requiresAuth: boolean;
      requiredRoles: string[];
      enabled: boolean;
    };
  };
}

/**
 * Generates a preview config for a PR by replacing dev/ URLs with pr-<n>/ URLs
 * for changed MFEs. Unchanged MFEs resolve to base-channel URL if provided.
 *
 * @param devConfig - The base dev config (remotes.config.dev.json)
 * @param changedMfes - Array of MFE names that changed in this PR (e.g., ["mfe-widget"])
 * @param prNumber - The pull request number
 * @param baseChannel - Optional release channel of base branch (e.g., "release-4.10")
 * @returns A new config with updated entryUrls for changed MFEs and base-channel URLs for unchanged
 */
export async function generatePreviewConfig(
  devConfig: RemoteConfig,
  changedMfes: string[],
  prNumber: number,
  baseChannel?: string,
): Promise<RemoteConfig> {
  // Deep clone to avoid mutating the input
  const previewConfig = JSON.parse(JSON.stringify(devConfig)) as RemoteConfig;

  // If no MFEs changed, return the dev config as-is (but with base-channel URLs if provided)
  if (changedMfes.length === 0 && !baseChannel) {
    return previewConfig;
  }

  // For each feature route, check if its MFE is in the changed list
  for (const route in previewConfig.features) {
    const feature = previewConfig.features[route];
    const mfeName = feature.mfe;

    if (changedMfes.includes(mfeName)) {
      // Changed MFE: Replace /dev/ with /pr-<n>/ in the entryUrl
      feature.entryUrl = feature.entryUrl.replace(
        `/${mfeName}/dev/`,
        `/${mfeName}/pr-${prNumber}/`,
      );
    } else if (baseChannel) {
      // Unchanged MFE with base-channel: try channel URL, fallback to dev
      // Implements release-channel-deployments: pr-preview-deployments release-target preview requirement
      const channelUrl = feature.entryUrl.replace(
        `/${mfeName}/dev/`,
        `/${mfeName}/${baseChannel}/`,
      );

      const channelExists = await checkBlobExists(channelUrl);
      if (channelExists) {
        feature.entryUrl = channelUrl;
      }
      // else: keep dev URL (already in feature.entryUrl)
    }
  }

  return previewConfig;
}

/**
 * Check if a blob exists at the given URL using HTTP HEAD request.
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
