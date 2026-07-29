import type { ReactNode } from "react";
import type { AccessRight } from "@/types";

export type TileColor = {
  readonly color: string;
  readonly background: string;
};

export type LandingTile = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly logo: ReactNode;
  readonly colors: TileColor;
  readonly href?: string;
  readonly external?: boolean;
  readonly requiredAccessRights?: readonly AccessRight[];
};
