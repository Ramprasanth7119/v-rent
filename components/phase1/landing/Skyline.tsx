/**
 * Singapore at dusk, drawn.
 *
 * The landing page opens on the city rather than on a stock photograph: the
 * Flyer, the Esplanade's two domes, Marina Bay Sands and the towers of the
 * CBD, as flat silhouettes against a navy sky. Drawn so it costs no request,
 * reads in both themes, and never pretends to be a picture of a listing.
 */

const GROUND = 320;

const BACK: [number, number, number][] = [
  [0, 60, 90], [55, 40, 120], [100, 70, 80], [180, 50, 140], [240, 60, 100], [310, 45, 130], [360, 80, 90],
  [450, 50, 150], [510, 70, 110], [590, 40, 95], [640, 60, 130], [720, 55, 160], [790, 40, 120], [840, 70, 175],
  [920, 50, 140], [980, 60, 190], [1050, 45, 150], [1100, 70, 120], [1180, 50, 170], [1240, 60, 130],
  [1310, 45, 160], [1360, 80, 110],
];

const CBD: { x: number; w: number; h: number; spire?: boolean }[] = [
  { x: 804, w: 46, h: 170 }, { x: 854, w: 34, h: 215 }, { x: 892, w: 52, h: 252, spire: true }, { x: 948, w: 40, h: 190 },
  { x: 992, w: 58, h: 268 }, { x: 1054, w: 36, h: 205 }, { x: 1094, w: 50, h: 238, spire: true }, { x: 1148, w: 44, h: 182 },
  { x: 1196, w: 60, h: 222 }, { x: 1260, w: 38, h: 160 }, { x: 1302, w: 54, h: 200 }, { x: 1360, w: 42, h: 150 },
  { x: 1406, w: 34, h: 122 },
];

export function Skyline({ className = '' }: { className?: string }) {
  const front = '#0B162C';
  return (
    <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      {/* the far city */}
      <g fill="#1C2E52" opacity="0.55">
        {BACK.map(([x, w, h]) => <rect key={x} x={x} y={GROUND - h} width={w} height={h} />)}
      </g>

      {/* Singapore Flyer */}
      <g stroke={front} fill="none">
        <circle cx="170" cy="206" r="78" strokeWidth="4" />
        <circle cx="170" cy="206" r="6" fill={front} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          // Rounded: the last digits of cos and sin differ between engines, and
          // a client render of this drawing must match the server's exactly.
          return <line key={i} x1="170" y1="206" x2={(170 + Math.cos(a) * 78).toFixed(2)} y2={(206 + Math.sin(a) * 78).toFixed(2)} strokeWidth="1.2" />;
        })}
        <path d="M170 206 L136 320 M170 206 L204 320" strokeWidth="5" />
      </g>

      <g fill={front}>
        {/* Esplanade */}
        <path d="M284 320 A48 54 0 0 1 380 320 Z" />
        <path d="M388 320 A42 44 0 0 1 472 320 Z" />
        <rect x="240" y="300" width="560" height="20" />

        {/* Marina Bay Sands */}
        {[560, 628, 696].map((x, i) => (
          <path key={x} d={`M${x} ${GROUND} L${x + 4} ${GROUND - 150 - i * 2} L${x + 34} ${GROUND - 150 - i * 2} L${x + 38} ${GROUND} Z`} />
        ))}
        <path d="M546 158 L784 156 L800 164 L546 170 Z" />

        {/* the CBD */}
        {CBD.map((b) => (
          <g key={b.x}>
            <rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} />
            {b.spire && <rect x={b.x + b.w / 2 - 1.5} y={GROUND - b.h - 34} width="3" height="34" />}
          </g>
        ))}
      </g>

      {/* a few lit windows, so the towers are occupied rather than cut out */}
      <g fill="#FDE68A" opacity="0.28">
        {CBD.flatMap((b, i) =>
          Array.from({ length: Math.floor((b.h - 30) / 20) }).flatMap((_, r) =>
            Array.from({ length: Math.max(1, Math.floor((b.w - 10) / 12)) }).map((__, c) =>
              (i * 7 + r * 3 + c * 5) % 6 === 0
                ? <rect key={`${b.x}-${r}-${c}`} x={b.x + 6 + c * 12} y={GROUND - b.h + 14 + r * 20} width="4" height="6" />
                : null,
            ),
          ),
        )}
      </g>
    </svg>
  );
}
