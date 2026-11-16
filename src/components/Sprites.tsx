import type { Kind } from "../game/vfs";
import type { Avatar } from "../game/missions";

/** Half-width and half-height of one isometric floor tile. */
export const HW = 48;
export const HH = 24;

export const P = {
  b950: "#04110e",
  b900: "#071a16",
  b800: "#0b2620",
  b700: "#10342c",
  b600: "#17463c",
  mask: "#1a5547",
  silk: "#eef3ea",
  silkDim: "#b1c7bc",
  silkMute: "#84a093",
  gold: "#edbd4f",
  goldDim: "#a8842f",
  copper: "#f39258",
  cyan: "#5ee6ff",
  violet: "#b9a0ff",
  red: "#ff6e66",
  green: "#7dffa3",
  glitch: "#ff5bdc",
};

export const AVATAR_COLORS: Record<string, string> = {
  cyan: P.cyan,
  teal: "#00ffcc",
  gold: P.gold,
  yellow: "#ffe659",
  magenta: P.glitch,
  pink: "#ff9bd2",
  lime: "#b9f25f",
  green: P.green,
  violet: P.violet,
  purple: "#9d6cff",
  orange: P.copper,
  red: P.red,
  blue: "#74a9ff",
  white: P.silk,
};

export function resolveAvatarColor(color?: string): string | undefined {
  if (!color) return undefined;
  const c = color.trim().toLowerCase();
  if (AVATAR_COLORS[c]) return AVATAR_COLORS[c];
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
  return undefined;
}

/** An isometric box standing on the tile centre. `s` is its footprint as a fraction of the tile. */
function Box(p: { s: number; h: number; top: string; left: string; right: string; edge?: string }) {
  const w = HW * p.s;
  const d = HH * p.s;
  return (
    <g>
      <polygon points={`${-w},${-p.h} 0,${-p.h + d} 0,${d} ${-w},0`} fill={p.left} />
      <polygon points={`${w},${-p.h} 0,${-p.h + d} 0,${d} ${w},0`} fill={p.right} />
      <polygon
        points={`0,${-p.h - d} ${w},${-p.h} 0,${-p.h + d} ${-w},${-p.h}`}
        fill={p.top}
        stroke={p.edge}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </g>
  );
}

const Shadow = ({ rx = 12 }: { rx?: number }) => (
  <ellipse cx={0} cy={3} rx={rx} ry={rx * 0.42} fill="#000" opacity={0.34} />
);

function Fortress({ corrupt }: { corrupt: boolean }) {
  const top = corrupt ? "#93407f" : "#2f8672";
  const left = corrupt ? "#632758" : "#1f6253";
  const right = corrupt ? "#471b40" : "#164a3e";
  const trim = corrupt ? P.glitch : P.gold;
  const s = 0.62;
  const h = 28;
  const w = HW * s;
  const d = HH * s;
  return (
    <g className={corrupt ? "jitter" : undefined}>
      <Box s={s} h={h} top={top} left={left} right={right} edge={trim} />
      {/* battlements along the two front walls */}
      <polyline
        points={`${-w},${-h - 2} 0,${-h + d - 2} ${w},${-h - 2}`}
        fill="none"
        stroke={top}
        strokeWidth={5}
        strokeDasharray="5 4"
      />
      {/* gate */}
      <polygon
        points={`${w * 0.28},${d * 0.72} ${w * 0.72},${d * 0.28} ${w * 0.72},${d * 0.28 - 15} ${w * 0.28},${d * 0.72 - 15}`}
        fill={P.b950}
        stroke={trim}
        strokeWidth={1}
      />
      {/* beacon */}
      <line x1={0} y1={-h} x2={0} y2={-h - 10} stroke={P.silkDim} strokeWidth={1.2} />
      <circle cx={0} cy={-h - 11} r={2.4} fill={trim} className={corrupt ? "flicker" : undefined} />
    </g>
  );
}

