/** Ilovaning o'z belgisi: clay rangli doira ichida "T". */
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-accent font-serif font-semibold text-accent-text"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      T
    </span>
  );
}
