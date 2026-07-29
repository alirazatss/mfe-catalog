import type { ReactElement, ReactNode } from "react";
import { TSS_COLORS } from "@/constants/colors";

export type TileProps = {
  readonly logo: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly iconColor?: string;
  readonly iconBackground?: string;
  readonly onClick?: () => void;
  readonly href?: string;
  readonly external?: boolean;
  readonly ariaLabel?: string;
};

export function Tile({
  logo,
  title,
  description,
  iconColor = TSS_COLORS.primary,
  iconBackground = TSS_COLORS.borderGray,
  onClick,
  href,
  external,
  ariaLabel,
}: TileProps): ReactElement {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-md"
        style={{ color: iconColor, backgroundColor: iconBackground }}
      >
        {logo}
      </span>
      <h3 className="mt-3 text-base font-semibold" style={{ color: TSS_COLORS.primary }}>
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm" style={{ color: TSS_COLORS.lightGray }}>
          {description}
        </p>
      ) : null}
    </>
  );

  const sharedClasses =
    "flex w-full flex-col items-start justify-center rounded-lg border bg-white p-4 text-left shadow-xs";
  const sharedStyle = { borderColor: TSS_COLORS.borderGray } as const;

  const interactiveClasses =
    "transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-sm focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none";

  if (href) {
    const opensInNewTab = external === true;
    return (
      <a
        href={href}
        target={opensInNewTab ? "_blank" : undefined}
        rel={opensInNewTab ? "noopener noreferrer" : undefined}
        aria-label={ariaLabel ?? title}
        className={`${sharedClasses} ${interactiveClasses} no-underline focus:outline-none focus-visible:ring-2`}
        style={sharedStyle}
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? title}
        className={`${sharedClasses} ${interactiveClasses} focus:outline-none focus-visible:ring-2`}
        style={sharedStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={sharedClasses} style={sharedStyle}>
      {content}
    </div>
  );
}
