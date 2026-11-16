import { Dispatch, useState } from "react";
import { MISSIONS } from "../game/missions";
import type { Fx } from "../game/shell";
import { Action, Game, slotTile } from "../game/state";
import { FS, HOME, Inode, Kind, ROOT, basename, dirname, kindOf, lookup, normalize, tilde, toLines } from "../game/vfs";
import { cn } from "../utils/cn";
import { ManPanel } from "./ManPanel";
import { Refinery } from "./Refinery";
import { AvatarSprite, HH, HW, P, Sprite } from "./Sprites";

interface Ent {
  name: string;
  n: Inode;
  kind: Kind;
  broken: boolean;
  hidden: boolean;
  slot: number;
  x: number;
  y: number;
  depth: number;
}

type FxOf<T extends Fx["t"]> = Extract<Fx, { t: T }>;

const short = (s: string, n = 15) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const sc = (i: number, j: number) => `${(i - j) * HW},${(i + j) * HH}`;
const pos = (slot: number) => {
  const [i, j] = slotTile(slot);
  return { x: (i - j) * HW, y: (i + j) * HH, depth: i + j };
};

/* ---------- sector map (HTML overlay) ---------- */

interface MapRow {
  key: string;
  name: string;
  depth: number;
  here: boolean;
  link?: boolean;
  broken?: boolean;
}

function mapRows(
  fs: FS,
  cwd: string,
  herePath: string,
  dirId: number,
  xray: number | null,
  revealedDirs: Record<number, "ls" | "lsa">,
  playerFiles: Record<string, boolean>,
): MapRow[] {
  const inHome = cwd === HOME || cwd.startsWith(HOME + "/");
  const rootPath = inHome ? HOME : "/";
  const root = lookup(fs, rootPath);
  if (root.id == null) return [];
  const chain = new Set<number>();
  let acc = "";
  for (const c of herePath.split("/").filter(Boolean)) {
    acc += "/" + c;
    const id = lookup(fs, acc).id;
    if (id != null) chain.add(id);
  }
  const rows: MapRow[] = [];
  const walk = (id: number, name: string, path: string, depth: number) => {
    rows.push({ key: "d" + id, name, depth, here: id === dirId });
    const n = fs.inodes[id];
    const rev = revealedDirs[id];
    for (const k of Object.keys(n.entries).sort()) {
      const c = fs.inodes[n.entries[k]];
      const isPlayerCreated = Boolean(playerFiles[`${id}:${k}`]);
      if (c.type === "dir") {
        if (k.startsWith(".") && !chain.has(c.id) && xray !== id && rev !== "lsa" && !isPlayerCreated) continue;
        walk(c.id, k + "/", path + "/" + k, depth + 1);
      } else if (c.type === "link") {
        const visible = k.startsWith(".")
          ? rev === "lsa" || isPlayerCreated
          : rev === "ls" || rev === "lsa" || isPlayerCreated;
        if (!visible) continue;
        rows.push({
          key: "l" + c.id,
          name: k,
          depth: depth + 1,
          here: false,
          link: true,
          broken: lookup(fs, normalize(path, c.target)).id == null,
        });
      }
    }
  };
  walk(root.id, inHome ? "~" : "/", rootPath === "/" ? "" : rootPath, 0);
  return rows;
}

