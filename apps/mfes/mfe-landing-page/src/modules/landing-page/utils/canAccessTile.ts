import type { AccessRight } from "@/types";
import type { LandingTile } from "../types";

export function canAccessTile(
  tile: LandingTile,
  userAccessRights: readonly AccessRight[],
): boolean {
  if (!tile.requiredAccessRights) return true;
  return tile.requiredAccessRights.some((right) => userAccessRights.includes(right));
}
