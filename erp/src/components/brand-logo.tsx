/** Isotipo de Mudanzas Metepec (vectorizado a partir del logotipo oficial). */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#111316" />
      <circle cx="50" cy="50" r="44" fill="#FFD600" />
      <circle cx="50" cy="50" r="37" fill="#F57C00" />
      <circle cx="50" cy="50" r="30" fill="#E8170F" />
      <path d="M50 26c-8 0-14 6-14 14 0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z" fill="#111316" />
      <path d="M42 41l8-7 8 7v8h-16z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="47.5" y="43" width="5" height="6" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
