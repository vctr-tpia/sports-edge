import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5h7v6H4z" />
      <path d="M13 5h7v10h-7z" />
      <path d="M4 13h7v6H4z" />
      <path d="M13 17h7v2h-7z" />
    </BaseIcon>
  );
}

export function MatchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4c2.5 0 4 1.7 4 4.2S10.5 13 8 13s-4-1.7-4-4.8S5.5 4 8 4Z" />
      <path d="M16 11c2.2 0 4 1.6 4 4s-1.8 5-4.2 5-3.8-1.8-3.8-4.5 1.8-4.5 4-4.5Z" />
    </BaseIcon>
  );
}

export function PredictionIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-6" />
    </BaseIcon>
  );
}

export function PlayerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.7-3 4.1-4.5 7-4.5s5.3 1.5 7 4.5" />
    </BaseIcon>
  );
}

export function ModelLabIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 6h14" />
      <path d="M7 6v12" />
      <path d="M17 6v12" />
      <path d="M7 11h10" />
      <path d="M10 16h4" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
      <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.6-1.9-3.2-2.4 1a8 8 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2a8 8 0 0 0-1.9 1.1l-2.4-1-1.9 3.2 2 1.6A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.6 1.9 3.2 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2h4.6l.4-2c.7-.3 1.3-.6 1.9-1.1l2.4 1 1.9-3.2-2-1.6c.1-.4.1-.7.1-1.1Z" />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.4-3.4" />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </BaseIcon>
  );
}

export function ArrowTrendIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 16 10 10l4 4 6-7" />
      <path d="M17 7h3v3" />
    </BaseIcon>
  );
}

export function DotIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 8 8" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}
