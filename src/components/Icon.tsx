const PATHS = {
  menu: "M4 7h16M4 12h16M4 17h16",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3",
  back: "M15 5l-7 7 7 7",
  send: "M12 19V5m0 0-6 6m6-6 6 6",
  down: "M12 5v14m0 0 6-6m-6 6-6-6",
  more: "M12 6h.01M12 12h.01M12 18h.01",
  pin: "M9 4h6l-1 6 3 3H7l3-3-1-6Zm3 9v7",
  mute: "M11 5 6 9H3v6h3l5 4V5Zm5 5 5 5m0-5-5 5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  checks: "M2 12.5 6.5 17 15 8M10.5 15.5 12 17l9.5-9.5",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  monitor: "M3 5h18v11H3V5Zm6 15h6m-3-4v4",
  close: "M6 6l12 12M18 6 6 18",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 2.6 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
