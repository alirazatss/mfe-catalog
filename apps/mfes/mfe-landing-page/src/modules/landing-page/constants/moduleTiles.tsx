import {
  Package,
  Thermometer,
  SlidersHorizontal,
  CloudUpload,
  CloudOff,
  FileText,
} from "lucide-react";
import type { LandingTile } from "../types";
import { TILE_COLORS } from "./tileColors";

export const MODULE_TILES: readonly LandingTile[] = [
  {
    id: "shipment-tracker",
    title: "Shipment Tracker",
    description: "Manage shipments across all origins and destinations.",
    logo: <Package size={16} />,
    colors: TILE_COLORS.purple,
    requiredAccessRights: ["shipment_tracker"],
  },
  {
    id: "temp-via-net",
    title: "TempViaNet",
    description: "Search, monitor and analyse shipment temperature data and logistics milestones.",
    logo: <Thermometer size={16} />,
    colors: TILE_COLORS.red,
    requiredAccessRights: ["tvnuser"],
  },
  {
    id: "profiles",
    title: "Profiles",
    description: "Create, manage and approve temperature monitoring profiles and settings.",
    logo: <SlidersHorizontal size={16} />,
    colors: TILE_COLORS.pink,
    requiredAccessRights: ["ttwc_profiles", "qa_approve_profiles"],
  },
  {
    id: "cloud-launch",
    title: "Cloud Launch",
    description:
      "Configure and launch supported loggers for shipments and cross-docking operations.",
    logo: <CloudUpload size={16} />,
    colors: TILE_COLORS.green,
    requiredAccessRights: ["cloudLaunch"],
  },
  {
    id: "cloud-stop",
    title: "Cloud Stop",
    description: "Stop supported loggers and complete shipment monitoring missions.",
    logo: <CloudOff size={16} />,
    colors: TILE_COLORS.orange,
    requiredAccessRights: ["cloudStop"],
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate reports and analyse supply chain performance and compliance data.",
    logo: <FileText size={16} />,
    colors: TILE_COLORS.teal,
    requiredAccessRights: ["jreport"],
  },
];
