import type { Project } from '../config/candidate';

/**
 * Small technical diagrams. They illustrate the *kind* of work — they never
 * contain invented data (no IPs, ports, scores or findings).
 */

const A = '#A3FF12';
const M = '#89929C';
const L = 'rgba(244,244,240,0.22)';

function FlagsArt() {
  return (
    <g>
      <path className="draw" d="M34 100 C70 60, 90 120, 120 84 S170 60, 206 92" fill="none" stroke={L} strokeWidth="1.2" />
      {[0, 1, 2, 3].map((i) => {
        const x = 34 + i * 57;
        const y = 100 - [0, 18, 4, 14][i];
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y - 38} stroke={M} strokeWidth="1.4" />
            <path d={`M${x} ${y - 38} h24 l-6 8 l6 8 h-24 z`} fill={A} fillOpacity="0.92" />
            <circle cx={x} cy={y} r="3" fill="#080B10" stroke={A} strokeWidth="1.4" />
            <text x={x - 1} y={y + 16} fontSize="9" fill={M} textAnchor="middle" fontFamily="IBM Plex Mono">
              {`0${i + 1}`}
            </text>
          </g>
        );
      })}
      <text x="120" y="130" fontSize="9" fill={M} textAnchor="middle" fontFamily="IBM Plex Mono" letterSpacing="2">
        4 FLAGS · 1 CHALLENGE
      </text>
    </g>
  );
}

function ReconArt() {
  const targets = [
    [40, 34],
    [200, 30],
    [48, 108],
    [196, 112],
  ];
  return (
    <g>
      {targets.map(([x, y], i) => (
        <g key={i}>
          <line className="draw" x1="120" y1="70" x2={x} y2={y} stroke={A} strokeOpacity="0.7" strokeWidth="1.1" style={{ animationDelay: `${i * 0.25}s` }} />
          <rect x={x - 13} y={y - 9} width="26" height="18" rx="3" fill="#111820" stroke={L} />
          <circle cx={x - 6} cy={y} r="1.8" fill={A} className="pulse-dot" style={{ animationDelay: `${i * 0.4}s` }} />
          <line x1={x} y1={y - 3} x2={x + 7} y2={y - 3} stroke={M} />
          <line x1={x} y1={y + 3} x2={x + 7} y2={y + 3} stroke={M} />
        </g>
      ))}
      <circle cx="120" cy="70" r="16" fill="#080B10" stroke={A} strokeWidth="1.4" />
      <circle cx="120" cy="70" r="24" fill="none" stroke={A} strokeOpacity="0.25" className="pulse-dot" />
      <text x="120" y="73" fontSize="8" fill={A} textAnchor="middle" fontFamily="IBM Plex Mono">scan</text>
      <text x="120" y="136" fontSize="9" fill={M} textAnchor="middle" fontFamily="IBM Plex Mono" letterSpacing="2">
        HOSTS → SERVICES
      </text>
    </g>
  );
}

function ShellArt() {
  return (
    <g fontFamily="IBM Plex Mono" fontSize="9">
      <rect x="22" y="14" width="196" height="102" rx="8" fill="#111820" stroke={L} />
      <line x1="22" y1="30" x2="218" y2="30" stroke={L} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={34 + i * 10} cy="22" r="2.4" fill={i === 0 ? A : M} fillOpacity={i === 0 ? 1 : 0.5} />
      ))}
      <text x="34" y="50" fill={A}>$ journalctl -xe</text>
      <text x="34" y="62" fill={M}>… read the logs first</text>
      <text x="34" y="76" fill={A}>$ ./check.sh</text>
      <text x="34" y="88" fill={M}>… script what repeats</text>
      <text x="34" y="102" fill={A}>$</text>
      <rect x="44" y="93" width="6" height="11" fill={A} className="pulse-dot" />
      <text x="120" y="134" fontSize="9" fill={M} textAnchor="middle" letterSpacing="2">ILLUSTRATIVE</text>
    </g>
  );
}

function WebArt() {
  return (
    <g fontFamily="IBM Plex Mono" fontSize="9">
      <rect x="20" y="14" width="200" height="96" rx="8" fill="#111820" stroke={L} />
      <line x1="20" y1="32" x2="220" y2="32" stroke={L} />
      <rect x="62" y="19" width="120" height="8" rx="4" fill="#080B10" stroke={L} />
      <path d="M44 58 H120" stroke={A} strokeWidth="1.4" className="draw" />
      <path d="M116 54 l6 4 l-6 4" fill="none" stroke={A} strokeWidth="1.4" />
      <path d="M196 84 H120" stroke={M} strokeWidth="1.4" className="draw" />
      <path d="M124 80 l-6 4 l6 4" fill="none" stroke={M} strokeWidth="1.4" />
      <text x="44" y="50" fill={A}>request</text>
      <text x="196" y="78" fill={M} textAnchor="end">response</text>
      <rect x="40" y="94" width="40" height="6" rx="3" fill={L} />
      <rect x="86" y="94" width="24" height="6" rx="3" fill={A} fillOpacity="0.6" />
      <text x="120" y="134" fontSize="9" fill={M} textAnchor="middle" letterSpacing="2">HTTP, END TO END</text>
    </g>
  );
}

function OsArt() {
  const layers = ['interface', 'command registry', 'virtual filesystem', 'ctf state machine'];
  return (
    <g fontFamily="IBM Plex Mono" fontSize="9">
      {layers.map((l, i) => (
        <g key={l}>
          <rect x={30 + i * 6} y={14 + i * 27} width={180 - i * 12} height="22" rx="5" fill="#111820" stroke={i === 0 ? A : L} />
          <text x="120" y={29 + i * 27} fill={i === 0 ? A : M} textAnchor="middle">{l}</text>
        </g>
      ))}
    </g>
  );
}

const MAP = { flags: FlagsArt, recon: ReconArt, shell: ShellArt, web: WebArt, os: OsArt } as const;

export function Illustration({ kind, className = '' }: { kind: Project['illustration']; className?: string }) {
  const Art = MAP[kind];
  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={`Technical illustration: ${kind}`} className={className}>
      <Art />
    </svg>
  );
}
