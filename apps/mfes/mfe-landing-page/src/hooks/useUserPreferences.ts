import type { AccessRight, UserPreferences } from "@/types";

/**
 * Mock hook for user preferences.
 * In the main app, this fetches real user data.
 * For this standalone landing page, we provide demo data.
 */
export function useUserPreferences(): { data: UserPreferences | undefined; isLoading: boolean } {
  const mockPreferences: UserPreferences = {
    completeTvnId: "USER123",
    officeName: "Main Office",
    companyTvnId: "COMP001",
    username: "demo.user",
    fullName: "Demo User",
    email: "demo@example.com",
    tenantName: "Demo Tenant",
    accessGroups: ["admin", "users"],
    accessRights: [
      "shipment_tracker",
      "tvnuser",
      "ttwc_profiles",
      "qa_approve_profiles",
      "cloudLaunch",
      "cloudStop",
      "jreport",
      "tvnadmin",
      "c_user_manager",
      "sysadmin",
      "rma",
      "order",
    ] as readonly AccessRight[],
  };

  return {
    data: mockPreferences,
    isLoading: false,
  };
}
