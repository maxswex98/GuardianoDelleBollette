export function UtilityMascot() {
  return (
    <svg
      className="utility-mascot"
      viewBox="0 0 240 150"
      role="img"
      aria-label="Mascotte simpatica delle bollette luce e gas"
    >
      <defs>
        <linearGradient id="billBg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8f0fb" />
        </linearGradient>
        <linearGradient id="shieldBg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f4b400" />
          <stop offset="100%" stopColor="#d93025" />
        </linearGradient>
      </defs>

      <circle cx="78" cy="74" r="52" fill="#fff4cc" />
      <circle cx="162" cy="66" r="34" fill="#ffd5d0" />

      <path d="M77 42 64 72h16l-8 35 30-41H86l10-24Z" fill="#f4b400" />
      <path
        d="M169 37c9 10 11 20 7 29-4 8-13 14-24 16 4-5 5-9 4-14-8 3-16 0-21-7-4-8-3-16 5-24 2 9 8 15 18 18-1-8 3-14 11-18Z"
        fill="#d93025"
      />

      <g transform="translate(58 40)">
        <rect x="0" y="0" width="124" height="82" rx="18" fill="url(#billBg)" stroke="#c6d2e5" strokeWidth="3" />
        <rect x="18" y="16" width="56" height="6" rx="3" fill="#d4deec" />
        <rect x="18" y="28" width="86" height="6" rx="3" fill="#d4deec" />
        <rect x="18" y="40" width="46" height="6" rx="3" fill="#d4deec" />
        <circle cx="46" cy="58" r="5" fill="#102038" />
        <circle cx="78" cy="58" r="5" fill="#102038" />
        <path d="M47 78c8 7 20 7 28 0" fill="none" stroke="#102038" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g transform="translate(102 84)">
        <path d="M18 0c9 6 17 8 24 9 0 19-9 30-24 38C3 39-6 28-6 9 1 8 9 6 18 0Z" fill="url(#shieldBg)" />
        <path d="m12 24 5 6 12-16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
