/**
 * The Indian national flag as inline SVG: saffron, white and green bands (equal thirds) with the navy Ashoka Chakra
 * (24 spokes) in the centre. Drawn rather than typed as an emoji, because Windows shows the flag emoji as the letters "IN".
 */
export default function IndiaFlag({ className = "h-5 w-[30px]", label }: { className?: string; label?: string }) {
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    return <line key={i} x1={30 + Math.cos(a) * 1.6} y1={20 + Math.sin(a) * 1.6} x2={30 + Math.cos(a) * 5.6} y2={20 + Math.sin(a) * 5.6} />;
  });
  return (
    <svg viewBox="0 0 60 40" className={`shrink-0 rounded-[3px] ring-1 ring-black/10 ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <rect width="60" height="13.34" fill="#FF9933" />
      <rect y="13.33" width="60" height="13.34" fill="#FFFFFF" />
      <rect y="26.66" width="60" height="13.34" fill="#138808" />
      <g fill="none" stroke="#000080" strokeWidth="0.55">
        <circle cx="30" cy="20" r="5.8" strokeWidth="0.8" />
        {spokes}
      </g>
    </svg>
  );
}
