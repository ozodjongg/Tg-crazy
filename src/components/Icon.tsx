const PATHS = {
  menu: "M4 7h16M4 12h16M4 17h16",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3",
  back: "M15 5l-7 7 7 7",
  send: "M12 19V5m0 0-6 6m6-6 6 6",
  down: "M12 5v14m0 0 6-6m-6 6-6-6",
  up: "M12 19V5m0 0-6 6m6-6 6 6",
  lock: "M6 11h12v9H6v-9Zm2 0V8a4 4 0 0 1 8 0v3",
  comment: "M4 5h16v11H9l-5 4V5Z",
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
  clip: "M20 11.5 12.5 19a5 5 0 0 1-7-7l8-8a3.4 3.4 0 0 1 4.8 4.8l-7.9 7.9a1.8 1.8 0 0 1-2.5-2.5L15 7",
  reply: "M10 8 5 13l5 5M5 13h9a5 5 0 0 0 5-5V6",
  forward: "M14 8l5 5-5 5M19 13h-9a5 5 0 0 1-5-5V6",
  edit: "M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4",
  trash: "M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13",
  copy: "M9 9h10v11H9V9Zm-4 6V4h10",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  file: "M7 3h7l5 5v13H7V3Zm7 0v5h5",
  download: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  play: "M8 5v14l11-7L8 5Z",
  script: "M4 18 8.5 6 13 18M5.6 14h5.8M15 18l3-8 3 8m-5-3h4",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  verified: "M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2L12 2Zm-3.5 10 2.5 2.5 4.5-5",
  location: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  pause: "M8 5v14M16 5v14",
  archive: "M3 5h18v4H3V5Zm2 4v10h14V9M10 13h4",
  at: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1",
  mark: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0m-6 6v3",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15h3a5 5 0 0 0-4-5",
  megaphone: "M4 10v4h3l7 4V6l-7 4H4Zm14-1a4 4 0 0 1 0 6M7 14l1 5h2.5l-1-4.5",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9 2.8 2.8L16 9.5",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
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
