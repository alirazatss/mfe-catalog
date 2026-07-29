import { TSS_COLORS } from "@/constants/colors";
import type { TileColor } from "../types";

export const TILE_COLORS = {
  red: { color: TSS_COLORS.alarm.primary, background: TSS_COLORS.alarm.background },
  purple: { color: TSS_COLORS.primaryLight, background: TSS_COLORS.purple4 },
  blue: { color: TSS_COLORS.lightBlue, background: "#e0eaf5" },
  green: { color: "#5a7a00", background: "rgba(153, 204, 0, 0.18)" },
  orange: { color: "#b45309", background: "#fef3c7" },
  teal: { color: "#0f766e", background: "#ccfbf1" },
  pink: { color: "#be185d", background: "#fce7f3" },
  indigo: { color: TSS_COLORS.primary, background: TSS_COLORS.borderGray },
} as const satisfies Record<string, TileColor>;
