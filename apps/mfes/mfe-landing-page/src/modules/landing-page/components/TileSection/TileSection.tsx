import type { ReactElement } from "react";
import { Tile } from "@/components/ui-components/Tile";
import type { AccessRight } from "@/types";
import type { LandingTile } from "../../types";
import { canAccessTile } from "../../utils/canAccessTile";

type TileSectionProps = {
  readonly title: string;
  readonly tiles: readonly LandingTile[];
  readonly userAccessRights: readonly AccessRight[];
};

export function TileSection({
  title,
  tiles,
  userAccessRights,
}: TileSectionProps): ReactElement | null {
  const visibleTiles = tiles.filter((tile) => canAccessTile(tile, userAccessRights));

  if (visibleTiles.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {visibleTiles.map((tile) => (
          <Tile
            key={tile.id}
            logo={tile.logo}
            title={tile.title}
            description={tile.description}
            iconColor={tile.colors.color}
            iconBackground={tile.colors.background}
            href={tile.href}
            external={tile.external}
          />
        ))}
      </div>
    </section>
  );
}
