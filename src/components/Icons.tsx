import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M4.5 12H3M21 12h-1.5M6.2 6.2l-1-1M18.8 18.8l-1-1M6.2 17.8l-1 1M18.8 5.2l-1 1" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </Svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2 11 14.7 15.5 9.5" />
    </Svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v1.4M12 18.1v1.4M4.5 12h1.4M18.1 12h1.4M6.4 6.4l1 1M16.6 16.6l1 1M6.4 17.6l1-1M16.6 7.4l1-1" />
    </Svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6.5 2 6.5H4.5s2-1.5 2-6.5" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.5 20 20.5" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6v12M6 12h12" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5 8 12l7 7" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 8h14M9.5 8V5.8A1.3 1.3 0 0 1 10.8 4.5h2.4A1.3 1.3 0 0 1 14.5 5.8V8M8 8l.7 11.2A1.5 1.5 0 0 0 10.2 20.5h3.6a1.5 1.5 0 0 0 1.5-1.3L16 8" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 3.5 20 6.5 17 9.5" />
      <path d="M4 12a6 6 0 0 1 6-6h10" />
      <path d="M7 20.5 4 17.5 7 14.5" />
      <path d="M20 12a6 6 0 0 1-6 6H4" />
    </Svg>
  );
}

export function IconCloud(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 18h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7.5 18Z" />
    </Svg>
  );
}

export function IconDevice(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="3.5" width="10" height="17" rx="2" />
      <path d="M11 17.5h2" />
    </Svg>
  );
}

export function IconPalette(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5a7.5 7.5 0 1 0 0 15h1.6a2 2 0 0 0 1.9-2.6 2.4 2.4 0 0 1 2.3-3.4H18a4.5 4.5 0 0 0 0-9H12Z" />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 16.7 16.2 5a2 2 0 0 1 2.8 2.8L7.3 19.5H4.5v-2.8Z" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5 10 17.5 19 7.5" />
    </Svg>
  );
}

export function IconWave(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 14c1.5-3 3-4.5 4.5-4.5S11 13 12.5 13 16 8.5 20 10" />
    </Svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}
