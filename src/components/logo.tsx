export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="veil-ring" x1="8" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F2B84B" />
          <stop offset="1" stopColor="#FF7A93" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#veil-ring)" strokeWidth="2.4" />
      <path d="M14 32c6.2-8 12.4-12 18-12s11.8 4 18 12c-6.2 8-12.4 12-18 12s-11.8-4-18-12Z" fill="none" stroke="#F4EFE6" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="5.5" fill="#8F8BF5" />
      <circle cx="34" cy="30" r="1.6" fill="#F4EFE6" />
    </svg>
  );
}
