// Implements PPD-2: Preview config generator
// See: openspec/changes/dev-preview-deployments/specs/pr-preview-deployments/spec.md
//
// Generates a per-PR remote config by rewriting entryUrls for changed MFEs
// from dev/ paths to pr-<number>/ paths, while keeping untouched MFEs at dev/.

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
 * for changed MFEs only.
 *
 * @param devConfig - The base dev config (remotes.config.dev.json)
 * @param changedMfes - Array of MFE names that changed in this PR (e.g., ["mfe-widget"])
 * @param prNumber - The pull request number
 * @returns A new config with updated entryUrls for changed MFEs
 */
export function generatePreviewConfig(
  devConfig: RemoteConfig,
  changedMfes: string[],
  prNumber: number,
): RemoteConfig {
  // Deep clone to avoid mutating the input
  const previewConfig = JSON.parse(JSON.stringify(devConfig)) as RemoteConfig;

  // If no MFEs changed, return the dev config as-is
  if (changedMfes.length === 0) {
    return previewConfig;
  }

  // For each feature route, check if its MFE is in the changed list
  for (const route in previewConfig.features) {
    const feature = previewConfig.features[route];
    const mfeName = feature.mfe;

    if (changedMfes.includes(mfeName)) {
      // Replace /dev/ with /pr-<n>/ in the entryUrl
      feature.entryUrl = feature.entryUrl.replace(
        `/${mfeName}/dev/`,
        `/${mfeName}/pr-${prNumber}/`,
      );
    }
  }

  return previewConfig;
}