function SectorMap({ rows }: { rows: MapRow[] }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1100);
  return (
    <div className="pointer-events-auto w-fit max-w-[46vw] rounded border border-board-600 bg-board-950/85 backdrop-blur-sm sm:max-w-56">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="silk flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-silk-dim hover:text-silk"
      >
        Սեկտորի քարտեզ
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={cn("transition-transform", open && "rotate-180")}>
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      {open && (
        <ul className="max-h-44 overflow-auto border-t border-board-600 px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.55]">
          {rows.map((r) => (
            <li
              key={r.key}
              style={{ paddingLeft: r.depth * 11 }}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap",
                r.here ? "font-semibold text-gold" : r.link ? (r.broken ? "text-led-red" : "text-led-cyan") : "text-silk-dim",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block size-1.5 flex-none",
                  r.link ? "rounded-full border border-current" : r.here ? "bg-gold" : "border border-silk-mute",
                )}
              />
              <span className="truncate">{r.name}</span>
              {r.here && <span className="silk text-[9px] text-gold/80">դուք</span>}
              {r.link && <span className="text-[10px] opacity-80">{r.broken ? "կոտրված" : "պորտալ"}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LEGEND: [string, string, string][] = [
  [P.gold, "Ոսկեզօծ պատեր", "directory․ մտեք ներս cd-ով։"],
  [P.silk, "Սավառնող օբյեկտներ", "files․ բացահայտվում են ls-ով, կարդացվում՝ cat-ով։"],
  [P.cyan, "Երկնագույն օղակ", "symbolic link (պորտալ)․ կարմիրը նշանակում է կոտրված։"],
  [P.violet, "Մանուշակագույն միջուկ", "inode․ նույն միջուկը կիսող բյուրեղները hard links են։"],
  [P.glitch, "Մաջենտա", "վիրուսային խափանում․ rm-ով սկսեք մարտը։"],
  [P.cyan, "Կետագծային երկնագույն", "թաքնված .dotfile, բացահայտվում է ls -a-ով։"],
];

/* ---------- the scene ---------- */

export function WorldView({ game, dispatch }: { game: Game; dispatch: Dispatch<Action> }) {
  const { fs, fx, seq } = game;
  const [legend, setLegend] = useState(false);
  const m = MISSIONS[game.mi];
  const here = lookup(fs, game.cwd);
  const dirId = here.id ?? ROOT;
  const node = fs.inodes[dirId];
  const slots = game.layout[dirId] ?? {};
  const revState = game.revealedDirs[dirId];
  const xray = game.xray === dirId || revState === "lsa";
  const complete = game.phase === "complete";
  const isBossShielded = m.objectives.length > 1 && game.done.slice(0, -1).some((d) => !d);

  const all: Ent[] = Object.keys(node.entries).map((name) => {
    const n = fs.inodes[node.entries[name]];
    const slot = slots[name] ?? 0;
    return {
      name,
      n,
      kind: kindOf(name, n),
      broken: n.type === "link" && lookup(fs, normalize(here.path, n.target)).id == null,
      hidden: name.startsWith("."),
      slot,
      ...pos(slot),
    };
  });

  // Module E: Map Visibility Rule
  // - Non-hidden directories: ALWAYS visible as structural nodes.
  // - Hidden (.dot) directories: visible if revealedDirs[dirId] === "lsa" or playerFiles[dirId + ":" + e.name].
  // - Non-hidden files/links: ONLY visible if revealedDirs[dirId] is "ls" or "lsa", or playerFiles[dirId + ":" + e.name].
  // - Hidden files/links: ONLY visible if revealedDirs[dirId] === "lsa" or playerFiles[dirId + ":" + e.name].
  const isEntVisible = (e: Ent): boolean => {
    const isPlayerCreated = Boolean(game.playerFiles[`${dirId}:${e.name}`]);
    if (e.n.type === "dir") {
      if (!e.hidden) return true;
      return revState === "lsa" || xray || isPlayerCreated;
    }
    if (!e.hidden && e.n.glitch?.startsWith("boss-")) {
      return true;
    }
    if (e.hidden) {
      return revState === "lsa" || xray || isPlayerCreated;
    }
    return revState === "ls" || revState === "lsa" || isPlayerCreated;
  };

  const ents = all.filter(isEntVisible).sort((a, b) => a.depth - b.depth || a.x - b.x);
  const hasUnrevealedFiles = all.length > ents.length;
  const byName = new Map(ents.map((e) => [e.name, e]));

  const ghosts = fx.flatMap((f) =>
    f.t === "remove" && f.dir === dirId && f.slot != null ? [{ ...f, ...pos(f.slot), slot: f.slot }] : [],
  );

  // Floor grows in rings as the room fills up.
  const maxSlot = Math.max(8, ...all.map((e) => e.slot), ...ghosts.map((g) => g.slot));
  const N = Math.floor(Math.sqrt(maxSlot)) + 1;
  const W = N * HW;
  const T = 16;
  const right = { x: W, y: (N - 1) * HH };
  const bottom = { x: 0, y: (2 * N - 1) * HH };
  const left = { x: -W, y: (N - 1) * HH };
  const floor = `0,${-HH} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`;
  const av = { x: 0, y: (2 * N + 0.95) * HH };
  const TOP = 90;
  const vb = { x: -W - 66, y: -HH - TOP, w: 2 * (W + 66), h: av.y + 42 + HH + TOP };
  const q = 0.14;

  // Which effects from the last command land in this room?
  const touching = (name: string) =>
    fx.filter(
      (f) =>
        (f.t === "create" || f.t === "clone" || f.t === "rename" || f.t === "arrive" || f.t === "read" || f.t === "write") &&
        f.dir === dirId &&
        f.name === name,
    );
  const animOf = (name: string): { cls: string; ring?: string } => {
    const t = touching(name);
    if (!t.length) return { cls: "" };
    const created = t.find((f): f is FxOf<"create"> => f.t === "create");
    if (created) return { cls: created.how === "mkdir" ? "fx-rise" : "fx-materialize", ring: P.silk };
    if (t.some((f) => f.t === "clone")) return { cls: "fx-materialize", ring: P.cyan };
    if (t.some((f) => f.t === "arrive" || f.t === "rename")) return { cls: "fx-tele-in", ring: P.gold };
    return { cls: "fx-pulse" };
  };

  const scan = fx.find((f): f is FxOf<"scan"> => f.t === "scan" && f.dir === dirId);
  const err = fx.find((f): f is FxOf<"error"> => f.t === "error");
  const reads = fx.filter((f): f is FxOf<"read"> => f.t === "read" && f.dir === dirId && byName.has(f.name));
  const readEnt = reads.length ? byName.get(reads[reads.length - 1].name) : undefined;
  const beams = fx.flatMap((f) => {
    if (f.t !== "clone" || f.dir !== dirId || f.fromDir !== dirId) return [];
    const a = byName.get(f.fromName);
    const b = byName.get(f.name);
    return a && b && a !== b ? [{ a, b }] : [];
  });
  const castTarget = ents.find((e) => touching(e.name).length > 0) ?? ghosts[0];

  // Inode cores: every crystal shows its inode; hard links in the same room share one.
  const cores = new Map<number, Ent[]>();
  for (const e of ents) {
    if (e.n.type === "file" && (e.n.nlink > 1 || e.kind === "crystal")) {
      cores.set(e.n.id, [...(cores.get(e.n.id) ?? []), e]);
    }
  }

  // The cat projector.
  let holo: { x: number; y: number; h: number; lines: string[]; e: Ent } | null = null;
  if (readEnt && readEnt.n.type === "file") {
    const raw = toLines(readEnt.n.content);
    const lines = raw.length ? raw.slice(0, 4).map((l) => short(l, 25)) : ["(դատարկ file)"];
    if (raw.length > 4) lines[3] = `… ևս ${raw.length - 3} տող`;
    const h = lines.length * 10 + 9;
    holo = {
      e: readEnt,
      lines,
      h,
      x: Math.max(vb.x + 4, Math.min(vb.x + vb.w - 140, readEnt.x - 68)),
      y: Math.max(vb.y + 4, readEnt.y - 54 - h),
    };
  }

  const parent = game.cwd === "/" ? null : basename(dirname(game.cwd)) || "/";
  const rows = mapRows(fs, game.cwd, here.path, dirId, game.xray, game.revealedDirs, game.playerFiles);
  const describe = `Դուք գտնվում եք ${game.cwd}-ում։ ${
    ents.length
      ? "Այն պարունակում է՝ " + ents.map((e) => `${e.name} (${e.n.type === "dir" ? "directory" : e.n.type === "link" ? "symbolic link" : "file"})`).join(", ") + "։"
      : "Սենյակում տեսանելի օբյեկտներ չկան։"
  }`;

  return (
    <section className="pcb relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row" aria-label="Աշխարհի տեսք">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* HUD: where am I */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2.5">
          <div className="pointer-events-auto flex min-w-0 flex-col items-start gap-1.5">
            <span className="silk text-silk-mute">U2 · Աշխարհի տեսք</span>
            <div className="flex max-w-full items-center gap-2 rounded border border-board-600 bg-board-950/85 px-2 py-1 font-mono text-xs backdrop-blur-sm">
              <span className="text-gold">pwd</span>
              <span className="truncate text-silk" title={game.cwd}>
                {game.cwd}
              </span>
            </div>
            {xray && (
              <span className="silk fade-in rounded border border-led-cyan/60 bg-led-cyan/10 px-2 py-0.5 text-led-cyan">
                Ռենտգենն ակտիվ է · թաքնված անունները բացահայտված են
              </span>
            )}
            {!revState && hasUnrevealedFiles && (
              <span className="fade-in rounded border border-gold/40 bg-board-950/85 px-2 py-0.5 font-sans text-[11px] text-gold">
                Գործարկեք <code className="font-mono font-bold">ls</code>՝ սենյակի պարունակությունը սկանավորելու համար
              </span>
            )}
            {m.boss && !complete && (
              <span
                className={cn(
                  "fade-in flex items-center gap-1.5 rounded border px-2 py-0.5 font-sans text-[11px] font-medium backdrop-blur-sm",
                  isBossShielded
                    ? "border-led-cyan/60 bg-board-950/90 text-led-cyan"
                    : "border-led-red/70 bg-led-red/15 text-led-red",
                )}
              >
                {isBossShielded ? (
                  <>
                    <span>🛡 ՎԱՀԱՆ ԱԿՏԻՎ</span>
                    <span className="text-silk-dim">
                      · նախնական առաջադրանքներ ({game.done.slice(0, -1).filter(Boolean).length}/{Math.max(1, m.objectives.length - 1)})
                    </span>
                  </>
                ) : (
                  <>
                    <span>⚔ ՎԱՀԱՆԸ ԱՆՋԱՏՎԱԾ Է</span>
                    <span className="text-silk">· Բոսը խոցելի է rm-ով</span>
                  </>
                )}
              </span>
            )}
            {complete && (
              <div className="fade-in flex items-center gap-2.5 rounded border border-led-green/60 bg-board-950/90 px-2.5 py-1.5 backdrop-blur-sm">
                <span className="font-display text-sm font-semibold tracking-wide text-led-green">ՍԵԿՏՈՐԸ ՎԵՐԱԿԱՆԳՆՎԱԾ Է</span>
                {game.mi < MISSIONS.length - 1 && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "next" })}
                    className="rounded bg-led-green px-2.5 py-1 font-display text-xs font-semibold tracking-wide text-board-950 hover:brightness-110"
                  >
                    Հաջորդ առաքելությունը
                  </button>
                )}
              </div>
            )}
          </div>
          <SectorMap rows={rows} />
        </div>

        <div className="min-h-0 flex-1 p-1">
          <svg
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            className="h-full w-full"
            role="img"
            aria-label={describe}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <clipPath id="floor-clip">
                <polygon points={floor} />
              </clipPath>
              <linearGradient id="scan-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={P.gold} stopOpacity="0" />
                <stop offset="0.8" stopColor={P.gold} stopOpacity="0.55" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="scan-cyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={P.cyan} stopOpacity="0" />
                <stop offset="0.8" stopColor={P.cyan} stopOpacity="0.6" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.95" />
              </linearGradient>
              <radialGradient id="core-g">
                <stop offset="0" stopColor="#fff" />
                <stop offset="0.45" stopColor={P.violet} />
                <stop offset="1" stopColor={P.violet} stopOpacity="0" />
              </radialGradient>
            </defs>

            <g key={dirId} className="room-in">
              {/* slab */}
              <polygon points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + T} ${left.x},${left.y + T}`} fill="#0b2e27" />
              <polygon points={`${right.x},${right.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + T} ${right.x},${right.y + T}`} fill="#071f1a" />
              <polygon points={floor} fill="#15493e" stroke={complete ? P.green : P.gold} strokeWidth={1.4} strokeLinejoin="round" />
              {Array.from({ length: N - 1 }, (_, k) => (
                <g key={k} stroke="#21604f" strokeWidth={1} opacity={0.75}>
                  <line {...lineAt(k + 0.5, -0.5, k + 0.5, N - 0.5)} />
                  <line {...lineAt(-0.5, k + 0.5, N - 0.5, k + 0.5)} />
                </g>
              ))}
              <polygon
                points={`${sc(-0.5 + q, -0.5 + q)} ${sc(N - 0.5 - q, -0.5 + q)} ${sc(N - 0.5 - q, N - 0.5 - q)} ${sc(-0.5 + q, N - 0.5 - q)}`}
                fill="none"
                stroke={complete ? P.green : P.gold}
                strokeWidth={1}
                opacity={0.38}
              />
              {Array.from({ length: N * N }, (_, k) => {
                const p = pos(k);
                return <ellipse key={k} cx={p.x} cy={p.y} rx={10} ry={5} fill="#103a31" stroke={P.goldDim} strokeWidth={0.8} opacity={0.6} />;
              })}
              {xray && <polygon points={floor} fill={P.cyan} opacity={0.07} />}
              {scan && (
                <g clipPath="url(#floor-clip)">
                  <rect
                    key={seq}
                    className="fx-scan"
                    x={-W}
                    y={-HH - 40}
                    width={2 * W}
                    height={40}
                    fill={`url(#${scan.xray ? "scan-cyan" : "scan-gold"})`}
                    style={{ ["--to" as string]: `${2 * N * HH + 40}px` }}
                  />
                </g>
              )}

              {/* silkscreen: room address on the slab edge, objective LEDs on the other */}
              <text transform={`matrix(1,0.5,0,1,${left.x + 14},${left.y + 18.5})`} fontSize={9} letterSpacing={1} fill={P.silkDim}>
                {short(tilde(game.cwd), 2 + N * 7)}
              </text>
              {game.done.map((d, i) => {
                const dx = 15 + i * 12;
                return (
                  <circle
                    key={i}
                    cx={bottom.x + dx}
                    cy={bottom.y - dx / 2 + 8.5}
                    r={2.8}
                    fill={d ? P.green : "#24493f"}
                    stroke={P.b950}
                    strokeWidth={0.8}
                    className={d ? "led-on" : undefined}
                    style={{ color: P.green }}
                  >
                    <title>{`Նպատակ ${i + 1}: ${d ? "ավարտված" : "բաց"}`}</title>
                  </circle>
                );
              })}

              {/* entry pad, bridge and the way back up */}
              <line x1={0} y1={bottom.y + T} x2={0} y2={av.y - HH * 0.8} stroke={P.gold} strokeWidth={3} />
              <polygon
                points={`0,${av.y - HH * 0.8 + 5} ${HW * 0.8},${av.y + 5} 0,${av.y + HH * 0.8 + 5} ${-HW * 0.8},${av.y + 5}`}
                fill="#071f1a"
              />
              <polygon
                points={`0,${av.y - HH * 0.8} ${HW * 0.8},${av.y} 0,${av.y + HH * 0.8} ${-HW * 0.8},${av.y}`}
                fill="#1c5a4c"
                stroke={P.gold}
                strokeWidth={1.2}
              />
              {parent && (
                <g>
                  <path d={`M${-HW * 0.8},${av.y} l-20,10 m0,0 l7,0.5 m-7,-0.5 l4,-6`} fill="none" stroke={P.goldDim} strokeWidth={1.6} strokeLinecap="round" />
                  <text className="lbl" x={-HW * 0.8 - 24} y={av.y + 14} textAnchor="end" fill={P.silkDim}>
                    <tspan fill={P.gold}>cd ..</tspan> {short(parent, 12)}
                  </text>
                </g>
              )}

              {ents.length === 0 && (
                <text className="lbl" x={0} y={(N - 1) * HH + 3} textAnchor="middle" fill={P.silkMute}>
                  {hasUnrevealedFiles
                    ? "Գործարկեք ls՝ սենյակի պարունակությունը սկանավորելու համար"
                    : "դատարկ սենյակ"}
                </text>
              )}

              {/* things that just left */}
              {ghosts.map((g) => (
                <g key={`ghost-${g.name}-${seq}`} transform={`translate(${g.x},${g.y})`}>
                  {g.how === "mv" && <ellipse className="fx-ring" cx={0} cy={0} rx={24} ry={12} fill="none" stroke={P.gold} strokeWidth={2} />}
                  <g className={g.how === "mv" ? "fx-tele-out" : "fx-vanish"}>
                    <Sprite kind={g.kind} name={g.name} />
                  </g>
                </g>
              ))}

              {/* things that are here */}
              {ents.map((e) => {
                const a = animOf(e.name);
                return (
                  <g key={e.name + (a.cls ? ":" + seq : "")} transform={`translate(${e.x},${e.y})`}>
                    {e.hidden && <ellipse cx={0} cy={0} rx={25} ry={12.5} fill="none" stroke={P.cyan} strokeWidth={1} strokeDasharray="3 4" opacity={0.8} />}
                    {a.ring && <ellipse className="fx-ring" cx={0} cy={0} rx={24} ry={12} fill="none" stroke={a.ring} strokeWidth={2} />}
                    <g className={a.cls || undefined} opacity={e.hidden ? 0.82 : 1}>
                      <Sprite
                        kind={e.kind}
                        name={e.name}
                        broken={e.broken}
                        level={toLines(e.n.content).length / 10}
                        sludge={/MALWARE|CORRUPT/.test(e.n.content)}
                        glitch={e.n.glitch}
                        shielded={e.n.glitch?.startsWith("boss-") ? isBossShielded : undefined}
                      />
                    </g>
                  </g>
                );
              })}

              {/* labels sit above every sprite so nothing hides a name */}
              {ents.map((e) => {
                const fill =
                  e.n.type === "link" ? (e.broken ? P.red : P.cyan) : e.n.type === "dir" ? P.gold : e.kind === "monster" ? P.glitch : e.hidden ? P.cyan : P.silk;
                return (
                  <g key={"l-" + e.name}>
                    <text className="lbl" x={e.x} y={e.y + 21} textAnchor="middle" fill={fill}>
                      {short(e.name)}
                      {e.n.type === "dir" ? "/" : ""}
                    </text>
                    {e.n.type === "link" && (
                      <text className="lbl" x={e.x} y={e.y + 31} textAnchor="middle" fill={fill} fontSize={8.5} opacity={0.9}>
                        {e.broken ? "✕ " : "→ "}
                        {short(e.n.target, 18)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* inode cores */}
              {[...cores.entries()].map(([id, members]) => {
                const cx = members.reduce((s, e) => s + e.x, 0) / members.length;
                const cy = Math.min(...members.map((e) => e.y)) - 76;
                const nlink = members[0].n.nlink;
                const away = nlink - members.length;
                return (
                  <g key={"core-" + id}>
                    {members.map((e) => (
                      <line key={e.name} x1={e.x} y1={e.y - 43} x2={cx} y2={cy + 6} stroke={P.violet} strokeWidth={1.5} opacity={0.85} />
                    ))}
                    {away > 0 && (
                      <g>
                        <line x1={cx + 6} y1={cy - 4} x2={cx + 38} y2={cy - 20} stroke={P.violet} strokeWidth={1.3} strokeDasharray="3 3" opacity={0.8} />
                        <text className="lbl" x={cx + 40} y={cy - 22} fill={P.violet} fontSize={8.5}>
                          +{away} մեկ այլ սենյակում
                        </text>
                      </g>
                    )}
                    <circle cx={cx} cy={cy} r={15} fill="url(#core-g)" className="core-pulse" />
                    <circle cx={cx} cy={cy} r={5} fill="#fff" />
                    <text className="lbl" x={cx - 12} y={cy + 3} textAnchor="end" fill={P.violet}>
                      inode {id}
                    </text>
                    <text className="lbl" x={cx} y={cy - 17} textAnchor="middle" fill={P.silk} fontSize={8.5}>
                      {nlink} անուն
                    </text>
                  </g>
                );
              })}

              {/* beams */}
              {beams.map(({ a, b }, i) => (
                <line key={`beam-${i}-${seq}`} className="fx-beam" x1={a.x} y1={a.y - 20} x2={b.x} y2={b.y - 20} stroke={P.cyan} strokeLinecap="round" />
              ))}
              {castTarget && (
                <line
                  key={`cast-${seq}`}
                  className="fx-cast"
                  x1={av.x}
                  y1={av.y - 36}
                  x2={castTarget.x}
                  y2={castTarget.y - 18}
                  stroke={P.gold}
                  strokeWidth={1.6}
                />
              )}
              {err?.kind === "bump" && (
                <path
                  key={`wall-${seq}`}
                  className="fx-barrier"
                  d={`M-34,${bottom.y - 17} L0,${bottom.y} L34,${bottom.y - 17}`}
                  fill="none"
                  stroke={P.red}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                />
              )}

              {/* you */}
              <g transform={`translate(${av.x},${av.y})`}>
                <g key={err ? `e${seq}` : "idle"} className={err ? (err.kind === "bump" ? "fx-bump" : "fx-shake") : undefined}>
                  <AvatarSprite av={game.avatar} />
                </g>
                {err && (
                  <g key={`b${seq}`} className="fx-pop">
                    <path d="M14,-46 l-5,7 9,-3 z" fill={P.red} />
                    <rect x={10} y={-62} width={46} height={17} rx={3} fill={P.red} />
                    <text x={33} y={-50} textAnchor="middle" fontSize={9.5} fontWeight={600} fill={P.b950}>
                      stderr!
                    </text>
                  </g>
                )}
                <text className="lbl" x={0} y={34} textAnchor="middle" fill={P.gold}>
                  {short(game.avatar.name ?? "դուք", 14)}
                </text>
              </g>

              {/* cat projector */}
              {holo && (
                <g key={`holo-${seq}`}>
                  <path d={`M${holo.e.x},${holo.e.y - 40} L${holo.x + 58},${holo.y + holo.h} L${holo.x + 78},${holo.y + holo.h} Z`} fill={P.cyan} opacity={0.16} />
                  <g className="holo-in">
                    <rect x={holo.x} y={holo.y} width={136} height={holo.h} rx={3} fill="#062a33" fillOpacity={0.94} stroke={P.cyan} strokeWidth={1} />
                    {holo.lines.map((l, i) => (
                      <text key={i} x={holo!.x + 6} y={holo!.y + 11 + i * 10} fontSize={8.3} fill={P.cyan}>
                        {l}
                      </text>
                    ))}
                  </g>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* HUD: Character Preview card + legend */}
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex flex-col items-start gap-1.5 p-2.5">
          {legend && (
            <ul className="fade-in pointer-events-auto max-w-64 space-y-1 rounded border border-board-600 bg-board-950/95 p-2.5 text-[12px] leading-snug text-silk-dim">
              {LEGEND.map(([c, a, b]) => (
                <li key={a} className="flex gap-2">
                  <span aria-hidden className="mt-1 inline-block size-2 flex-none rounded-full" style={{ background: c }} />
                  <span>
                    <span className="text-silk">{a}:</span> {b}
                  </span>
                </li>
              ))}
              <li className="border-t border-board-600 pt-1 text-silk-mute">
                Հարթակի եզրի LED լույսերի շարքը ցույց է տալիս {m.objectives.length ? "ձեր նպատակները" : "ոչինչ՝ ազատ ռեժիմում"}։
              </li>
            </ul>
          )}
          <div className={cn("pointer-events-auto flex flex-wrap items-center gap-1.5", (game.trace || game.manCmd) && "max-lg:hidden")}>
            <button
              type="button"
              onClick={() => setLegend((l) => !l)}
              aria-expanded={legend}
              className="silk rounded border border-board-600 bg-board-950/85 px-2 py-1 text-silk-dim hover:text-silk"
            >
              Պայմանանշաններ
            </button>
            <div className="flex items-center gap-2 rounded border border-board-600 bg-board-950/90 px-2 py-1 font-mono text-[11px] text-silk-dim">
              <svg width="22" height="24" viewBox="-20 -55 40 60" aria-hidden className="flex-none">
                <AvatarSprite av={game.avatar} />
              </svg>
              <span>
                {game.avatar.exists
                  ? [
                      game.avatar.name ?? "architect",
                      game.avatar.suit ?? game.avatar.cls ?? "cadet",
                      game.avatar.hat ?? "none",
                      game.avatar.color ?? "cyan",
                    ].join(" · ")
                  : "avatar.cfg չկա · դուք կարկաս եք"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {game.manCmd && <ManPanel cmd={game.manCmd} onClose={() => dispatch({ type: "closeMan" })} />}
      {!game.manCmd && game.trace && <Refinery key={seq} trace={game.trace} onClose={() => dispatch({ type: "closeTrace" })} />}
    </section>
  );
}

function lineAt(i1: number, j1: number, i2: number, j2: number) {
  return { x1: (i1 - j1) * HW, y1: (i1 + j1) * HH, x2: (i2 - j2) * HW, y2: (i2 + j2) * HH };
}
