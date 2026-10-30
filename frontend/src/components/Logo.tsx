/** The Munim mark: an M in two strokes, navy tile with a white and a cyan half. Same artwork as assets/logo/munim-mark.svg. */
export default function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden focusable="false">
      <rect width="64" height="64" rx="15" fill="#002868" />
      <path d="M17 46V20L32 38" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 38L47 20V46" fill="none" stroke="#00B8F0" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