function Trapdoor() {
  return (
    <g>
      <polygon points="0,-14 28,0 0,14 -28,0" fill={P.b950} stroke={P.cyan} strokeWidth={1.2} strokeDasharray="4 3" />
      <path d="M-14,0 L0,-7 M-7,3.5 L7,-3.5 M0,7 L14,0" stroke={P.cyan} strokeWidth={1} opacity={0.55} />
      <path d="M-5,6 h10" stroke={P.cyan} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Doc() {
  return (
    <g>
      <Shadow rx={10} />
      <g className="float">
        <path d="M-9,-36 h12 l6,6 v19 h-18 z" fill={P.silk} />
        <path d="M3,-36 v6 h6" fill="#c4d4cb" />
        <path d="M-5,-25 h10 M-5,-21 h10 M-5,-17 h6" stroke={P.b600} strokeWidth={1.5} />
      </g>
    </g>
  );
}

function Key() {
  return (
    <g>
      <Shadow rx={12} />
      <g className="float">
        <g transform="rotate(-10 0 -24)">
          <rect x={-14} y={-33} width={28} height={18} rx={2.5} fill={P.gold} />
          <rect x={-14} y={-28} width={28} height={3.5} fill="#7a5f1d" />
          <rect x={-10} y={-22} width={7} height={5} rx={1} fill="#fff3cf" />
          <circle cx={9} cy={-19.5} r={1.8} fill="#7a5f1d" />
        </g>
      </g>
    </g>
  );
}

function Sheet() {
  return (
    <g>
      <Shadow rx={11} />
      <g className="float">
        <path d="M0,-42 v6" stroke={P.silkDim} strokeWidth={1.4} />
        <rect x={-11} y={-36} width={22} height={27} rx={3} fill={P.silk} />
        <circle cx={-4} cy={-27} r={3.6} fill={P.cyan} />
        <path d="M2,-29 h6 M2,-25 h6 M-7,-18 h14 M-7,-14 h10" stroke={P.b600} strokeWidth={1.5} />
      </g>
    </g>
  );
}

function Log() {
  return (
    <g>
      <Shadow rx={14} />
      <path d="M-12,-24 v20 a12,5.5 0 0 0 24,0 v-20 z" fill="#8a4c2a" />
      <path d="M-12,-16 a12,5.5 0 0 0 24,0 M-12,-9 a12,5.5 0 0 0 24,0" fill="none" stroke={P.b950} strokeWidth={1.2} opacity={0.55} />
      <ellipse cx={0} cy={-24} rx={12} ry={5.5} fill={P.copper} />
      <ellipse cx={0} cy={-24} rx={5} ry={2.3} fill="#8a4c2a" />
    </g>
  );
}

export function GlitchSprite({ type }: { type: string }) {
  switch (type) {
    case "nest":
      return (
        <g>
          <Shadow rx={18} />
          <g className="jitter">
            <polygon points="-20,0 -24,-16 -14,-13 -11,-32 -2,-20 4,-35 12,-18 22,-24 19,0" fill="#93407f" stroke={P.glitch} strokeWidth={1.2} />
            <polygon points="-12,0 -15,-11 -6,-22 0,-12 7,-24 14,-10 11,0" fill={P.glitch} />
            {/* 3 eyes for nest */}
            <rect x={-11} y={-15} width={4} height={4} fill="#fff" />
            <rect x={-2} y={-21} width={4.5} height={4.5} fill={P.cyan} />
            <rect x={7} y={-14} width={4} height={4} fill="#fff" />
            <rect x={-9.5} y={-13.5} width={2} height={2} fill={P.b950} />
            <rect x={-0.5} y={-19.5} width={2} height={2} fill={P.b950} />
            <rect x={8.5} y={-12.5} width={2} height={2} fill={P.b950} />
          </g>
          <rect x={-25} y={-26} width={14} height={2.2} fill={P.cyan} className="glitchbar" />
          <rect x={12} y={-11} width={14} height={2.2} fill={P.gold} className="glitchbar" style={{ animationDelay: "0.25s" }} />
        </g>
      );

    case "boss-1": // The Fragmenter (Ֆրագմենտատոր) - shattered geometric shards
      return (
        <g>
          <Shadow rx={20} />
          <g className="jitter">
            <polygon points="-18,-6 -24,-26 -8,-38 0,-28 10,-42 24,-24 17,-5 0,2" fill="#471b40" stroke={P.glitch} strokeWidth={1.5} />
            <polygon points="-14,-10 -18,-24 -5,-33 0,-22" fill={P.glitch} opacity={0.85} />
            <polygon points="14,-10 19,-22 8,-36 2,-22" fill={P.cyan} opacity={0.75} />
            {/* floating shard fragments */}
            <polygon points="-28,-30 -22,-38 -19,-28" fill={P.glitch} className="float" />
            <polygon points="28,-32 21,-40 20,-29" fill={P.cyan} className="float-slow" />
            <polygon points="0,-48 -6,-41 6,-41" fill={P.gold} className="float" />
            {/* menacing visor eyes */}
            <polygon points="-11,-21 -2,-18 -2,-23 -11,-25" fill="#fff" />
            <polygon points="11,-21 2,-18 2,-23 11,-25" fill="#fff" />
            <rect x={-7} y={-22} width={3} height={3} fill={P.red} />
            <rect x={4} y={-22} width={3} height={3} fill={P.red} />
            <path d="M-9,-10 l4,-3 5,3 5,-3 4,3" fill="none" stroke={P.cyan} strokeWidth={1.8} />
          </g>
          <rect x={-26} y={-18} width={16} height={2.5} fill={P.glitch} className="glitchbar" />
          <rect x={10} y={-34} width={16} height={2.5} fill={P.cyan} className="glitchbar" style={{ animationDelay: "0.2s" }} />
        </g>
      );

    case "boss-2": // The Stream Eater (Հոսքակեր) - corrupted pipe/leech leviathan
      return (
        <g>
          <Shadow rx={22} />
          <g className="float">
            {/* side pipes */}
            <rect x={-26} y={-28} width={10} height={14} rx={2} fill="#3a1c3d" stroke={P.copper} strokeWidth={1.4} />
            <rect x={16} y={-28} width={10} height={14} rx={2} fill="#3a1c3d" stroke={P.copper} strokeWidth={1.4} />
            {/* main body */}
            <ellipse cx={0} cy={-21} rx={18} ry={17} fill="#5c164e" stroke={P.glitch} strokeWidth={1.6} />
            {/* maw */}
            <circle cx={0} cy={-19} r={10} fill={P.b950} stroke={P.copper} strokeWidth={1.5} />
            <polygon points="-7,-24 -4,-19 -1,-25 2,-19 5,-25 7,-20" fill={P.silk} />
            <polygon points="-6,-13 -3,-18 0,-12 3,-18 6,-13" fill={P.silk} />
            {/* glowing eyes above maw */}
            <circle cx={-8} cy={-31} r={3} fill={P.gold} />
            <circle cx={8} cy={-31} r={3} fill={P.gold} />
            <circle cx={-8} cy={-31} r={1.3} fill={P.b950} />
            <circle cx={8} cy={-31} r={1.3} fill={P.b950} />
            {/* toxic stream drips */}
            <circle cx={-21} cy={-10} r={2.2} fill={P.glitch} className="drip" />
            <circle cx={21} cy={-10} r={2.2} fill={P.cyan} className="drip" style={{ animationDelay: "0.35s" }} />
          </g>
        </g>
      );

    case "boss-3": // The Infinite Loop (Անվերջ Ցիկլ) - ouroboros infinity cyber core
      return (
        <g>
          <Shadow rx={20} />
          <g className="float-slow">
            <ellipse
              cx={0}
              cy={-24}
              rx={22}
              ry={18}
              fill="none"
              stroke={P.violet}
              strokeWidth={3}
              strokeDasharray="8 5"
              className="portal-spin"
            />
            {/* infinity symbol */}
            <path
              d="M-14,-24 C-14,-32 -4,-32 0,-24 C4,-16 14,-16 14,-24 C14,-32 4,-32 0,-24 C-4,-16 -14,-16 -14,-24 Z"
              fill="#2c1654"
              stroke={P.glitch}
              strokeWidth={2.4}
            />
            <circle cx={-8} cy={-24} r={3.5} fill={P.cyan} />
            <circle cx={8} cy={-24} r={3.5} fill={P.gold} />
            <circle cx={-8} cy={-24} r={1.5} fill={P.b950} />
            <circle cx={8} cy={-24} r={1.5} fill={P.b950} />
            <text x={0} y={-4} textAnchor="middle" fontSize={7.5} fill={P.gold}>
              while(1)
            </text>
          </g>
        </g>
      );

    case "boss-4": // The Wildcard Phantom (Ուայլդքարդ Ուրվական) - shifting wraith with ? * []
      return (
        <g>
          <Shadow rx={19} />
          <g className="float">
            {/* ghost cloak */}
            <path
              d="M-18,-4 L-20,-24 A20,20 0 0 1 20,-24 L18,-4 L12,-10 L6,-3 L0,-10 L-6,-3 L-12,-10 Z"
              fill="#1f1037"
              stroke={P.cyan}
              strokeWidth={1.6}
            />
            <path
              d="M-14,-8 L-15,-23 A15,15 0 0 1 15,-23 L14,-8 Z"
              fill={P.violet}
              opacity={0.35}
              className="flicker"
            />
            {/* phantom mask */}
            <polygon points="-10,-26 -3,-22 -3,-28" fill={P.glitch} />
            <polygon points="10,-26 3,-22 3,-28" fill={P.glitch} />
            <text x={-18} y={-36} fontSize={10} fontWeight={700} fill={P.gold}>
              *
            </text>
            <text x={14} y={-36} fontSize={10} fontWeight={700} fill={P.cyan}>
              ?
            </text>
            <text x={0} y={-41} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={P.glitch}>
              [0-9]
            </text>
          </g>
        </g>
      );

    case "boss-5": // Rootkit Overlord (Ռութքիթ Տիրակալ) - armored crown + chmod 700 shield
      return (
        <g>
          <Shadow rx={22} />
          <g className="jitter">
            {/* armored torso */}
            <polygon points="-22,-4 -26,-26 -14,-36 14,-36 26,-26 22,-4" fill="#3b0a1e" stroke={P.red} strokeWidth={1.8} />
            {/* crown */}
            <polygon points="-14,-36 -16,-48 -7,-41 0,-51 7,-41 16,-48 14,-36" fill={P.gold} stroke={P.red} strokeWidth={1.2} />
            {/* glowing eyes */}
            <polygon points="-13,-27 -3,-24 -3,-29 -13,-31" fill={P.red} />
            <polygon points="13,-27 3,-24 3,-29 13,-31" fill={P.red} />
            {/* shield emblem */}
            <polygon points="0,-21 10,-17 8,-7 0,-3 -8,-7 -10,-17" fill={P.b950} stroke={P.gold} strokeWidth={1.4} />
            <text x={0} y={-10} textAnchor="middle" fontSize={7} fontWeight={700} fill={P.red}>
              700
            </text>
          </g>
          <rect x={-28} y={-30} width={14} height={2.5} fill={P.red} className="glitchbar" />
          <rect x={14} y={-16} width={14} height={2.5} fill={P.gold} className="glitchbar" style={{ animationDelay: "0.25s" }} />
        </g>
      );

    case "single":
    default:
      return (
        <g>
          <Shadow rx={14} />
          <g className="jitter">
            <polygon points="-14,0 -17,-13 -9,-10 -7,-27 0,-16 7,-29 9,-12 17,-17 13,0" fill={P.glitch} />
            <rect x={-7} y={-13} width={4.5} height={4.5} fill="#fff" />
            <rect x={3} y={-13} width={4.5} height={4.5} fill="#fff" />
            <rect x={-5.5} y={-11.5} width={2} height={2} fill={P.b950} />
            <rect x={4.5} y={-11.5} width={2} height={2} fill={P.b950} />
            <path d="M-6,-4 l3,-2.5 3,2.5 3,-2.5 3,2.5" fill="none" stroke="#4a0a3e" strokeWidth={1.4} />
          </g>
          <rect x={-22} y={-22} width={11} height={2} fill={P.cyan} className="glitchbar" />
          <rect x={10} y={-8} width={12} height={2} fill="#fff" className="glitchbar" style={{ animationDelay: "0.3s" }} />
        </g>
      );
  }
}

function Bot() {
  return (
    <g>
      <Shadow rx={11} />
      <g className="float-slow">
        <rect x={-9} y={-19} width={18} height={16} rx={5} fill="#c8dbd1" />
        <rect x={-3} y={-14} width={6} height={3} rx={1.5} fill={P.green} />
        <rect x={-8.5} y={-33} width={17} height={13} rx={4.5} fill={P.silk} />
        <rect x={-5.5} y={-29.5} width={11} height={5.5} rx={2.5} fill={P.b800} />
        <circle cx={-2.6} cy={-26.8} r={1.3} fill={P.cyan} />
        <circle cx={2.6} cy={-26.8} r={1.3} fill={P.cyan} />
        <path d="M0,-33 v-5" stroke={P.silk} strokeWidth={1.3} />
        <circle cx={0} cy={-39} r={2} fill={P.green} />
      </g>
    </g>
  );
}

function Tank({ level, sludge }: { level: number; sludge: boolean }) {
  const H = 30;
  const l = Math.max(0, Math.min(1, level)) * H;
  const col = sludge ? P.glitch : P.green;
  return (
    <g>
      <Shadow rx={15} />
      <path d={`M-13,${-H} v${H} a13,6 0 0 0 26,0 v${-H}`} fill={P.b950} opacity={0.7} />
      {l > 0 && (
        <g style={{ transition: "all .6s" }}>
          <path d={`M-13,${-l} v${l} a13,6 0 0 0 26,0 v${-l} z`} fill={col} opacity={0.75} />
          <ellipse cx={0} cy={-l} rx={13} ry={6} fill={col} />
        </g>
      )}
      <path d={`M-13,${-H} v${H} a13,6 0 0 0 26,0 v${-H}`} fill="none" stroke={P.silkDim} strokeWidth={1.3} />
      <ellipse cx={0} cy={-H} rx={13} ry={6} fill="rgba(238,243,234,.07)" stroke={P.silkDim} strokeWidth={1.3} />
      <path d="M-9,-22 v14" stroke="#fff" strokeWidth={1.4} opacity={0.3} strokeLinecap="round" />
    </g>
  );
}

function Crystal() {
  return (
    <g>
      <Shadow rx={11} />
      <polygon points="0,-6 10,-1 0,4 -10,-1" fill={P.b600} stroke={P.violet} strokeWidth={0.8} />
      <g className="float">
        <polygon points="0,-42 9,-31 6,-9 -6,-9 -9,-31" fill={P.violet} />
        <polygon points="0,-42 9,-31 0,-27" fill="#e6dcff" />
        <polygon points="0,-27 6,-9 -6,-9" fill="#8468d8" />
        <polygon points="0,-42 -9,-31 0,-27" fill="#cdbdff" />
      </g>
    </g>
  );
}

function Portal({ broken }: { broken: boolean }) {
  const col = broken ? P.red : P.cyan;
  return (
    <g>
      <ellipse cx={0} cy={2} rx={15} ry={6} fill={col} opacity={0.22} />
      <g className={broken ? "flicker" : undefined}>
        <ellipse
          cx={0}
          cy={-21}
          rx={13}
          ry={20}
          fill={col}
          fillOpacity={0.13}
          stroke={col}
          strokeWidth={2.4}
          strokeDasharray="6 4"
          className={broken ? undefined : "portal-spin"}
        />
        <ellipse cx={0} cy={-21} rx={7} ry={12} fill="none" stroke={col} strokeWidth={1} opacity={0.6} />
        {broken ? (
          <path d="M-6,-39 l5,10 -6,6 8,9 -4,10 M-17,-33 l-6,-4 M16,-10 l7,3 M-15,-5 l-7,2" fill="none" stroke={P.red} strokeWidth={1.6} />
        ) : (
          <path d="M-3,-25 l5,4 -5,4" fill="none" stroke={col} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </g>
    </g>
  );
}

export function BossShieldOverlay({ shielded }: { shielded: boolean }) {
  if (shielded) {
    return (
      <g className="boss-shield-active">
        {/* Isometric ground energy barrier */}
        <ellipse
          cx={0}
          cy={1}
          rx={33}
          ry={15}
          fill={P.cyan}
          fillOpacity={0.14}
          stroke={P.cyan}
          strokeWidth={1.8}
          strokeDasharray="6 4"
          className="portal-spin"
        />
        <ellipse
          cx={0}
          cy={1}
          rx={27}
          ry={12}
          fill="none"
          stroke={P.gold}
          strokeWidth={1.1}
          strokeDasharray="4 3"
          opacity={0.85}
        />
        {/* Hexagonal force-field dome around the Boss */}
        <polygon
          points="0,-54 30,-38 30,-8 0,7 -30,-8 -30,-38"
          fill={P.cyan}
          fillOpacity={0.13}
          stroke={P.cyan}
          strokeWidth={1.7}
          strokeLinejoin="round"
          className="core-pulse"
        />
        <polygon
          points="0,-50 26,-35 26,-10 0,4 -26,-10 -26,-35"
          fill={P.glitch}
          fillOpacity={0.07}
          stroke={P.gold}
          strokeWidth={1.2}
          strokeDasharray="5 3"
          className="portal-spin"
        />
        {/* Energy lattice lines */}
        <path
          d="M-30,-38 L30,-8 M30,-38 L-30,-8 M0,-54 L0,7"
          stroke={P.cyan}
          strokeWidth={0.75}
          opacity={0.35}
        />
        {/* Hex vertices */}
        {[
          [0, -54],
          [30, -38],
          [30, -8],
          [0, 7],
          [-30, -8],
          [-30, -38],
        ].map(([vx, vy], i) => (
          <circle key={i} cx={vx} cy={vy} r={2} fill={i % 2 === 0 ? P.cyan : P.gold} />
        ))}
        {/* Floating Armenian Shield Badge */}
        <g className="float" transform="translate(0, -68)">
          <rect
            x={-54}
            y={-12}
            width={108}
            height={21}
            rx={4}
            fill="#041821"
            fillOpacity={0.94}
            stroke={P.cyan}
            strokeWidth={1.2}
          />
          <text x={0} y={-2} textAnchor="middle" fontSize={7.6} fontWeight={700} fill={P.cyan}>
            🛡 ՎԱՀԱՆ ԱԿՏԻՎ
          </text>
          <text x={0} y={6.5} textAnchor="middle" fontSize={6.4} fontWeight={600} fill={P.gold}>
            ՊԱՇՏՊԱՆՎԱԾ
          </text>
        </g>
      </g>
    );
  }

  return (
    <g className="boss-shield-down">
      {/* Pulsing vulnerability target reticle on ground */}
      <ellipse
        cx={0}
        cy={1}
        rx={31}
        ry={14}
        fill={P.red}
        fillOpacity={0.12}
        stroke={P.red}
        strokeWidth={1.6}
        strokeDasharray="5 4"
        className="portal-spin"
      />
      {/* Target lock brackets around Boss */}
      <g stroke={P.red} strokeWidth={1.7} fill="none" className="core-pulse">
        <path d="M-26,-44 H-18 M-26,-44 V-36" />
        <path d="M26,-44 H18 M26,-44 V-36" />
        <path d="M-26,-2 H-18 M-26,-2 V-10" />
        <path d="M26,-2 H18 M26,-2 V-10" />
        <line x1={-30} y1={-23} x2={-23} y2={-23} stroke={P.glitch} />
        <line x1={23} y1={-23} x2={30} y2={-23} stroke={P.glitch} />
      </g>
      {/* Floating Armenian Vulnerability Badge */}
      <g className="float" transform="translate(0, -66)">
        <rect
          x={-64}
          y={-11}
          width={128}
          height={19}
          rx={4}
          fill="#260616"
          fillOpacity={0.94}
          stroke={P.red}
          strokeWidth={1.2}
        />
        <text x={0} y={1.5} textAnchor="middle" fontSize={7.4} fontWeight={700} fill={P.red}>
          ⚔ ՎԱՀԱՆԸ ԱՆՋԱՏՎԱԾ Է
        </text>
      </g>
    </g>
  );
}

export function Sprite(p: {
  kind: Kind;
  name: string;
  broken?: boolean;
  level?: number;
  sludge?: boolean;
  glitch?: string;
  shielded?: boolean;
}) {
  switch (p.kind) {
    case "dir":
      return <Fortress corrupt={Boolean(p.glitch) || /glitch|virus|malware|nest|boss/i.test(p.name)} />;
    case "trapdoor":
      return <Trapdoor />;
    case "portal":
      return <Portal broken={!!p.broken} />;
    case "crystal":
      return <Crystal />;
    case "key":
      return <Key />;
    case "sheet":
      return <Sheet />;
    case "log":
      return <Log />;
    case "monster":
      return (
        <g>
          <GlitchSprite type={p.glitch ?? "single"} />
          {p.glitch?.startsWith("boss-") && p.shielded !== undefined && <BossShieldOverlay shielded={p.shielded} />}
        </g>
      );
    case "bot":
      return <Bot />;
    case "tank":
      return <Tank level={p.level ?? 0} sludge={!!p.sludge} />;
    default:
      return <Doc />;
  }
}

/** The player. A wireframe until avatar.cfg exists; suit, hat and colour come straight from that file. */
export function AvatarSprite({ av }: { av: Avatar }) {
  if (!av.exists) {
    return (
      <g fill="none" stroke={P.silkDim} strokeWidth={1.2} strokeDasharray="3 3" className="flicker">
        <rect x={-8} y={-25} width={16} height={19} rx={6} />
        <rect x={-9.5} y={-41} width={19} height={15} rx={5.5} />
        <path d="M-4,-6 v7 M4,-6 v7" />
      </g>
    );
  }
  const tint = resolveAvatarColor(av.color);
  const rawSuit = (av.suit ?? av.cls ?? "").trim().toLowerCase();
  const body = rawSuit || tint ? (tint ?? "#cfe0d7") : "#7f968b";
  const glow = tint ?? (rawSuit ? P.gold : P.silkMute);
  const hat = (av.hat ?? "none").trim().toLowerCase();

  return (
    <g>
      <ellipse cx={0} cy={2} rx={11} ry={4.5} fill="#000" opacity={0.4} />

      {/* Back accessories for suits */}
      {rawSuit === "netrunner" && <path d="M-8,-12 q-12,2 -9,12" fill="none" stroke={glow} strokeWidth={1.4} />}
      {rawSuit === "spacesuit" && (
        <rect x={-11.5} y={-26} width={23} height={17} rx={4} fill={P.silkDim} stroke={P.b900} strokeWidth={1} />
      )}

      {/* Legs */}
      <rect x={-6.5} y={-8} width={5} height={9} rx={2} fill="#22362f" />
      <rect x={1.5} y={-8} width={5} height={9} rx={2} fill="#22362f" />

      {/* Torso / Suit */}
      <rect x={-8} y={-25} width={16} height={19} rx={6} fill={body} />

      {/* Suit-specific details */}
      {rawSuit === "cadet" && (
        <g>
          {/* Epaulets and rank chevron */}
          <rect x={-10} y={-25} width={4} height={3} rx={1} fill={P.gold} />
          <rect x={6} y={-25} width={4} height={3} rx={1} fill={P.gold} />
          <path d="M-4,-18 l4,3 4,-3" fill="none" stroke={P.b950} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      )}
      {rawSuit === "spacesuit" && (
        <g>
          {/* Chest life-support unit & collar ring */}
          <ellipse cx={0} cy={-25} rx={8.5} ry={2.2} fill={P.silk} stroke={P.b900} strokeWidth={0.8} />
          <rect x={-5} y={-21} width={10} height={8} rx={1.5} fill={P.b900} stroke={P.silk} strokeWidth={0.8} />
          <circle cx={-2} cy={-17} r={1.3} fill={P.green} />
          <circle cx={2} cy={-17} r={1.3} fill={glow} />
        </g>
      )}
      {rawSuit === "hoodie" && (
        <g>
          {/* Hoodie pocket, drawstrings & neon trim */}
          <path d="M-6,-14 h12 l-1.5,6 h-9 z" fill={P.b900} opacity={0.45} />
          <path d="M-2.5,-25 v6 M2.5,-25 v6" stroke={P.silk} strokeWidth={1.2} strokeLinecap="round" />
          <path d="M-7.5,-22 v13 M7.5,-22 v13" stroke={glow} strokeWidth={1.2} opacity={0.85} />
        </g>
      )}
      {rawSuit === "armor" && (
        <g>
          {/* Cyber armor pauldrons & glowing core */}
          <polygon points="-13,-26 -6,-26 -8,-18 -14,-20" fill={P.b800} stroke={glow} strokeWidth={1} />
          <polygon points="13,-26 6,-26 8,-18 14,-20" fill={P.b800} stroke={glow} strokeWidth={1} />
          <polygon points="0,-22 4,-17 0,-12 -4,-17" fill={P.b950} stroke={glow} strokeWidth={1} />
          <circle cx={0} cy={-17} r={1.8} fill={glow} />
        </g>
      )}
      {!["cadet", "spacesuit", "hoodie", "armor"].includes(rawSuit) && (
        <rect x={-3.5} y={-19} width={7} height={3} rx={1.5} fill={P.b900} opacity={0.5} />
      )}

      {/* Head */}
      <rect x={-9.5} y={-41} width={19} height={15} rx={5.5} fill={P.silk} />
      <rect x={-6.5} y={-37} width={13} height={5.5} rx={2.75} fill={P.b900} />
      <circle cx={-3} cy={-34.2} r={1.4} fill={glow} />
      <circle cx={3} cy={-34.2} r={1.4} fill={glow} />

      {/* Legacy class accessories */}
      {rawSuit === "netrunner" && (
        <g>
          <path d="M6,-41 l4,-8" stroke={P.silkDim} strokeWidth={1.3} />
          <circle cx={10.5} cy={-50} r={2.1} fill={glow} className="led-on" style={{ color: glow }} />
        </g>
      )}
      {rawSuit === "guardian" && (
        <path d="M-17,-25 l6.5,2.5 v7 q0,6 -6.5,9 q-6.5,-3 -6.5,-9 v-7 z" fill={glow} stroke={P.b900} strokeWidth={1.2} />
      )}
      {rawSuit === "tinkerer" && (
        <g>
          <path d="M11,-7 l5,-14" stroke={P.silkDim} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={17} cy={-24} r={3.6} fill="none" stroke={P.silkDim} strokeWidth={2.3} strokeDasharray="16 6" />
          <path d="M-9.5,-39 h19" stroke={glow} strokeWidth={2} />
        </g>
      )}

      {/* Headgear (hat) */}
      {hat === "astro" && (
        <g>
          <circle cx={0} cy={-33.5} r={13.5} fill={P.cyan} fillOpacity={0.14} stroke={glow} strokeWidth={1.5} />
          <path d="M-8,-41 a10,10 0 0 1 10,-2" fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.55} strokeLinecap="round" />
          <line x1={0} y1={-47} x2={0} y2={-52} stroke={P.silk} strokeWidth={1.3} />
          <circle cx={0} cy={-53} r={2} fill={glow} />
        </g>
      )}
      {hat === "wizard" && (
        <g>
          <ellipse cx={0} cy={-41} rx={14} ry={3.2} fill="#251640" stroke={glow} strokeWidth={1.2} />
          <polygon points="-9,-41 2,-57 9,-41" fill="#251640" stroke={glow} strokeWidth={1.2} />
          <circle cx={0} cy={-46} r={1.6} fill={P.gold} />
        </g>
      )}
      {hat === "visor" && (
        <g>
          <polygon points="-11,-38 11,-38 9,-31 -9,-31" fill={glow} fillOpacity={0.85} stroke={P.b950} strokeWidth={1} />
          <line x1={-7} y1={-36} x2={7} y2={-36} stroke="#fff" strokeWidth={1.2} />
        </g>
      )}
      {hat === "catears" && (
        <g>
          <polygon points="-9,-40 -7,-49 -2,-41" fill={body} stroke={P.b900} strokeWidth={1} />
          <polygon points="9,-40 7,-49 2,-41" fill={body} stroke={P.b900} strokeWidth={1} />
          <polygon points="-7.5,-41 -6.5,-46 -3.5,-41" fill={glow} />
          <polygon points="7.5,-41 6.5,-46 3.5,-41" fill={glow} />
        </g>
      )}
      {hat === "captain" && (
        <g>
          <ellipse cx={0} cy={-40.5} rx={11.5} ry={2.4} fill={P.b950} stroke={P.gold} strokeWidth={1} />
          <path d="M-10,-41 l-2,-6 h24 l-2,6 z" fill="#17382f" stroke={glow} strokeWidth={1.2} />
          <circle cx={0} cy={-44} r={1.8} fill={P.gold} />
        </g>
      )}
    </g>
  );
}
