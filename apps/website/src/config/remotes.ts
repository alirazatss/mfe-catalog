/**
 * Runtime Remote Configuration
 *
 * This allows dynamic loading of remote URLs at runtime
 * based on the current environment or configuration API
 */

interface RemoteConfig {
  remoteWidget: string;
  // Add more remotes here as needed
}

/**
 * Get remote configuration from various sources
 */
export async function getRemoteConfig(): Promise<RemoteConfig> {
  // Strategy 1: Environment variables (build-time)
  const buildTimeConfig: RemoteConfig = {
    remoteWidget:
      import.meta.env.VITE_REMOTE_WIDGET_URL || "http://localhost:5174/assets/remoteEntry.js",
  };

  // Strategy 2: Runtime configuration from API (recommended for dynamic environments)
  try {
    // Fetch from configuration endpoint
    const response = await fetch("/api/config/remotes");
    if (response.ok) {
      const runtimeConfig = await response.json();
      return {
        remoteWidget: runtimeConfig.remoteWidget || buildTimeConfig.remoteWidget,
      };
    }
  } catch (error) {
    console.warn("[RemoteConfig] Failed to fetch runtime config, using build-time config:", error);
  }

  // Strategy 3: Base URL detection (for same-origin deployments)
  if (window.location.hostname !== "localhost") {
    const baseUrl = window.location.origin;
    return {
      remoteWidget: `${baseUrl}/remotes/remote-widget/assets/remoteEntry.js`,
    };
  }

  return buildTimeConfig;
}

/**
 * Common deployment patterns for remote URLs
 */
export const DEPLOYMENT_PATTERNS = {
  // Pattern 1: CDN with versioning
  cdn: (version: string) =>
    `https://cdn.example.com/remote-widget/${version}/assets/remoteEntry.js`,

  // Pattern 2: Same origin, different path
  sameOrigin: (remoteName: string) =>
    `${window.location.origin}/remotes/${remoteName}/assets/remoteEntry.js`,

  // Pattern 3: Subdomain per remote
  subdomain: (remoteName: string) => `https://${remoteName}.example.com/assets/remoteEntry.js`,

  // Pattern 4: Environment-specific domains
  environment: (env: "dev" | "staging" | "prod", remoteName: string) => {
    const domains = {
      dev: `https://dev-${remoteName}.example.com`,
      staging: `https://staging-${remoteName}.example.com`,
      prod: `https://${remoteName}.example.com`,
    };
    return `${domains[env]}/assets/remoteEntry.js`;
  },
};
