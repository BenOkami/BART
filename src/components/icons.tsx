import type { ReactNode, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Base({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconCoins = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="9" cy="6.5" rx="6" ry="2.8" />
    <path d="M3 6.5v4.6c0 1.55 2.7 2.8 6 2.8s6-1.25 6-2.8V6.5" />
    <path d="M3 11.1v4.6c0 1.55 2.7 2.8 6 2.8 1.55 0 2.97-.27 4.1-.73" />
    <path d="M17.2 10.6c2.27.3 3.8 1.3 3.8 2.46 0 .93-.98 1.73-2.4 2.16" />
    <path d="M14.8 15.9c.4 1.13 2.2 2 4.4 2 2.54 0 4.6-1.07 4.6-2.4 0-1.16-1.53-2.15-3.7-2.44" />
  </Base>
);

export const IconTrophy = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 21h8" />
    <path d="M12 17.5V21" />
    <path d="M7 4h10v6.2a5 5 0 0 1-10 0V4Z" />
    <path d="M7 5.6H4.4a.4.4 0 0 0-.4.43c.13 2.85 1.5 4.47 3.4 4.77" />
    <path d="M17 5.6h2.6a.4.4 0 0 1 .4.43c-.13 2.85-1.5 4.47-3.4 4.77" />
  </Base>
);

export const IconFlag = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 21V3.8" />
    <path d="M5 4.5c2.6-1.5 5-1.5 7.5 0s4.9 1.5 6.5.6v8.4c-1.6.9-4 .9-6.5-.6s-4.9-1.5-7.5 0" />
  </Base>
);

export const IconBolt = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 2 4.6 13.2h6L11 22l8.4-11.2h-6L13 2Z" />
  </Base>
);

export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 6 12 12" />
    <path d="M18 6 6 18" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M9 7V4.6A.6.6 0 0 1 9.6 4h4.8a.6.6 0 0 1 .6.6V7" />
  </Base>
);

export const IconChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Base>
);

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Base>
);

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 5.2v13.6L19 12 8 5.2Z" />
  </Base>
);

export const IconPause = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 5.5v13" />
    <path d="M15 5.5v13" />
  </Base>
);

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.8-4.9 5.5-4.9s4.9 1.7 5.5 4.9" />
    <circle cx="16.5" cy="9" r="2.4" />
    <path d="M15.6 14.6c2.3.2 4.1 1.7 4.7 4.4" />
  </Base>
);

export const IconGear = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" />
  </Base>
);

export const IconSpark = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6Z" />
    <path d="M18.5 15.5c.25 1.8 1.2 2.75 3 3-1.8.25-2.75 1.2-3 3-.25-1.8-1.2-2.75-3-3 1.8-.25 2.75-1.2 3-3Z" />
  </Base>
);

export const IconScreen = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
    <path d="M12 16.5V20" />
    <path d="M8 20h8" />
  </Base>
);

export const IconCrown = (p: IconProps) => (
  <Base {...p}>
    <path d="m4 8.5 3.5 3L12 5l4.5 6.5 3.5-3-1.2 9H5.2L4 8.5Z" />
    <path d="M5.2 17.5h13.6" />
  </Base>
);

export const IconHandshake = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 6.5-3.2 3.2a1.6 1.6 0 0 0 2.26 2.26L12.5 10.5l5-4" />
    <path d="M21 12.5 17.5 9l-3.5 2.8" />
    <path d="m3 12.5 4-4 3 2.4" />
    <path d="m8.5 14 1.8 1.8" />
    <path d="m11 16.5 1.4 1.4" />
    <path d="m13.5 18.6 1 1" />
  </Base>
);
