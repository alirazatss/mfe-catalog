import { ShoppingCart, User, Building2, Shield } from "lucide-react";
import type { LandingTile } from "../types";
import { TILE_COLORS } from "./tileColors";

export const ADMINISTRATION_TILES: readonly LandingTile[] = [
  {
    id: "my-settings",
    title: "My Settings",
    description: "Manage personal preferences, report settings and user-specific configurations.",
    logo: <User size={16} />,
    colors: TILE_COLORS.purple,
  },
  {
    id: "company-settings",
    title: "Company Settings",
    description: "Configure company-wide settings, users, access rights and system behaviour.",
    logo: <Building2 size={16} />,
    colors: TILE_COLORS.blue,
    requiredAccessRights: ["tvnsuper", "tvnadmin", "c_user_manager"],
  },
  {
    id: "tss-administration",
    title: "TSS Administration",
    description: "Access advanced administration and customer-specific system configuration.",
    logo: <Shield size={16} />,
    colors: TILE_COLORS.indigo,
    requiredAccessRights: ["sysadmin"],
  },
  {
    id: "orders-returns",
    title: "Orders & Returns",
    description: "Order hardware, track order status and manage returns and recycling requests.",
    logo: <ShoppingCart size={16} />,
    colors: TILE_COLORS.green,
    requiredAccessRights: ["rma", "order"],
  },
];
