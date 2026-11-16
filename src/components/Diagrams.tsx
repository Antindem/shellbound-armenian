import { useState } from "react";
import type { Role, Variant } from "../game/missions";
import { cn } from "../utils/cn";
import { P } from "./Sprites";

/* ---------- 1. Command anatomy ---------- */

const ROLE: Record<Role, { label: string; text: string; ring: string }> = {
  cmd: { label: "Command", text: "text-gold", ring: "border-gold" },
  flag: { label: "Flag", text: "text-led-cyan", ring: "border-led-cyan" },
  arg: { label: "Argument", text: "text-silk", ring: "border-silk" },
  op: { label: "Operator", text: "text-copper", ring: "border-copper" },
};

export function Anatomy({ variants }: { variants: Variant[] }) {
  const [vi, setVi] = useState(0);
  const [ti, setTi] = useState(0);
  const v = variants[vi];
  const tok = v.tokens[Math.min(ti, v.tokens.length - 1)];
  return (
    <div className="rounded border border-board-600 bg-board-800">
      {variants.length > 1 && (
        <div className="flex items-center gap-2 border-b border-board-600 px-3 py-2">
          <span className="silk text-silk-mute">Օրինակ</span>
          <div className="flex gap-1" role="tablist" aria-label="Command-ի օրինակներ">
            {variants.map((x, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === vi}
                aria-label={`Օրինակ ${i + 1}: ${x.tokens.map((t) => t.t).join(" ")}`}
                onClick={() => {
                  setVi(i);
                  setTi(0);
                }}
                className={cn(
                  "size-7 rounded border font-mono text-xs font-semibold transition-colors",
                  i === vi ? "border-gold bg-gold text-board-950" : "border-board-500 text-silk-dim hover:border-silk-mute hover:text-silk",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 py-3">
        <p className="mb-2 text-xs text-silk-mute">Սեղմեք command-ի յուրաքանչյուր մասի վրա՝ տեսնելու, թե ինչ է այն անում։</p>
        <div className="flex flex-wrap gap-x-1.5 gap-y-2 font-mono text-[14px]">
          <span className="select-none py-1 text-silk-mute" aria-hidden>
            $
          </span>
          {v.tokens.map((t, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === ti}
              onClick={() => setTi(i)}
              className={cn(
                "max-w-full break-all rounded-sm border-b-2 px-1.5 py-1 text-left font-medium transition-colors",
                ROLE[t.role].text,
                i === ti ? cn(ROLE[t.role].ring, "bg-board-600") : "border-transparent hover:bg-board-700",
              )}
            >
              {t.t}
            </button>
          ))}
        </div>

        <div className="mt-3 min-h-[3.4rem] border-l-2 border-board-500 pl-3" aria-live="polite">
          <p className={cn("silk", ROLE[tok.role].text)}>{ROLE[tok.role].label}</p>
          <p className="mt-0.5 text-sm leading-snug text-silk-dim">{tok.note}</p>
        </div>
      </div>

      <div className="border-t border-board-600 px-3 py-3">
        <p className="silk text-silk-mute">Ինչ է անում համակարգը</p>
        <p className="mt-1 text-sm leading-snug text-silk-dim">{v.effect}</p>
        {v.out && (
          <pre className="mt-2.5 overflow-x-auto rounded-sm border border-board-700 bg-board-950 px-2.5 py-2 font-mono text-[12px] leading-relaxed text-silk-dim">
            {v.out.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}

/* ---------- shared: a button that looks like a command you could type ---------- */

function CmdButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded border px-2 py-1.5 text-left font-mono text-[12px] transition-colors disabled:border-board-700 disabled:text-silk-mute/60",
        active
          ? "border-gold bg-gold/15 text-gold shadow-[0_0_0_1px_rgba(237,189,79,0.25)]"
          : "border-board-500 bg-board-900 text-gold hover:border-gold",
      )}
    >
      <span className="select-none text-silk-mute" aria-hidden>
        ${" "}
      </span>
      {children}
    </button>
  );
}

/* ---------- 2. Inode lab: hard link vs symbolic link ---------- */

export function InodeLab() {
  const init = { orig: true, anchor: false, portal: false, msg: "Մեկ անուն, մեկ inode։ Փորձեք ներքևի command-ները։" };
  const [s, setS] = useState(init);
  const count = (s.orig ? 1 : 0) + (s.anchor ? 1 : 0);
  const alive = count > 0;
  const broken = s.portal && !s.orig;

  const NameBox = ({ y, label, on, color }: { y: number; label: string; on: boolean; color: string }) => (
    <g opacity={on ? 1 : 0.35}>
      <rect x={6} y={y} width={112} height={26} rx={3} fill={on ? P.b700 : "none"} stroke={on ? color : P.silkMute} strokeWidth={1.3} strokeDasharray={on ? undefined : "4 3"} />
      <text x={62} y={y + 17} textAnchor="middle" fontSize={11} fill={on ? color : P.silkMute}>
        {on ? label : "(անուն չկա)"}
      </text>
    </g>
  );

  return (
    <div className="rounded border border-board-600 bg-board-800">
      <svg viewBox="0 0 320 172" className="block w-full" role="img" aria-label={`Դիագրամ՝ ${s.msg}`}>
        <text x={6} y={12} fontSize={8} letterSpacing={1.3} fill={P.silkMute}>
          ԱՆՈՒՆՆԵՐ (directory-ում)
        </text>
        <text x={186} y={12} fontSize={8} letterSpacing={1.3} fill={P.silkMute} textAnchor="middle">
          INODE
        </text>
        <text x={276} y={12} fontSize={8} letterSpacing={1.3} fill={P.silkMute} textAnchor="middle">
          ՏՎՅԱԼՆԵՐ
        </text>

        {/* hard-link lines: name -> inode */}
        {s.orig && <line x1={118} y1={33} x2={160} y2={56} stroke={P.violet} strokeWidth={1.6} />}
        {s.anchor && <line x1={118} y1={79} x2={160} y2={64} stroke={P.violet} strokeWidth={1.6} />}
        <line x1={212} y1={60} x2={246} y2={60} stroke={alive ? P.violet : P.silkMute} strokeWidth={1.6} strokeDasharray={alive ? undefined : "3 3"} />

        <NameBox y={20} label="crystal.dat" on={s.orig} color={P.violet} />
        {s.anchor && <NameBox y={66} label="spare.dat" on color={P.violet} />}

        {/* the inode */}
        <g opacity={alive ? 1 : 0.4}>
          <circle cx={186} cy={60} r={26} fill={alive ? "#2a2350" : "none"} stroke={alive ? P.violet : P.silkMute} strokeWidth={1.6} strokeDasharray={alive ? undefined : "4 3"} />
          <text x={186} y={56} textAnchor="middle" fontSize={10} fontWeight={600} fill={alive ? P.silk : P.silkMute}>
            #56
          </text>
          <text x={186} y={69} textAnchor="middle" fontSize={8.5} fill={alive ? P.violet : P.silkMute}>
            links: {count}
          </text>
        </g>
        <g opacity={alive ? 1 : 0.4}>
          <rect x={246} y={38} width={62} height={44} rx={3} fill={alive ? P.b600 : "none"} stroke={alive ? P.green : P.silkMute} strokeWidth={1.3} strokeDasharray={alive ? undefined : "4 3"} />
          <text x={277} y={58} textAnchor="middle" fontSize={10} fontWeight={600} fill={alive ? P.green : P.silkMute}>
            {alive ? "9000 TW" : "ջնջված է"}
          </text>
          <text x={277} y={71} textAnchor="middle" fontSize={8} fill={P.silkMute}>
            {alive ? "պահվում է 1 անգամ" : "տեղն ազատված է"}
          </text>
        </g>

        {/* the symlink: points at a NAME, not at the inode */}
        {s.portal && (
          <g>
            <path
              d="M34,126 C16,104 16,70 30,48"
              fill="none"
              stroke={broken ? P.red : P.cyan}
              strokeWidth={1.6}
              strokeDasharray="5 4"
              className={broken ? "flicker" : "portal-spin"}
            />
            <path d="M24,54 l6,-7 2,9" fill="none" stroke={broken ? P.red : P.cyan} strokeWidth={1.6} />
            <rect x={6} y={126} width={112} height={26} rx={13} fill={P.b700} stroke={broken ? P.red : P.cyan} strokeWidth={1.3} strokeDasharray="5 3" />
            <text x={62} y={143} textAnchor="middle" fontSize={11} fill={broken ? P.red : P.cyan}>
              portal
            </text>
            <text x={126} y={137} fontSize={8.5} fill={broken ? P.red : P.cyan}>
              պահում է տեքստը՝
            </text>
            <text x={126} y={148} fontSize={8.5} fill={broken ? P.red : P.cyan}>
              “crystal.dat”{broken ? " ✕ կոտրված" : ""}
            </text>
          </g>
        )}
      </svg>

      <p className="border-y border-board-600 px-3 py-2 text-sm leading-snug text-silk-dim" aria-live="polite">
        {s.msg}
      </p>

      <div className="flex flex-wrap gap-1.5 p-3">
        <CmdButton
          disabled={!s.orig || s.anchor}
          onClick={() => setS({ ...s, anchor: true, msg: "Hard link՝ երկրորդ անուն ՆՈՒՅՆ inode-ի վրա։ Link-երի քանակն այժմ 2 է, և ոչ մի տվյալ չի պատճենվել։" })}
        >
          ln crystal.dat spare.dat
        </CmdButton>
        <CmdButton
          disabled={s.portal}
          onClick={() =>
            setS({
              ...s,
              portal: true,
              msg: s.orig
                ? "Symbolic link՝ փոքրիկ առանձին file, որը պարունակում է path։ Այն ցույց է տալիս crystal.dat ԱՆՎԱՆ վրա, ոչ թե inode-ի։ Link-երի քանակը չի փոխվել։"
                : "Կարող եք նույնիսկ link ստեղծել գոյություն չունեցող անվան վրա։ Պորտալն ի սկզբանե կոտրված է։",
            })
          }
        >
          ln -s crystal.dat portal
        </CmdButton>
        <CmdButton
          disabled={!s.orig}
          onClick={() =>
            setS({
              ...s,
              orig: false,
              msg:
                (s.anchor ? "Մեկ անուն հեռացվեց։ Քանակը դառնում է 1, ուստի տվյալները պահպանվում են spare.dat-ի միջոցով։" : "Վերջին անունն անհետացավ։ Քանակը դառնում է 0, և kernel-ը ջնջում է տվյալները։") +
                (s.portal ? " Պորտալում դեռ գրված է «crystal.dat», որն այլևս գոյություն չունի՝ այն կոտրված է։" : ""),
            })
          }
        >
          rm crystal.dat
        </CmdButton>
        <CmdButton
          disabled={!s.anchor}
          onClick={() =>
            setS({
              ...s,
              anchor: false,
              msg: s.orig ? "Կրկին մեկ անուն։ Տվյալները դեռ ապահով են։" : "Դա վերջին անունն էր։ Քանակը՝ 0․ տվյալներն ընդմիշտ ջնջված են։",
            })
          }
        >
          rm spare.dat
        </CmdButton>
        <button type="button" onClick={() => setS(init)} className="silk rounded border border-board-600 px-2 py-1.5 text-silk-dim hover:text-silk">
          Սկսել նորից
        </button>
      </div>
    </div>
  );
}

/* ---------- 3. Tank lab: > versus >> ---------- */

const CAP = 6;

export function TankLab() {
  const [lines, setLines] = useState<{ id: number; t: string }[]>([
    { id: 1, t: "line A" },
    { id: 2, t: "line B" },
  ]);
  const [n, setN] = useState(2);
  const [msg, setMsg] = useState("Ռեզերվուարը պարունակում է 2 տող։ Ո՞ր սլաքն է պահպանում դրանք։");
  const next = "line " + String.fromCharCode(65 + (n % 26));
  const full = lines.length >= CAP;

  return (
    <div className="rounded border border-board-600 bg-board-800">
      <div className="flex items-end gap-4 px-3 pt-3">
        <div className="flex-none">
          <div
            className="flex h-[150px] w-28 flex-col-reverse gap-[3px] overflow-hidden rounded-b-md border-x-2 border-b-2 border-silk-mute bg-board-950 p-[3px]"
            role="img"
            aria-label={`tank.txt-ը պարունակում է ${lines.length} տող՝ ${lines.map((l) => l.t).join(", ") || "ոչինչ"}`}
          >
            {lines.map((l) => (
              <div key={l.id} className="pour flex h-[21px] flex-none items-center rounded-sm bg-led-green/80 px-1.5 font-mono text-[11px] font-medium text-board-950">
                {l.t}
              </div>
            ))}
          </div>
          <p className="mt-1 text-center font-mono text-[11px] text-silk-dim">tank.txt</p>
        </div>
        <div className="min-w-0 flex-1 space-y-2 pb-6">
          <CmdButton
            onClick={() => {
              setMsg(`>-ը նախ դատարկեց ${lines.length} տողը, ապա գրեց 1-ը։ Այն ամենը, ինչ կար այնտեղ, անհետացել է։`);
              setLines([{ id: n + 1, t: next }]);
              setN(n + 1);
            }}
          >
            {`echo "${next}" > tank.txt`}
          </CmdButton>
          <CmdButton
            disabled={full}
            onClick={() => {
              setMsg(`>>-ը պահպանեց բոլոր ${lines.length}-ը և վրան ավելացրեց 1-ը։ Այժմ՝ ${lines.length + 1} տող։`);
              setLines([...lines, { id: n + 1, t: next }]);
              setN(n + 1);
            }}
          >
            {`echo "${next}" >> tank.txt`}
          </CmdButton>
          {full && <p className="text-xs text-silk-mute">Ռեզերվուարը լիքն է։ Հիմա միայն մեկ սլաք կարող է տեղ ազատել։</p>}
        </div>
      </div>
      <p className="mt-3 border-t border-board-600 px-3 py-2 text-sm leading-snug text-silk-dim" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}

/* ---------- 4. HeadTailLab: head / tail / -n / pipe slice visualizer ---------- */

const SENSOR_LINES = [
  { num: 1, text: "BOOT core online" },
  { num: 2, text: "SYNC clock 440Hz" },
  { num: 3, text: "KEY_ALPHA=774" },
  { num: 4, text: "PULSE 512TW ok" },
  { num: 5, text: "SECRET_ROW=909" },
  { num: 6, text: "TEMP 310K stable" },
  { num: 7, text: "VALVE_2 nominal" },
  { num: 8, text: "LOCK_OMEGA=991" },
];

type HeadTailMode = "head" | "tail" | "pipe";

export function HeadTailLab() {
  const [mode, setMode] = useState<HeadTailMode>("head");
  const [useN, setUseN] = useState(true);
  const [headN, setHeadN] = useState(3);
  const [tailN, setTailN] = useState(3);
  const [redirectToFile, setRedirectToFile] = useState(false);

  const total = SENSOR_LINES.length;
  const effHeadN = useN ? headN : 10;
  const effTailN = useN ? tailN : 10;

  // Compute which 1-based line numbers are in the first stage vs final output
  const headSlice = mode === "head" || mode === "pipe" ? SENSOR_LINES.slice(0, effHeadN) : [];

  const finalSlice =
    mode === "head"
      ? headSlice
      : mode === "tail"
        ? SENSOR_LINES.slice(Math.max(0, total - effTailN))
        : headSlice.slice(Math.max(0, headSlice.length - effTailN));

  const headSet = new Set(headSlice.map((l) => l.num));
  const finalSet = new Set(finalSlice.map((l) => l.num));

  const cmdString = (() => {
    const base =
      mode === "head"
        ? useN
          ? `head -n ${headN} sensor.log`
          : "head sensor.log"
        : mode === "tail"
          ? useN
            ? `tail -n ${tailN} sensor.log`
            : "tail sensor.log"
          : useN
            ? `head -n ${headN} sensor.log | tail -n ${tailN}`
            : "head sensor.log | tail";
    return redirectToFile ? `${base} > slice.out` : base;
  })();

  const directionLabel =
    mode === "pipe"
      ? useN
        ? `Կտրվածք՝ 1..${headN} → վերջին ${tailN}`
        : "Կտրվածք՝ լռելյայն 10 տող"
      : mode === "head"
        ? "Կարդում է վերևից ներքև ↓"
        : "Կարդում է ներքևից վերև ↑";

  const explanation = (() => {
    if (!useN) {
      if (mode === "head") {
        return "Առանց -n պարամետրի head-ը լռելյայն վերցնում է առաջին 10 տողերը (քանի որ sensor.log-ն ունի 8 տող, ընտրվում են բոլոր 8-ը)։";
      }
      if (mode === "tail") {
        return "Առանց -n պարամետրի tail-ը լռելյայն վերցնում է վերջին 10 տողերը (քանի որ sensor.log-ն ունի 8 տող, ընտրվում են բոլոր 8-ը)։ Ճշգրիտ կտրվածքի համար միացրեք -n-ը։";
      }
      return "Առանց -n պարամետրի թե՛ head-ը, թե՛ tail-ը լռելյայն վերցնում են 10-ական տող (sensor.log-ում 8 տող է, ուստի բոլոր 8-ն անցնում են)։ Միացրեք -n-ը՝ ճշգրիտ կտրվածքի համար։";
    }
    if (mode === "head") {
      return `head -n ${headN}-ը սկանավորում է file-ը ՎԵՐԵՎԻՑ (գլխամասից) և կտրում միայն առաջին ${headN} տողերը (տող 1–${headN})։`;
    }
    if (mode === "tail") {
      const start = Math.max(1, total - tailN + 1);
      return `tail -n ${tailN}-ը սկանավորում է file-ը ՆԵՐՔԵՎԻՑ (պոչամասից) և վերցնում միայն վերջին ${tailN} տողերը (տող ${start}–${total})։`;
    }
    const nums = finalSlice.map((l) => l.num).join(", ");
    return `Կրկնակի կտրվածք․ 1) head -n ${headN}-ը վերցնում է առաջին ${headN} տողերը (1–${headN}), 2) pipe-ով (|) դրանք փոխանցվում են tail -n ${tailN}-ին, որը պահում է այդ կտորի վերջին ${Math.min(headN, tailN)} տողը (տող ${nums})։`;
  })();

  return (
    <div className="@container rounded border border-board-600 bg-board-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 px-3 py-2">
        <span className="silk text-gold">Ինտերակտիվ սկաներ · head / tail</span>
        <span className="font-mono text-[11px] text-led-cyan">$ {cmdString}</span>
      </div>

      {/* Top Scanner Control Bar */}
      <div className="space-y-2 border-b border-board-600 bg-board-900/90 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode("head")}
              className={cn(
                "whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] font-semibold transition",
                mode === "head" ? "border-gold bg-gold text-board-950" : "border-board-500 text-silk-dim hover:text-silk",
              )}
            >
              head ↓
            </button>
            <button
              type="button"
              onClick={() => setMode("tail")}
              className={cn(
                "whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] font-semibold transition",
                mode === "tail" ? "border-led-cyan bg-led-cyan text-board-950" : "border-board-500 text-silk-dim hover:text-silk",
              )}
            >
              tail ↑
            </button>
            <button
              type="button"
              onClick={() => setMode("pipe")}
              className={cn(
                "whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] font-semibold transition",
                mode === "pipe" ? "border-led-green bg-led-green text-board-950" : "border-board-500 text-silk-dim hover:text-silk",
              )}
            >
              head | tail
            </button>
          </div>

          <button
            type="button"
            aria-pressed={useN}
            onClick={() => setUseN(!useN)}
            className={cn(
              "whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] font-semibold transition",
              useN
                ? "border-led-green/70 bg-led-green/15 text-led-green"
                : "border-board-500 bg-board-950 text-silk-mute hover:text-silk",
            )}
          >
            {useN ? "-n՝ Միացված" : "-n՝ Անջատված"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {useN && (mode === "head" || mode === "pipe") && (
            <div className="flex items-center gap-1.5 rounded border border-board-600 bg-board-950 px-2 py-1">
              <span className="whitespace-nowrap font-mono text-[11px] text-gold">head -n</span>
              <button
                type="button"
                aria-label="Նվազեցնել head -n"
                onClick={() => setHeadN(Math.max(1, headN - 1))}
                className="size-5 rounded border border-board-500 font-mono text-xs text-silk hover:border-gold"
              >
                -
              </button>
              <span className="w-4 text-center font-mono text-xs font-bold text-gold">{headN}</span>
              <button
                type="button"
                aria-label="Ավելացնել head -n"
                onClick={() => setHeadN(Math.min(8, headN + 1))}
                className="size-5 rounded border border-board-500 font-mono text-xs text-silk hover:border-gold"
              >
                +
              </button>
            </div>
          )}

          {useN && (mode === "tail" || mode === "pipe") && (
            <div className="flex items-center gap-1.5 rounded border border-board-600 bg-board-950 px-2 py-1">
              <span className="whitespace-nowrap font-mono text-[11px] text-led-cyan">tail -n</span>
              <button
                type="button"
                aria-label="Նվազեցնել tail -n"
                onClick={() => setTailN(Math.max(1, tailN - 1))}
                className="size-5 rounded border border-board-500 font-mono text-xs text-silk hover:border-led-cyan"
              >
                -
              </button>
              <span className="w-4 text-center font-mono text-xs font-bold text-led-cyan">{tailN}</span>
              <button
                type="button"
                aria-label="Ավելացնել tail -n"
                onClick={() => setTailN(Math.min(8, tailN + 1))}
                className="size-5 rounded border border-board-500 font-mono text-xs text-silk hover:border-led-cyan"
              >
                +
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setRedirectToFile(!redirectToFile)}
            className={cn(
              "whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] transition",
              redirectToFile ? "border-copper bg-copper/20 text-copper" : "border-board-600 bg-board-950 text-silk-mute hover:text-silk",
            )}
          >
            {redirectToFile ? "✓ Redirect՝ > slice.out" : "+ Ավելացնել > slice.out"}
          </button>
        </div>
      </div>

      {/* Flow Status + Source -> Result Layout */}
      <div className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-board-700 bg-board-950/75 px-2.5 py-1.5">
          <span className="whitespace-nowrap font-mono text-[10.5px] text-silk-dim">{directionLabel}</span>
          <div className="flex items-center gap-1.5">
            <svg width="46" height="16" viewBox="0 0 46 16" aria-hidden>
              <line x1="2" y1="8" x2="36" y2="8" stroke={P.green} strokeWidth="1.8" strokeDasharray="3 2" />
              <polygon points="35,4 44,8 35,12" fill={P.green} />
            </svg>
            <span className="whitespace-nowrap font-mono text-[10.5px] font-semibold text-led-green">
              {finalSlice.length} տող ({redirectToFile ? "> slice.out" : "stdout"})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 @[350px]:grid-cols-2 @[350px]:items-stretch">
          {/* LEFT: Source File Container */}
          <div className="flex min-w-0 flex-col rounded border border-board-600 bg-board-950 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-1 border-b border-board-700 pb-1">
              <span className="font-mono text-[11px] font-semibold text-silk">sensor.log</span>
              <span className="silk whitespace-nowrap text-[9.5px] text-silk-mute">Աղբյուր (8 տող)</span>
            </div>
            <div className="space-y-1" role="img" aria-label={`sensor.log 8 տող, ընտրված են՝ ${finalSlice.map((l) => l.num).join(", ")}`}>
              {SENSOR_LINES.map((line) => {
                const inFinal = finalSet.has(line.num);
                const inHeadOnly = mode === "pipe" && headSet.has(line.num) && !inFinal;
                return (
                  <div
                    key={line.num}
                    className={cn(
                      "flex items-center justify-between gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] transition-all",
                      inFinal
                        ? "border-led-green bg-led-green/20 font-semibold text-silk shadow-[inset_2px_0_0_#7dffa3]"
                        : inHeadOnly
                          ? "border-gold/60 border-dashed bg-gold/10 text-gold"
                          : "border-board-800 bg-board-900/50 text-silk-mute opacity-55",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      <span className="mr-1 text-silk-mute">{String(line.num).padStart(2, "0")}:</span>
                      {line.text}
                    </span>
                    {inFinal && (
                      <span className="flex-none whitespace-nowrap text-[9px] font-bold text-led-green">
                        {mode === "tail" ? "↑ TAIL" : mode === "pipe" ? "✓ ԵԼՔ" : "↓ HEAD"}
                      </span>
                    )}
                    {inHeadOnly && <span className="flex-none whitespace-nowrap text-[9px] text-gold">1.H</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Resulting Output / File Container */}
          <div className="flex min-w-0 flex-col rounded border border-board-600 bg-board-950 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-1 border-b border-board-700 pb-1">
              <span className="truncate font-mono text-[11px] font-semibold text-led-green">
                {redirectToFile ? "slice.out (file)" : "stdout (էկրան)"}
              </span>
              <span className="silk whitespace-nowrap text-[9.5px] text-led-green">{finalSlice.length} տող</span>
            </div>
            <div className="space-y-1">
              {finalSlice.map((line) => (
                <div
                  key={line.num}
                  className="pour flex items-center justify-between rounded-sm bg-led-green/85 px-2 py-1 font-mono text-[10px] font-semibold text-board-950"
                >
                  <span className="truncate">
                    {String(line.num).padStart(2, "0")}: {line.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="border-y border-board-600 px-3 py-2 text-sm leading-snug text-silk-dim" aria-live="polite">
        {explanation}
      </p>

      {/* Preset Command Buttons */}
      <div className="flex flex-wrap gap-1.5 p-3">
        <CmdButton
          active={useN && mode === "head" && headN === 3 && !redirectToFile}
          onClick={() => {
            setMode("head");
            setUseN(true);
            setHeadN(3);
            setRedirectToFile(false);
          }}
        >
          head -n 3 sensor.log
        </CmdButton>
        <CmdButton
          active={useN && mode === "tail" && tailN === 3 && !redirectToFile}
          onClick={() => {
            setMode("tail");
            setUseN(true);
            setTailN(3);
            setRedirectToFile(false);
          }}
        >
          tail -n 3 sensor.log
        </CmdButton>
        <CmdButton
          active={useN && mode === "pipe" && headN === 5 && tailN === 2 && !redirectToFile}
          onClick={() => {
            setMode("pipe");
            setUseN(true);
            setHeadN(5);
            setTailN(2);
            setRedirectToFile(false);
          }}
        >
          head -n 5 sensor.log | tail -n 2
        </CmdButton>
        <CmdButton
          active={useN && mode === "pipe" && headN === 5 && tailN === 1 && redirectToFile}
          onClick={() => {
            setMode("pipe");
            setUseN(true);
            setHeadN(5);
            setTailN(1);
            setRedirectToFile(true);
          }}
        >
          head -n 5 sensor.log | tail -n 1 &gt; slice.out
        </CmdButton>
        <CmdButton
          active={!useN && mode === "head" && !redirectToFile}
          onClick={() => {
            setMode("head");
            setUseN(false);
            setRedirectToFile(false);
          }}
        >
          head sensor.log
        </CmdButton>
      </div>
    </div>
  );
}

/* ---------- 5. WildcardLab: *, ?, [...], [0-9] globbing & pattern matching visualizer ---------- */

const SECTOR_FILES = [
  "log_01.txt",
  "log_02.txt",
  "log_final.txt",
  "notes.md",
  "core_a.bin",
  "core_b.bin",
  "core_9.bin",
  ".secret.cfg",
];

interface GlobToken {
  raw: string;
  kind: "lit" | "star" | "qmark" | "set" | "range";
  desc: string;
}

function parseGlobTokens(pattern: string): GlobToken[] {
  const tokens: GlobToken[] = [];
  let i = 0;
  let lit = "";
  const flushLit = () => {
    if (lit) {
      tokens.push({ raw: lit, kind: "lit", desc: `«${lit}» ճշգրիտ տեքստ` });
      lit = "";
    }
  };
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      flushLit();
      tokens.push({ raw: "*", kind: "star", desc: "* = ցանկացած քանակի նիշ (0 կամ ավելի)" });
      i++;
    } else if (ch === "?") {
      flushLit();
      tokens.push({ raw: "?", kind: "qmark", desc: "? = ուղիղ 1 ցանկացած նիշ" });
      i++;
    } else if (ch === "[") {
      const close = pattern.indexOf("]", i + 1);
      if (close > i + 1) {
        flushLit();
        const inner = pattern.slice(i + 1, close);
        const isRange = inner.length === 3 && inner[1] === "-";
        tokens.push({
          raw: `[${inner}]`,
          kind: isRange ? "range" : "set",
          desc: isRange
            ? `[${inner}] = 1 նիշ «${inner[0]}»-ից «${inner[2]}» միջակայքից`
            : `[${inner}] = 1 նիշ նշված ցանկից (${inner.split("").join(", ")})`,
        });
        i = close + 1;
      } else {
        lit += ch;
        i++;
      }
    } else {
      lit += ch;
      i++;
    }
  }
  flushLit();
  return tokens;
}

interface CharMatchInfo {
  ch: string;
  role: "lit" | "star" | "qmark" | "set" | "range" | "unmatched";
}

function evaluateGlobOnFile(pattern: string, filename: string): {
  matched: boolean;
  reason: string;
  chars: CharMatchInfo[];
} {
  // Dotfile rule: leading '.' in filename requires explicit leading '.' in pattern
  if (filename.startsWith(".") && !pattern.startsWith(".")) {
    return {
      matched: false,
      reason: "Սկսվում է կետով (.)․ թաքնված dotfile-երը բաց են թողնվում, եթե դիմակը չի սկսվում «.»-ով։",
      chars: filename.split("").map((ch) => ({ ch, role: "unmatched" })),
    };
  }

  const tokens = parseGlobTokens(pattern);

  // Backtracking matcher that also records character roles
  function matchStep(ti: number, fi: number, roles: CharMatchInfo["role"][]): CharMatchInfo["role"][] | null {
    if (ti === tokens.length && fi === filename.length) return roles;
    if (ti === tokens.length) return null;

    const tok = tokens[ti];
    if (tok.kind === "lit") {
      if (filename.startsWith(tok.raw, fi)) {
        const nextRoles = [...roles];
        for (let k = 0; k < tok.raw.length; k++) nextRoles.push("lit");
        return matchStep(ti + 1, fi + tok.raw.length, nextRoles);
      }
      return null;
    }
    if (tok.kind === "qmark") {
      if (fi < filename.length) {
        return matchStep(ti + 1, fi + 1, [...roles, "qmark"]);
      }
      return null;
    }
    if (tok.kind === "set" || tok.kind === "range") {
      if (fi >= filename.length) return null;
      const c = filename[fi];
      const inner = tok.raw.slice(1, -1);
      let ok = false;
      if (tok.kind === "range" && inner.length === 3 && inner[1] === "-") {
        ok = c >= inner[0] && c <= inner[2];
      } else {
        ok = inner.includes(c);
      }
      if (ok) {
        return matchStep(ti + 1, fi + 1, [...roles, tok.kind]);
      }
      return null;
    }
    if (tok.kind === "star") {
      // Try matching 0..remaining characters
      for (let len = filename.length - fi; len >= 0; len--) {
        const starRoles = Array(len).fill("star" as const);
        const res = matchStep(ti + 1, fi + len, [...roles, ...starRoles]);
        if (res) return res;
      }
      return null;
    }
    return null;
  }

  const matchedRoles = matchStep(0, 0, []);
  if (matchedRoles) {
    const usedSpecials = tokens.filter((t) => t.kind !== "lit").map((t) => t.raw);
    return {
      matched: true,
      reason:
        usedSpecials.length > 0
          ? `Համընկավ բոլոր կանոններին (${usedSpecials.join(", ")})։`
          : "Ճշգրիտ անվան համընկնում։",
      chars: filename.split("").map((ch, idx) => ({ ch, role: matchedRoles[idx] ?? "lit" })),
    };
  }

  // Generate helpful Armenian failure reason
  let failReason = "Չի համապատասխանում դիմակի կառուցվածքին։";
  const litTokens = tokens.filter((t) => t.kind === "lit");
  for (const lt of litTokens) {
    if (!filename.includes(lt.raw)) {
      failReason = `Բացակայում է «${lt.raw}» պարտադիր հատվածը։`;
      break;
    }
  }
  if (failReason.startsWith("Չի համապատասխանում")) {
    const qCount = tokens.filter((t) => t.kind === "qmark").length;
    const bracketTok = tokens.find((t) => t.kind === "set" || t.kind === "range");
    if (qCount > 0) {
      failReason = `«${"?".repeat(qCount)}»-ը պահանջում է ուղիղ ${qCount} նիշ, բայց այստեղ նիշերի քանակն այլ է։`;
    } else if (bracketTok) {
      failReason = `Նիշը չի մտնում ${bracketTok.raw} թույլատրելի խմբի մեջ։`;
    }
  }

  return {
    matched: false,
    reason: failReason,
    chars: filename.split("").map((ch) => ({ ch, role: "unmatched" })),
  };
}

const PATTERN_PRESETS = [
  { pat: "*.txt", cmd: "ls", label: "Բոլոր .txt ֆայլերը" },
  { pat: "log_??.txt", cmd: "cp", label: "Ուղիղ 2 նիշ log_-ից հետո" },
  { pat: "core_[ab].bin", cmd: "mv", label: "Միայն a կամ b տառով" },
  { pat: "core_[0-9].bin", cmd: "rm", label: "Միայն 0–9 թվանշանով" },
  { pat: "*[0-9]*", cmd: "ls", label: "Թվանշան պարունակողները" },
  { pat: ".*", cmd: "ls -d", label: "Թաքնված dotfile-երը" },
];

export function WildcardLab() {
  const [pattern, setPattern] = useState("log_??.txt");
  const [cmdVerb, setCmdVerb] = useState<"ls" | "cp" | "mv" | "rm">("ls");

  const tokens = parseGlobTokens(pattern);
  const evaluations = SECTOR_FILES.map((f) => ({
    file: f,
    ...evaluateGlobOnFile(pattern, f),
  }));
  const matchedFiles = evaluations.filter((e) => e.matched).map((e) => e.file);

  const expandedCmd =
    matchedFiles.length === 0
      ? `(ոչ մի file չհամընկավ՝ «${pattern}»)`
      : cmdVerb === "cp"
        ? `cp ${matchedFiles.join(" ")} safe/`
        : cmdVerb === "mv"
          ? `mv ${matchedFiles.join(" ")} archive/`
          : `${cmdVerb} ${matchedFiles.join(" ")}`;

  return (
    <div className="rounded border border-board-600 bg-board-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 px-3 py-2">
        <span className="silk text-gold">Ուայլդքարդների լաբորատորիա · Globbing</span>
        <span className="font-mono text-[11px] text-led-green">
          Համընկավ՝ {matchedFiles.length} / {SECTOR_FILES.length} ֆայլ
        </span>
      </div>

      {/* Preset Pattern Buttons & Custom Input */}
      <div className="space-y-2.5 border-b border-board-600 p-3">
        <div className="flex flex-wrap gap-1.5">
          {PATTERN_PRESETS.map((p) => (
            <CmdButton
              key={p.pat}
              active={pattern === p.pat}
              onClick={() => {
                setPattern(p.pat);
                if (p.cmd === "cp" || p.cmd === "mv" || p.cmd === "rm" || p.cmd === "ls") {
                  setCmdVerb(p.cmd);
                }
              }}
            >
              {`${p.cmd} ${p.pat}${p.cmd === "cp" ? " safe/" : p.cmd === "mv" ? " archive/" : ""}`}
            </CmdButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="silk text-[10px] text-silk-mute" htmlFor="wildcard-custom-input">
            Փորձարկել դիմակը՝
          </label>
          <div className="flex items-center gap-1">
            {(["ls", "cp", "mv", "rm"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setCmdVerb(v)}
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[11px]",
                  cmdVerb === v ? "border-gold bg-gold/20 text-gold" : "border-board-600 text-silk-mute hover:text-silk",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            id="wildcard-custom-input"
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value || "*")}
            className="w-36 rounded border border-board-500 bg-board-950 px-2 py-1 font-mono text-xs text-gold focus:border-gold focus:outline-none"
            aria-label="Wildcard դիմակ"
          />
        </div>

        {/* Pattern Token Breakdown */}
        <div className="flex flex-wrap items-center gap-1.5 rounded border border-board-700 bg-board-950 px-2.5 py-1.5">
          <span className="silk mr-1 text-[9.5px] text-silk-mute">Կանոններ՝</span>
          {tokens.map((t, i) => (
            <span
              key={i}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[10.5px]",
                t.kind === "star" && "border-gold/60 bg-gold/15 text-gold",
                t.kind === "qmark" && "border-led-cyan/60 bg-led-cyan/15 text-led-cyan",
                (t.kind === "set" || t.kind === "range") && "border-led-violet/60 bg-led-violet/15 text-led-violet",
                t.kind === "lit" && "border-board-600 bg-board-900 text-silk-dim",
              )}
            >
              {t.desc}
            </span>
          ))}
        </div>
      </div>

      {/* Visual Grid of 8 Sector Files */}
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        {evaluations.map((ev) => (
          <div
            key={ev.file}
            className={cn(
              "rounded border p-2 transition-all",
              ev.matched
                ? "border-led-green/70 bg-led-green/[0.08] shadow-[inset_2px_0_0_#7dffa3]"
                : "border-board-700 bg-board-950/60 opacity-75",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Character-by-character highlighted filename */}
              <div className="flex flex-wrap font-mono text-[13px] font-semibold">
                {ev.chars.map((c, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "rounded-xs px-[1px]",
                      !ev.matched && "text-silk-mute",
                      ev.matched && c.role === "lit" && "text-silk",
                      ev.matched && c.role === "star" && "bg-gold/25 text-gold underline decoration-gold",
                      ev.matched && c.role === "qmark" && "bg-led-cyan/25 text-led-cyan underline decoration-led-cyan",
                      ev.matched &&
                        (c.role === "set" || c.role === "range") &&
                        "bg-led-violet/25 text-led-violet underline decoration-led-violet",
                    )}
                  >
                    {c.ch}
                  </span>
                ))}
              </div>
              <span
                className={cn(
                  "flex-none rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
                  ev.matched ? "bg-led-green/20 text-led-green" : "bg-board-800 text-silk-mute",
                )}
              >
                {ev.matched ? "✓ ՀԱՄԸՆԿԱՎ" : "✗ ԲԱՑ ԹՈՂՆՎԵՑ"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-silk-dim">{ev.reason}</p>
          </div>
        ))}
      </div>

      {/* Resulting Expanded Command Footer */}
      <div className="border-t border-board-600 bg-board-950 px-3 py-2.5">
        <p className="silk text-silk-mute">Ինչ է ստանում հրամանը (Shell-ի բացած ցանկը)</p>
        <p className="mt-1 break-all font-mono text-xs text-led-green">
          <span className="select-none text-silk-mute">$ </span>
          {expandedCmd}
        </p>
      </div>
    </div>
  );
}

/* ---------- 6. PermissionsLab: chmod / chown / umask / sudo security matrix ---------- */

type UmaskValue = "022" | "027" | "077" | "011";

export function PermissionsLab({
  showUmask = true,
  showChown = true,
  showSudo = true,
}: {
  showUmask?: boolean;
  showChown?: boolean;
  showSudo?: boolean;
} = {}) {
  const [bits, setBits] = useState<number[]>([7, 5, 4]); // u=7 (rwx), g=5 (r-x), o=4 (r--)
  const [owner, setOwner] = useState<"architect:crew" | "root:root">("architect:crew");
  const [umask, setUmask] = useState<UmaskValue>("022");
  const [targetFile, setTargetFile] = useState("script.sh");
  const [statusMsg, setStatusMsg] = useState(
    "Սեղմեք r (4), w (2), x (1) բիթերի կամ ներքևի հրամանների վրա՝ անվտանգության մատրիցան փոխելու համար։",
  );
  const [accessVerdict, setAccessVerdict] = useState<{ ok: boolean; cmd: string; text: string } | null>(null);

  const symFor = (d: number) => `${d & 4 ? "r" : "-"}${d & 2 ? "w" : "-"}${d & 1 ? "x" : "-"}`;
  const toOctal3 = (m: number) => m.toString(8).padStart(3, "0");
  const toSym9 = (m: number) => `${symFor((m >> 6) & 7)}${symFor((m >> 3) & 7)}${symFor(m & 7)}`;

  const effectiveOwner = showChown ? owner : "architect:crew";
  const symbolic = `-${symFor(bits[0])}${symFor(bits[1])}${symFor(bits[2])}`;
  const octal = `${bits[0]}${bits[1]}${bits[2]}`;

  const maskVal = parseInt(umask, 8);
  const umaskFileMode = 0o666 & ~maskVal;
  const umaskDirMode = 0o777 & ~maskVal;
  const umaskFileOctal = toOctal3(umaskFileMode);
  const umaskDirOctal = toOctal3(umaskDirMode);
  const umaskFileSym = `-${toSym9(umaskFileMode)}`;
  const umaskDirSym = `d${toSym9(umaskDirMode)}`;

  const toggleBit = (ringIdx: number, bitVal: number) => {
    const next = [...bits];
    next[ringIdx] = next[ringIdx] ^ bitVal;
    setBits(next);
    setAccessVerdict(null);
    const ringNames = ["Տեր (u)", "Խումբ (g)", "Այլոք (o)"];
    setStatusMsg(`${ringNames[ringIdx]} օղակը դարձավ ${symFor(next[ringIdx])} (${next[ringIdx]})․ ընդհանուր ռեժիմը՝ chmod ${next.join("")} (${`-${symFor(next[0])}${symFor(next[1])}${symFor(next[2])}`})։`);
  };

  const testAccess = (action: "cat" | "write" | "exec" | "sudo") => {
    if (action === "sudo") {
      setAccessVerdict({
        ok: true,
        cmd: `sudo cat ${targetFile}`,
        text: "✓ Թույլատրված է․ sudo-ն գործարկում է հրամանը որպես root գերօգտատեր՝ շրջանցելով բոլոր rwx սահմանափակումները։",
      });
      return;
    }
    const isOwner = effectiveOwner.startsWith("architect");
    const activeBits = isOwner ? bits[0] : bits[2];
    const ringLabel = isOwner ? "Տեր (u)" : "Այլոք (o, քանի որ ֆայլի տերը root:root է)";
    const reqBit = action === "cat" ? 4 : action === "write" ? 2 : 1;
    const reqSym = action === "cat" ? "r (4)" : action === "write" ? "w (2)" : "x (1)";
    const cmdStr =
      action === "cat"
        ? `cat ${targetFile}`
        : action === "write"
          ? `echo "data" >> ${targetFile}`
          : `./${targetFile}`;

    if ((activeBits & reqBit) !== 0) {
      setAccessVerdict({
        ok: true,
        cmd: cmdStr,
        text: `✓ Թույլատրված է․ դուք ստուգվում եք «${ringLabel}» օղակով, որտեղ ${reqSym} բիթը միացված է։`,
      });
    } else {
      setAccessVerdict({
        ok: false,
        cmd: cmdStr,
        text: `✗ Permission denied․ դուք ստուգվում եք «${ringLabel}» օղակով (${symFor(activeBits)}), որտեղ ${reqSym} իրավունքը անջատված է։`,
      });
    }
  };

  const RINGS = [
    { idx: 0, code: "u", title: "Տեր · Owner (u)", color: P.gold },
    { idx: 1, code: "g", title: "Խումբ · Group (g)", color: P.cyan },
    { idx: 2, code: "o", title: "Այլոք · Others (o)", color: P.violet },
  ];

  const UMASK_OPTIONS: { mask: UmaskValue; label: string }[] = [
    { mask: "022", label: "Ստանդարտ" },
    { mask: "027", label: "Խմբային ընթերցում" },
    { mask: "077", label: "Միայն տերը" },
    { mask: "011", label: "x-ի մաքրում (բիթային)" },
  ];

  return (
    <div className="rounded border border-board-600 bg-board-800">
      {/* Wrap-safe HTML Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 px-3 py-2">
        <span className="silk text-gold">ԱՆՎՏԱՆԳՈՒԹՅԱՆ ՄԱՏՐԻՑԱ (INODE PERMISSIONS)</span>
        {showUmask && (
          <span className="font-mono text-[11px] text-led-cyan">
            umask {umask} → նոր file՝ {umaskFileOctal} ({umaskFileSym})
          </span>
        )}
      </div>

      {/* SVG Diagram: 3 connected status cards only */}
      <svg
        viewBox="0 0 360 64"
        className="block w-full border-b border-board-600 bg-board-950"
        role="img"
        aria-label={`Թույլտվություններ՝ ${symbolic} (${octal}), տեր՝ ${effectiveOwner}`}
      >
        {/* Symbolic string box */}
        <rect x={10} y={14} width={124} height={36} rx={4} fill={P.b800} stroke={P.gold} strokeWidth={1.3} />
        <text x={72} y={30} textAnchor="middle" fontSize={12} fontWeight={700} fill={P.silk}>
          {symbolic}
        </text>
        <text x={72} y={43} textAnchor="middle" fontSize={8.5} fill={P.gold}>
          chmod {octal}
        </text>

        {/* Connection line */}
        <line x1={134} y1={32} x2={152} y2={32} stroke={P.gold} strokeWidth={1.4} />

        {/* Owner / Group box */}
        <rect
          x={152}
          y={14}
          width={116}
          height={36}
          rx={4}
          fill={P.b800}
          stroke={effectiveOwner === "root:root" ? P.red : P.cyan}
          strokeWidth={1.3}
        />
        <text
          x={210}
          y={29}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill={effectiveOwner === "root:root" ? P.red : P.cyan}
        >
          {effectiveOwner}
        </text>
        <text x={210} y={42} textAnchor="middle" fontSize={8} fill={P.silkMute}>
          {targetFile}
        </text>

        {/* Active user indicator */}
        <line x1={268} y1={32} x2={286} y2={32} stroke={P.green} strokeWidth={1.4} strokeDasharray="3 2" />
        <rect x={286} y={14} width={64} height={36} rx={4} fill={P.b700} stroke={P.green} strokeWidth={1.2} />
        <text x={318} y={29} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={P.green}>
          Օղակ՝ {effectiveOwner.startsWith("architect") ? "u" : "o"}
        </text>
        <text x={318} y={42} textAnchor="middle" fontSize={7.5} fill={P.silkDim}>
          architect
        </text>
      </svg>

      {/* Wrap-safe HTML Formula Legend */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-board-600 bg-board-950/60 px-3 py-1.5 font-mono text-[11px] leading-snug text-silk-dim">
        <span>Բանաձև՝ r = 4 (Կարդալ) · w = 2 (Գրել) · x = 1 (Գործարկել)</span>
        <span className="text-gold">| 4+2+1 = 7 (rwx)</span>
      </div>

      {/* 3 Connected Security Rings (u, g, o) with clickable r=4, w=2, x=1 switches */}
      <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-3">
        {RINGS.map((ring) => {
          const val = bits[ring.idx];
          return (
            <div key={ring.code} className="rounded border border-board-600 bg-board-900 p-2.5">
              <div className="flex items-center justify-between border-b border-board-700 pb-1.5">
                <span className="font-mono text-[11px] font-semibold" style={{ color: ring.color }}>
                  {ring.title}
                </span>
                <span className="rounded bg-board-950 px-1.5 py-0.5 font-mono text-xs font-bold text-silk">
                  {symFor(val)} = {val}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(
                  [
                    { b: 4, sym: "r", label: "Read" },
                    { b: 2, sym: "w", label: "Write" },
                    { b: 1, sym: "x", label: "Exec" },
                  ] as const
                ).map((sw) => {
                  const on = (val & sw.b) !== 0;
                  return (
                    <button
                      key={sw.sym}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${ring.code} ${sw.label}`}
                      onClick={() => toggleBit(ring.idx, sw.b)}
                      className={cn(
                        "flex flex-col items-center rounded border py-1.5 font-mono transition",
                        on
                          ? "border-led-green bg-led-green/20 text-led-green shadow-[0_0_8px_rgba(125,255,163,0.18)]"
                          : "border-board-600 bg-board-950 text-silk-mute hover:border-silk-mute",
                      )}
                    >
                      <span className="text-xs font-bold">{on ? sw.sym : "-"}</span>
                      <span className="text-[9.5px] opacity-80">+{sw.b}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live "Test Access" Bar */}
      <div className="border-t border-board-600 bg-board-950/70 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="silk text-[10px] text-silk-mute">Փորձարկել հասանելիությունը (Test Access)՝</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => testAccess("cat")}
              className="rounded border border-board-500 bg-board-900 px-2 py-1 font-mono text-[11px] text-silk hover:border-led-cyan"
            >
              cat (r)
            </button>
            <button
              type="button"
              onClick={() => testAccess("write")}
              className="rounded border border-board-500 bg-board-900 px-2 py-1 font-mono text-[11px] text-silk hover:border-led-cyan"
            >
              echo &gt;&gt; (w)
            </button>
            <button
              type="button"
              onClick={() => testAccess("exec")}
              className="rounded border border-board-500 bg-board-900 px-2 py-1 font-mono text-[11px] text-silk hover:border-led-cyan"
            >
              ./run.sh (x)
            </button>
            {showSudo && (
              <button
                type="button"
                onClick={() => testAccess("sudo")}
                className="rounded border border-gold/60 bg-gold/15 px-2 py-1 font-mono text-[11px] font-semibold text-gold hover:bg-gold/25"
              >
                sudo cat
              </button>
            )}
          </div>
        </div>

        {accessVerdict && (
          <div
            className={cn(
              "mt-2 rounded border px-2.5 py-1.5 font-mono text-xs",
              accessVerdict.ok
                ? "border-led-green/60 bg-led-green/10 text-led-green"
                : "border-led-red/60 bg-led-red/10 text-led-red",
            )}
            aria-live="polite"
          >
            <span className="mr-2 font-bold">$ {accessVerdict.cmd} →</span>
            <span>{accessVerdict.text}</span>
          </div>
        )}
      </div>

      <p className="border-y border-board-600 px-3 py-2 text-sm leading-snug text-silk-dim" aria-live="polite">
        {statusMsg}
      </p>

      {/* Preset Command Buttons */}
      <div className="flex flex-wrap gap-1.5 p-3">
        <CmdButton
          active={octal === "755" && targetFile === "script.sh"}
          onClick={() => {
            setBits([7, 5, 5]);
            setTargetFile("script.sh");
            setAccessVerdict(null);
            setStatusMsg("chmod 755 script.sh՝ Տերը ստանում է rwx (7), իսկ խումբն ու մյուսները՝ r-x (5)․ ծրագիրը պատրաստ է գործարկման։");
          }}
        >
          chmod 755 script.sh
        </CmdButton>
        <CmdButton
          active={octal === "600" && targetFile === "vault.key"}
          onClick={() => {
            setBits([6, 0, 0]);
            setTargetFile("vault.key");
            setAccessVerdict(null);
            setStatusMsg("chmod 600 vault.key՝ Գաղտնի բանալին հասանելի է միայն տիրոջը (rw- = 6), իսկ խմբի և մյուսների բիթերը զրոյացված են (--- = 0)։");
          }}
        >
          chmod 600 vault.key
        </CmdButton>
        <CmdButton
          onClick={() => {
            const next = [bits[0] | 1, bits[1] & ~2, bits[2] & ~4];
            setBits(next);
            setTargetFile("run.sh");
            setAccessVerdict(null);
            setStatusMsg(`Սիմվոլիկ փոփոխություն․ u+x (ավելացրեց x տիրոջը), g-w (հեռացրեց w խմբից), o-r (հեռացրեց r մյուսներից) -> ${next.join("")}։`);
          }}
        >
          chmod u+x,g-w,o-r run.sh
        </CmdButton>
        {showChown && (
          <CmdButton
            active={effectiveOwner === "root:root"}
            onClick={() => {
              const nextOwner = effectiveOwner === "root:root" ? "architect:crew" : "root:root";
              setOwner(nextOwner);
              setTargetFile("core.sys");
              setAccessVerdict(null);
              setStatusMsg(
                nextOwner === "root:root"
                  ? "chown root:root core.sys՝ Ֆայլի տերը դարձավ root։ Այժմ architect-ը ստուգվում է «Այլոք (o)» օղակով (կամ պետք է օգտագործի sudo)։"
                  : `${showSudo ? "sudo " : ""}chown architect:crew core.sys՝ Տիրապետությունը վերադարձվեց architect-ին (ստուգվում է «Տեր (u)» օղակով)։`,
              );
            }}
          >
            {effectiveOwner === "root:root"
              ? `${showSudo ? "sudo " : ""}chown architect:crew core.sys`
              : "chown root:root core.sys"}
          </CmdButton>
        )}
      </div>

      {/* Dedicated umask simulator (does NOT mutate existing file bits) */}
      {showUmask && (
        <div className="border-t border-board-600 bg-board-950/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="silk text-led-cyan">umask սիմուլյատոր (նոր ֆայլերի և պանակների համար)</span>
            <span className="font-mono text-[10.5px] text-silk-mute">Չի փոխում արդեն գոյություն ունեցող {targetFile}-ը</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {UMASK_OPTIONS.map((opt) => (
              <button
                key={opt.mask}
                type="button"
                aria-pressed={umask === opt.mask}
                onClick={() => {
                  setUmask(opt.mask);
                  setStatusMsg(
                    opt.mask === "011"
                      ? "umask 011՝ Հեռացնում է միայն x (1) բիթը g-ից և o-ից։ Նոր file-ի բազային 666-ում x-եր չկան, ուստի 0666 & ~011 = 666 (և ոչ թե 655)։"
                      : `umask ${opt.mask}՝ Նոր ստեղծվող ֆայլերը կստանան ${toOctal3(0o666 & ~parseInt(opt.mask, 8))}, իսկ պանակները՝ ${toOctal3(0o777 & ~parseInt(opt.mask, 8))} (առկա ${targetFile}-ը մնում է անփոփոխ)։`,
                  );
                }}
                className={cn(
                  "rounded border px-2 py-1 font-mono text-[11px] transition",
                  umask === opt.mask
                    ? "border-led-cyan bg-led-cyan/20 font-semibold text-led-cyan"
                    : "border-board-600 bg-board-900 text-silk-dim hover:border-silk-mute hover:text-silk",
                )}
              >
                umask {opt.mask} <span className="opacity-75">({opt.label})</span>
              </button>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded border border-board-600 bg-board-900 p-2 font-mono text-[11px]">
              <p className="text-silk-mute">$ touch new.txt</p>
              <p className="mt-1 font-bold text-led-green">
                {umaskFileOctal} ({umaskFileSym})
              </p>
              <p className="mt-0.5 text-[10px] text-silk-dim">
                0666 &amp; ~{umask} = {umaskFileOctal}
              </p>
            </div>
            <div className="rounded border border-board-600 bg-board-900 p-2 font-mono text-[11px]">
              <p className="text-silk-mute">$ mkdir new_dir</p>
              <p className="mt-1 font-bold text-gold">
                {umaskDirOctal} ({umaskDirSym})
              </p>
              <p className="mt-0.5 text-[10px] text-silk-dim">
                0777 &amp; ~{umask} = {umaskDirOctal}
              </p>
            </div>
          </div>

          {umask === "011" && (
            <p className="mt-2 rounded border border-led-cyan/40 bg-led-cyan/10 px-2.5 py-1.5 text-xs leading-snug text-led-cyan">
              Բիթային ապացույց՝ <code>0666 &amp; ~011 = 666</code> (և ոչ թե 666 - 11 = 655), որովհետև <code>umask</code>-ը զրոյացնում է բիթեր, այլ ոչ թե կատարում թվաբանական հանում (սովորական ֆայլերում <code>x</code> բիթն ի սկզբանե 0 է)։
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- 7. PipelineLab: |, grep, sort, uniq -c, wc -l, 2> refinery visualizer ---------- */

const RAW_STREAM = [
  { id: 1, text: "ENERGY pulse 512", err: false },
  { id: 2, text: "NOISE static hum", err: false },
  { id: 3, text: "ENERGY pulse 440", err: false },
  { id: 4, text: "ERR: valve_3 leak", err: true },
  { id: 5, text: "ENERGY pulse 512", err: false },
  { id: 6, text: "NOISE static hum", err: false },
  { id: 7, text: "ENERGY pulse 440", err: false },
  { id: 8, text: "ERR: parity fault", err: true },
  { id: 9, text: "ENERGY pulse 618", err: false },
];

export type PipelineStage = "grep" | "grepv" | "sort" | "uniqc" | "wc" | "stderr";

const DEFAULT_PIPELINE_STAGES: PipelineStage[] = ["grep", "grepv", "sort", "uniqc", "wc", "stderr"];

export function PipelineLab({
  stages: allowedStages = DEFAULT_PIPELINE_STAGES,
}: {
  stages?: PipelineStage[];
} = {}) {
  const hasStage = (s: PipelineStage) => allowedStages.includes(s);

  const [grepEnergy, setGrepEnergy] = useState(() => allowedStages.includes("grep"));
  const [grepNoNoise, setGrepNoNoise] = useState(false);
  const [useSort, setUseSort] = useState(false);
  const [useUniqC, setUseUniqC] = useState(false);
  const [useWcL, setUseWcL] = useState(false);
  const [redirErr, setRedirErr] = useState(false);

  const activeGrepEnergy = hasStage("grep") && grepEnergy;
  const activeGrepNoNoise = hasStage("grepv") && grepNoNoise;
  const activeSort = hasStage("sort") && useSort;
  const activeUniqC = hasStage("uniqc") && useUniqC;
  const activeWcL = hasStage("wc") && useWcL;
  const activeRedirErr = hasStage("stderr") && redirErr;

  // Compute stdout and stderr streams step-by-step
  const stderrLines = RAW_STREAM.filter((r) => r.err).map((r) => r.text);
  let stdoutLines = RAW_STREAM.filter((r) => !r.err).map((r) => r.text);

  if (activeGrepEnergy) {
    stdoutLines = stdoutLines.filter((l) => l.includes("ENERGY"));
  }
  if (activeGrepNoNoise) {
    stdoutLines = stdoutLines.filter((l) => !l.includes("NOISE"));
  }
  if (activeSort) {
    stdoutLines = [...stdoutLines].sort();
  }
  if (activeUniqC) {
    const collapsed: string[] = [];
    for (const line of stdoutLines) {
      if (collapsed.length === 0 || !collapsed[collapsed.length - 1].endsWith(line)) {
        collapsed.push(`   1 ${line}`);
      } else {
        const prev = collapsed[collapsed.length - 1];
        const count = parseInt(prev.trim().split(/\s+/)[0], 10) + 1;
        collapsed[collapsed.length - 1] = `   ${count} ${line}`;
      }
    }
    stdoutLines = collapsed;
  }
  if (activeWcL) {
    stdoutLines = [`${stdoutLines.length}`];
  }

  // Build command string
  const cmdParts: string[] = [];
  cmdParts.push(`cat reactor.log${activeRedirErr ? " 2> errors.log" : ""}`);
  if (activeGrepEnergy) cmdParts.push("grep ENERGY");
  if (activeGrepNoNoise) cmdParts.push("grep -v NOISE");
  if (activeSort) cmdParts.push("sort");
  if (activeUniqC) cmdParts.push("uniq -c");
  if (activeWcL) cmdParts.push("wc -l");
  const fullCmd = cmdParts.join(" | ");

  const hasFilterGroup = hasStage("grep") || hasStage("grepv");
  const hasProcessGroup = hasStage("sort") || hasStage("uniqc") || hasStage("wc");
  const hasStderr = hasStage("stderr");

  const activeProcLabels = [
    activeSort && "sort",
    activeUniqC && "uniq -c",
    activeWcL && "wc -l",
  ].filter(Boolean) as string[];

  // Dynamic SVG box coordinates for viewBox="0 0 420 96" (or height 68 if no stderr)
  const srcBox = hasFilterGroup && hasProcessGroup ? { x: 8, w: 76 } : hasFilterGroup || hasProcessGroup ? { x: 8, w: 86 } : { x: 8, w: 100 };
  const filterBox = hasProcessGroup ? { x: 100, w: 86 } : { x: 136, w: 136 };
  const procBox = hasFilterGroup ? { x: 202, w: 124 } : { x: 136, w: 136 };
  const outBox = hasFilterGroup && hasProcessGroup ? { x: 342, w: 70 } : { x: 314, w: 98 };
  const srcCx = srcBox.x + srcBox.w / 2;

  const toggleItems = [
    {
      key: "grep" as const,
      label: "| grep ENERGY",
      on: grepEnergy,
      toggle: () => {
        const next = !grepEnergy;
        setGrepEnergy(next);
        if (next) setGrepNoNoise(false);
      },
      color: "gold" as const,
    },
    {
      key: "grepv" as const,
      label: "| grep -v NOISE",
      on: grepNoNoise,
      toggle: () => {
        const next = !grepNoNoise;
        setGrepNoNoise(next);
        if (next) setGrepEnergy(false);
      },
      color: "gold" as const,
    },
    { key: "sort" as const, label: "| sort", on: useSort, toggle: () => setUseSort(!useSort), color: "cyan" as const },
    { key: "uniqc" as const, label: "| uniq -c", on: useUniqC, toggle: () => setUseUniqC(!useUniqC), color: "cyan" as const },
    { key: "wc" as const, label: "| wc -l", on: useWcL, toggle: () => setUseWcL(!useWcL), color: "green" as const },
    { key: "stderr" as const, label: "2> errors.log", on: redirErr, toggle: () => setRedirErr(!redirErr), color: "red" as const },
  ].filter((st) => hasStage(st.key));

  return (
    <div className="rounded border border-board-600 bg-board-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 px-3 py-2">
        <span className="silk text-gold">Տվյալների զտարան · Pipeline &amp; Streams</span>
        <span className="font-mono text-[11px] text-led-cyan">$ {fullCmd}</span>
      </div>

      {/* SVG Pipeline Flow Diagram */}
      <svg
        viewBox={hasStderr ? "0 0 420 96" : "0 0 420 68"}
        className="block w-full border-b border-board-600 bg-board-950"
        role="img"
        aria-label={`Pipeline՝ ${fullCmd}`}
      >
        {/* Source file */}
        <rect x={srcBox.x} y={12} width={srcBox.w} height={44} rx={3} fill={P.b800} stroke={P.silkMute} strokeWidth={1.2} />
        <text x={srcCx} y={30} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={P.silk}>
          reactor.log
        </text>
        <text x={srcCx} y={44} textAnchor="middle" fontSize={7.2} fill={P.silkMute}>
          7 stdout + 2 err
        </text>

        {/* stderr 2> branch */}
        {hasStderr && (
          <>
            <path
              d={`M${srcCx},56 L${srcCx},76 L140,76`}
              fill="none"
              stroke={activeRedirErr ? P.red : P.silkMute}
              strokeWidth={1.4}
              strokeDasharray={activeRedirErr ? undefined : "3 3"}
            />
            <rect
              x={140}
              y={64}
              width={118}
              height={24}
              rx={3}
              fill={activeRedirErr ? "#341418" : P.b900}
              stroke={activeRedirErr ? P.red : P.silkMute}
              strokeWidth={1.1}
            />
            <text x={199} y={79} textAnchor="middle" fontSize={8} fill={activeRedirErr ? P.red : P.silkMute}>
              {activeRedirErr ? "2> errors.log (2)" : "stderr (էկրանին)"}
            </text>
          </>
        )}

        {/* stdout pipe chain */}
        {hasFilterGroup && (
          <>
            <line x1={srcBox.x + srcBox.w} y1={34} x2={filterBox.x} y2={34} stroke={P.green} strokeWidth={2} />
            <rect
              x={filterBox.x}
              y={12}
              width={filterBox.w}
              height={44}
              rx={3}
              fill={activeGrepEnergy || activeGrepNoNoise ? P.b700 : P.b900}
              stroke={activeGrepEnergy || activeGrepNoNoise ? P.gold : P.silkMute}
              strokeWidth={1.3}
            />
            <text
              x={filterBox.x + filterBox.w / 2}
              y={30}
              textAnchor="middle"
              fontSize={8.2}
              fontWeight={600}
              fill={activeGrepEnergy || activeGrepNoNoise ? P.gold : P.silkMute}
            >
              {activeGrepEnergy ? "grep ENERGY" : activeGrepNoNoise ? "grep -v NOISE" : "(առանց ֆիլտրի)"}
            </text>
            <text x={filterBox.x + filterBox.w / 2} y={45} textAnchor="middle" fontSize={7.2} fill={P.silkDim}>
              Ֆիլտր
            </text>
          </>
        )}

        {hasProcessGroup && (
          <>
            <line
              x1={hasFilterGroup ? filterBox.x + filterBox.w : srcBox.x + srcBox.w}
              y1={34}
              x2={procBox.x}
              y2={34}
              stroke={P.green}
              strokeWidth={2}
            />
            <rect
              x={procBox.x}
              y={12}
              width={procBox.w}
              height={44}
              rx={3}
              fill={activeProcLabels.length > 0 ? P.b700 : P.b900}
              stroke={activeProcLabels.length > 0 ? P.cyan : P.silkMute}
              strokeWidth={1.3}
            />
            {activeProcLabels.length === 3 ? (
              <>
                <text x={procBox.x + procBox.w / 2} y={24} textAnchor="middle" fontSize={8} fontWeight={600} fill={P.cyan}>
                  {activeProcLabels.slice(0, 2).join(" | ")}
                </text>
                <text x={procBox.x + procBox.w / 2} y={35} textAnchor="middle" fontSize={8} fontWeight={600} fill={P.cyan}>
                  {`| ${activeProcLabels[2]}`}
                </text>
                <text x={procBox.x + procBox.w / 2} y={48} textAnchor="middle" fontSize={7} fill={P.silkDim}>
                  Մշակում
                </text>
              </>
            ) : (
              <>
                <text
                  x={procBox.x + procBox.w / 2}
                  y={30}
                  textAnchor="middle"
                  fontSize={8.2}
                  fontWeight={600}
                  fill={activeProcLabels.length > 0 ? P.cyan : P.silkMute}
                >
                  {activeProcLabels.join(" | ") || "ուղիղ հոսք"}
                </text>
                <text x={procBox.x + procBox.w / 2} y={45} textAnchor="middle" fontSize={7.2} fill={P.silkDim}>
                  Մշակում
                </text>
              </>
            )}
          </>
        )}

        <line
          x1={
            hasProcessGroup
              ? procBox.x + procBox.w
              : hasFilterGroup
                ? filterBox.x + filterBox.w
                : srcBox.x + srcBox.w
          }
          y1={34}
          x2={outBox.x}
          y2={34}
          stroke={P.green}
          strokeWidth={2}
        />
        <rect x={outBox.x} y={12} width={outBox.w} height={44} rx={3} fill={P.b700} stroke={P.green} strokeWidth={1.3} />
        <text x={outBox.x + outBox.w / 2} y={30} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={P.green}>
          stdout
        </text>
        <text x={outBox.x + outBox.w / 2} y={45} textAnchor="middle" fontSize={7.5} fill={P.silk}>
          {stdoutLines.length} տող
        </text>
      </svg>

      {/* Interactive Stage Toggles */}
      <div className="border-b border-board-600 p-3">
        <p className="mb-1.5 text-xs text-silk-mute">Միացրեք կամ անջատեք խողովակաշարի (pipe `|`) փուլերը՝</p>
        <div className="flex flex-wrap gap-1.5">
          {toggleItems.map((st) => (
            <button
              key={st.key}
              type="button"
              aria-pressed={st.on}
              onClick={st.toggle}
              className={cn(
                "rounded border px-2 py-1 font-mono text-[11px] font-medium transition",
                st.on
                  ? st.color === "red"
                    ? "border-led-red bg-led-red/20 text-led-red"
                    : st.color === "cyan"
                      ? "border-led-cyan bg-led-cyan/20 text-led-cyan"
                      : st.color === "green"
                        ? "border-led-green bg-led-green/20 text-led-green"
                        : "border-gold bg-gold/20 text-gold"
                  : "border-board-600 bg-board-950 text-silk-mute hover:text-silk",
              )}
            >
              {st.on ? "✓ " : "+ "}
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Left (Raw Stream) vs Right (Refined Output + stderr) */}
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
        <div className="rounded border border-board-600 bg-board-950 p-2">
          <div className="mb-1 flex items-center justify-between border-b border-board-700 pb-1">
            <span className="font-mono text-[11px] text-silk">Աղբյուր՝ reactor.log</span>
            <span className="silk text-[9px] text-silk-mute">stdout + stderr</span>
          </div>
          <div className="space-y-0.5 font-mono text-[10.5px]">
            {RAW_STREAM.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-xs px-1.5 py-0.5",
                  r.err ? "bg-led-red/15 text-led-red" : "text-silk-dim",
                )}
              >
                {r.text} {r.err && <span className="text-[9px] opacity-80">(stderr)</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex-1 rounded border border-board-600 bg-board-950 p-2">
            <div className="mb-1 flex items-center justify-between border-b border-board-700 pb-1">
              <span className="font-mono text-[11px] text-led-green">Ելք (stdout)</span>
              <span className="silk text-[9px] text-led-green">{stdoutLines.length} տող</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              {!activeRedirErr &&
                stderrLines.map((e, i) => (
                  <div key={`err-${i}`} className="rounded-xs bg-led-red/20 px-1.5 py-0.5 text-led-red">
                    {e} <span className="text-[9px]">(չորսված stderr)</span>
                  </div>
                ))}
              {stdoutLines.map((l, i) => (
                <div key={i} className="rounded-xs bg-led-green/15 px-1.5 py-0.5 font-medium text-led-green">
                  {l}
                </div>
              ))}
            </div>
          </div>

          {activeRedirErr && (
            <div className="rounded border border-led-red/50 bg-board-950 p-2">
              <div className="mb-1 flex items-center justify-between border-b border-board-700 pb-0.5">
                <span className="font-mono text-[10.5px] text-led-red">errors.log (2&gt;)</span>
                <span className="silk text-[9px] text-led-red">Առանձնացված է</span>
              </div>
              <div className="space-y-0.5 font-mono text-[10px] text-led-red">
                {stderrLines.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {hasStage("sort") && hasStage("uniqc") && activeUniqC && !activeSort && (
        <p className="border-t border-board-600 bg-gold/10 px-3 py-2 text-xs text-gold">
          Ուշադրություն․ առանց <code>sort</code>-ի <code>uniq -c</code>-ն չի միավորում կրկնվող տողերը, քանի որ դրանք կողք կողքի չեն։ Միացրեք <code>| sort</code>։
        </p>
      )}
    </div>
  );
}

/* ---------- 8. TreeNavLab: pwd, ls, ls -la (X-ray), cd, mkdir, cp, mv visualizer ---------- */

export function TreeNavLab() {
  const init = {
    cwd: "/home/architect" as "/home" | "/home/architect" | "/home/architect/fortress" | "/home/architect/.vault",
    xray: false,
    hasFortress: false,
    hasClone: false,
    cloneMoved: false,
    msg: "Դուք /home/architect սենյակում եք։ Փորձեք ls -la (ռենտգեն), mkdir, cp, mv և cd հրամանները։",
  };
  const [s, setS] = useState(init);

  return (
    <div className="rounded border border-board-600 bg-board-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 px-3 py-2">
        <span className="silk text-gold">Տարածական քարտեզ և Ռենտգեն · Tree &amp; X-Ray</span>
        <span className="font-mono text-[11px] text-led-cyan">pwd: {s.cwd}</span>
      </div>

      <svg viewBox="0 0 340 166" className="block w-full bg-board-950" role="img" aria-label={`Սենյակների ծառ՝ ${s.msg}`}>
        {/* Parent room (..) */}
        <rect
          x={115}
          y={8}
          width={110}
          height={26}
          rx={4}
          fill={s.cwd === "/home" ? P.b700 : P.b900}
          stroke={s.cwd === "/home" ? P.gold : P.silkMute}
          strokeWidth={1.3}
        />
        <text x={170} y={24} textAnchor="middle" fontSize={9.5} fill={s.cwd === "/home" ? P.gold : P.silkDim}>
          .. (/home) {s.cwd === "/home" ? "★ ԱՅՍՏԵՂ" : ""}
        </text>

        <line x1={170} y1={34} x2={170} y2={50} stroke={P.silkMute} strokeWidth={1.4} />

        {/* Current main room (/home/architect) */}
        <rect
          x={14}
          y={50}
          width={312}
          height={64}
          rx={5}
          fill={s.cwd === "/home/architect" ? P.b800 : P.b900}
          stroke={s.cwd === "/home/architect" ? P.gold : P.silkMute}
          strokeWidth={1.5}
        />
        <text x={22} y={64} fontSize={8.5} fontWeight={600} fill={P.gold}>
          . (/home/architect) {s.cwd === "/home/architect" ? "★ ԱՅՍՏԵՂ" : ""}
        </text>

        {/* Visible files in /home/architect */}
        <rect x={22} y={72} width={68} height={32} rx={3} fill={P.b700} stroke={P.green} strokeWidth={1.2} />
        <text x={56} y={87} textAnchor="middle" fontSize={9.5} fill={P.green}>
          key.dat
        </text>
        <text x={56} y={98} textAnchor="middle" fontSize={7.5} fill={P.silkMute}>
          բնօրինակ
        </text>

        {/* Cloned file */}
        {s.hasClone && !s.cloneMoved && (
          <g>
            <rect x={98} y={72} width={72} height={32} rx={3} fill={P.b700} stroke={P.gold} strokeWidth={1.2} />
            <text x={134} y={87} textAnchor="middle" fontSize={9.5} fill={P.gold}>
              clone.dat
            </text>
            <text x={134} y={98} textAnchor="middle" fontSize={7.5} fill={P.silkMute}>
              պատճեն (cp)
            </text>
          </g>
        )}

        {/* Cloaked dotfiles (.key & .vault) */}
        <g opacity={s.xray ? 1 : 0.22}>
          <rect
            x={178}
            y={72}
            width={66}
            height={32}
            rx={3}
            fill={P.b900}
            stroke={s.xray ? P.cyan : P.silkMute}
            strokeWidth={1.2}
            strokeDasharray="4 2"
          />
          <text x={211} y={87} textAnchor="middle" fontSize={9.5} fill={s.xray ? P.cyan : P.silkMute}>
            .secret
          </text>
          <text x={211} y={98} textAnchor="middle" fontSize={7.5} fill={s.xray ? P.cyan : P.silkMute}>
            {s.xray ? "բացահայտված" : "թաքնված (.)"}
          </text>
        </g>

        {/* Child room 1: .vault (hidden dir) */}
        <line x1={250} y1={114} x2={250} y2={128} stroke={s.xray ? P.cyan : P.silkMute} strokeWidth={1.3} strokeDasharray="3 2" />
        <g opacity={s.xray || s.cwd === "/home/architect/.vault" ? 1 : 0.25}>
          <rect
            x={186}
            y={128}
            width={136}
            height={30}
            rx={4}
            fill={s.cwd === "/home/architect/.vault" ? P.b700 : P.b900}
            stroke={P.cyan}
            strokeWidth={1.3}
            strokeDasharray="4 2"
          />
          <text x={254} y={147} textAnchor="middle" fontSize={9.5} fill={P.cyan}>
            .vault/ (master.key) {s.cwd === "/home/architect/.vault" ? "★" : ""}
          </text>
        </g>

        {/* Child room 2: fortress/ (created by mkdir) */}
        {s.hasFortress && (
          <g>
            <line x1={86} y1={114} x2={86} y2={128} stroke={P.gold} strokeWidth={1.4} />
            <rect
              x={18}
              y={128}
              width={148}
              height={30}
              rx={4}
              fill={s.cwd === "/home/architect/fortress" ? P.b700 : P.b800}
              stroke={P.gold}
              strokeWidth={1.3}
            />
            <text x={92} y={147} textAnchor="middle" fontSize={9.5} fill={P.gold}>
              fortress/ {s.cloneMoved ? "(shield.dat)" : "(դատարկ)"} {s.cwd === "/home/architect/fortress" ? "★" : ""}
            </text>
          </g>
        )}
      </svg>

      <p className="border-y border-board-600 px-3 py-2 text-sm leading-snug text-silk-dim" aria-live="polite">
        {s.msg}
      </p>

      <div className="flex flex-wrap gap-1.5 p-3">
        <CmdButton
          active={s.xray}
          onClick={() =>
            setS({
              ...s,
              xray: !s.xray,
              msg: !s.xray
                ? "ls -la՝ Ռենտգենը միացավ։ Բացահայտվեցին կետով (.) սկսվող թաքնված անունները՝ .secret, .vault/, ինչպես նաև . (այս սենյակը) և .. (ծնող սենյակը)։"
                : "ls՝ Սովորական սկանավորում․ կետով սկսվող թաքնված ֆայլերը կրկին քողարկված են։",
            })
          }
        >
          {s.xray ? "ls (անջատել -a)" : "ls -la"}
        </CmdButton>
        <CmdButton
          disabled={s.hasFortress}
          onClick={() =>
            setS({
              ...s,
              hasFortress: true,
              msg: "mkdir fortress՝ Կառուցվեց նոր դատարկ սենյակ (directory) ընթացիկ սենյակի ներսում։",
            })
          }
        >
          mkdir fortress
        </CmdButton>
        <CmdButton
          disabled={s.hasClone}
          onClick={() =>
            setS({
              ...s,
              hasClone: true,
              msg: "cp key.dat clone.dat՝ Կլոնավորման ճառագայթը ստեղծեց անկախ պատճեն նոր inode-ի վրա։",
            })
          }
        >
          cp key.dat clone.dat
        </CmdButton>
        <CmdButton
          disabled={!s.hasFortress || !s.hasClone || s.cloneMoved}
          onClick={() =>
            setS({
              ...s,
              cloneMoved: true,
              msg: "mv clone.dat fortress/shield.dat՝ Ֆայլը միանգամից տեղափոխվեց fortress/ սենյակի ներս և վերանվանվեց shield.dat։",
            })
          }
        >
          mv clone.dat fortress/shield.dat
        </CmdButton>
        <CmdButton
          onClick={() =>
            setS({
              ...s,
              cwd: s.cwd === "/home" ? "/home/architect" : "/home",
              msg:
                s.cwd === "/home"
                  ? "cd architect՝ Իջաք /home/architect սենյակ։"
                  : "cd ..՝ Բարձրացաք մեկ մակարդակ վերև՝ ծնող directory (/home)։",
            })
          }
        >
          {s.cwd === "/home" ? "cd architect" : "cd .."}
        </CmdButton>
        <CmdButton
          onClick={() =>
            setS({
              ...s,
              xray: true,
              cwd: "/home/architect/.vault",
              msg: "cd .vault՝ Անցաք թաքնված .vault գաղտնարանի ներսը։",
            })
          }
        >
          cd .vault
        </CmdButton>
        <button type="button" onClick={() => setS(init)} className="silk rounded border border-board-600 px-2 py-1.5 text-silk-dim hover:text-silk">
          Սկսել նորից
        </button>
      </div>
    </div>
  );
}

/* ---------- 9. InspectorLab: type, which, man, whatis, apropos, alias resolution visualizer ---------- */

type InspectorCaseId = "alias-ll" | "type-cd" | "type-grep" | "which-grep" | "whatis-ls" | "apropos-copy" | "man-mkdir";

interface InspectorCase {
  id: InspectorCaseId;
  cmd: string;
  target: string;
  activeStage: 1 | 2 | 3 | 4;
  output: string[];
  explanation: string;
}

const INSPECTOR_CASES: InspectorCase[] = [
  {
    id: "alias-ll",
    cmd: "type ll",
    target: "ll",
    activeStage: 1,
    output: ["ll is aliased to 'ls -la'"],
    explanation: "Քայլ 1 (Alias Table)․ Shell-ը նախ ստուգում է alias-ների աղյուսակը։ «ll»-ը կարճատում է, որը shell-ը փոխարինում է «ls -la»-ով։",
  },
  {
    id: "type-cd",
    cmd: "type cd",
    target: "cd",
    activeStage: 2,
    output: ["cd is a shell builtin"],
    explanation: "Քայլ 2 (Shell Builtin)․ «cd»-ն ներկառուցված է հենց shell-ի ներսում։ Այն առանձին ֆայլ չունի /bin-ում, քանի որ պետք է փոխի հենց ընթացիկ shell-ի սենյակը։",
  },
  {
    id: "type-grep",
    cmd: "type grep",
    target: "grep",
    activeStage: 3,
    output: ["grep is /bin/grep"],
    explanation: "Քայլ 3 ($PATH Binaries)․ «grep»-ը ո՛չ alias է, ո՛չ builtin, ուստի shell-ը փնտրում է $PATH-ում և գտնում /bin/grep ծրագիրը։",
  },
  {
    id: "which-grep",
    cmd: "which grep",
    target: "grep",
    activeStage: 3,
    output: ["/bin/grep"],
    explanation: "Քայլ 3 ($PATH Binaries)․ which-ը սկանավորում է միայն /bin և /usr/bin պահոցները և տպում գործարկվող ֆայլի ճշգրիտ հասցեն։",
  },
  {
    id: "whatis-ls",
    cmd: "whatis ls",
    target: "ls",
    activeStage: 4,
    output: ["ls (1) - list directory contents"],
    explanation: "Քայլ 4 (Manual Database)․ whatis-ը կարդում է ուղեցույցների բազայի NAME բաժինը և տպում մեկտողանի համառոտ ամփոփում։",
  },
  {
    id: "apropos-copy",
    cmd: "apropos copy",
    target: "copy",
    activeStage: 4,
    output: ["cp (1) - copy files and directories"],
    explanation: "Քայլ 4 (Manual Database)․ apropos-ը որոնում է բոլոր հրամանների նկարագրություններում ըստ «copy» բանալի բառի։",
  },
  {
    id: "man-mkdir",
    cmd: "man mkdir",
    target: "mkdir",
    activeStage: 4,
    output: ["NAME: mkdir - make directories", "SYNOPSIS: mkdir [-p] DIRECTORY..."],
    explanation: "Քայլ 4 (Manual Database)․ man-ը (և info-ն) բացում է հրամանի ամբողջական տեխնիկական տեղեկատուն (NAME, SYNOPSIS, DESCRIPTION, EXAMPLES)։",
  },
];

export function InspectorLab() {
  const [selectedId, setSelectedId] = useState<InspectorCaseId>("type-cd");
  const cur = INSPECTOR_CASES.find((c) => c.id === selectedId) ?? INSPECTOR_CASES[0];

  const STAGES = [
    { num: 1 as const, x: 8, title: "1. Alias Table", sub: "alias ll='ls -la'", color: P.gold },
    { num: 2 as const, x: 92, title: "2. Builtins", sub: "cd, pwd, echo", color: P.cyan },
    { num: 3 as const, x: 176, title: "3. $PATH (/bin)", sub: "ls, grep, sort", color: P.green },
    { num: 4 as const, x: 260, title: "4. Man DB", sub: "man, whatis, apropos", color: P.violet },
  ];

  return (
    <div className="rounded border border-board-600 bg-board-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 px-3 py-2">
        <span className="silk text-gold">Հրամանների դետեկտիվ · Shell Resolution</span>
        <span className="font-mono text-[11px] text-led-cyan">$ {cur.cmd}</span>
      </div>

      {/* 4-Stage SVG Resolution Flowchart */}
      <svg viewBox="0 0 340 86" className="block w-full border-b border-board-600 bg-board-950" role="img" aria-label={`Հրամանի որոնման շղթա՝ ${cur.explanation}`}>
        <text x={10} y={14} fontSize={8} letterSpacing={1.1} fill={P.silkMute}>
          ԻՆՉՊԵՍ Է SHELL-Ը ԲԱՑԱՀԱՅՏՈՒՄ ՀՐԱՄԱՆԸ (ՔԱՅԼ 1 → 4)
        </text>

        {STAGES.map((st, idx) => {
          const active = cur.activeStage === st.num;
          const passed = cur.activeStage > st.num && cur.activeStage <= 3;
          return (
            <g key={st.num}>
              {idx > 0 && (
                <line
                  x1={st.x - 10}
                  y1={46}
                  x2={st.x}
                  y2={46}
                  stroke={active || passed ? st.color : P.silkMute}
                  strokeWidth={1.6}
                />
              )}
              <rect
                x={st.x}
                y={24}
                width={74}
                height={46}
                rx={4}
                fill={active ? P.b700 : P.b900}
                stroke={active ? st.color : passed ? P.silkDim : P.silkMute}
                strokeWidth={active ? 1.8 : 1.1}
              />
              <text x={st.x + 37} y={41} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={active ? st.color : P.silkDim}>
                {st.title}
              </text>
              <text x={st.x + 37} y={54} textAnchor="middle" fontSize={7.5} fill={P.silkMute}>
                {st.sub}
              </text>
              {active && (
                <text x={st.x + 37} y={65} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={st.color}>
                  ★ ԳՏՆՎԵՑ
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Output terminal box */}
      <div className="border-b border-board-600 bg-board-950 px-3 py-2">
        <p className="font-mono text-xs text-gold">$ {cur.cmd}</p>
        {cur.output.map((line, i) => (
          <p key={i} className="mt-0.5 font-mono text-xs text-led-green">
            {line}
          </p>
        ))}
      </div>

      <p className="border-b border-board-600 px-3 py-2 text-sm leading-snug text-silk-dim" aria-live="polite">
        {cur.explanation}
      </p>

      <div className="flex flex-wrap gap-1.5 p-3">
        {INSPECTOR_CASES.map((c) => (
          <CmdButton key={c.id} active={c.id === selectedId} onClick={() => setSelectedId(c.id)}>
            {c.cmd}
          </CmdButton>
        ))}
      </div>
    </div>
  );
}
