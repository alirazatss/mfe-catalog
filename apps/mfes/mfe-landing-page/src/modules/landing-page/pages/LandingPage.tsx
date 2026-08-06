import type { ReactElement } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { TileSection } from "../components/TileSection";
import { ADMINISTRATION_TILES } from "../constants/administrationTiles";
import { MODULE_TILES } from "../constants/moduleTiles";

export function LandingPage(): ReactElement {
  const { data: userPreferences } = useUserPreferences();
  const userAccessRights = userPreferences?.accessRights ?? [];

  return (
    <div
      className="flex-1 w-full flex flex-col p-5"
      style={{ backgroundColor: "rgb(245, 246, 248)" }}
    >
      <div className="flex-1 flex flex-col">
        <h1 className="text-2xl font-bold text-gray-900">CCIS</h1>

        <div className="mt-6 flex flex-col gap-8">
          <TileSection title="Modules" tiles={MODULE_TILES} userAccessRights={userAccessRights} />
          <TileSection
            title="Administration"
            tiles={ADMINISTRATION_TILES}
            userAccessRights={userAccessRights}
          />
        </div>
      </div>
    </div>
  );
}
