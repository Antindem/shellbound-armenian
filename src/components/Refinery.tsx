import { useState } from "react";
import type { Trace } from "../game/shell";
import { P } from "./Sprites";

const GAP = 150;
const X0 = 62;
const CY = 62;
const H = 134;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/**
 * The pipeline factory: every command is a machine, every | is a tube,
 * and > / >> pour the result into a tank.
 */
export function Refinery({ trace, onClose }: { trace: Trace; onClose: () => void }) {
  const n = trace.stages.length;
  const [sel, setSel] = useState(n - 1);
  const W = X0 * 2 + n * GAP;
  const sink = trace.sink;
  const cap = sink ? Math.max(8, sink.before, sink.after) : 8;
  const picked = trace.stages[sel];

  return (
    <div className={`slide-up relative z-20 flex max-h-[56%] min-w-0 flex-none flex-col border-t border-copper/50 bg-board-950/95 lg:max-h-none lg:border-l lg:border-t-0 ${n <= 1 ? "lg:w-[46%]" : n === 2 ? "lg:w-[54%]" : "lg:w-[64%]"}`}>
      <div className="flex items-center justify-between gap-3 px-3 pt-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="silk text-copper">Refinery · pipeline-ի մոնիտոր</span>
          <span className="hidden truncate text-xs text-silk-mute sm:inline">Ընտրեք մեքենան՝ տեսնելու, թե ինչ է հոսում դրանից։</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Փակել pipeline-ի մոնիտորը"
          className="silk rounded border border-board-600 px-2 py-0.5 text-silk-dim hover:border-silk-mute hover:text-silk"
        >
          Փակել
        </button>
      </div>

      <div className="flex-none overflow-x-auto overflow-y-hidden lg:py-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ ["--rw" as string]: `${W}px`, ["--rwl" as string]: `${Math.round(W * 1.45)}px`, minWidth: Math.round(W * 0.82) }}
          className="mx-auto block h-auto w-full max-w-[var(--rw)] lg:max-w-[var(--rwl)]"
          role="group"
          aria-label="Pipeline-ի դիագրամ"
        >
          {trace.stages.map((s, i) => {
            const cx = X0 + i * GAP;
            const [cmd, ...rest] = s.label.split(" ");
            const active = sel === i;
            const x1 = cx + 48;
            const x2 = cx + GAP - (i === n - 1 ? 30 : 48);
            const mid = (x1 + x2) / 2;
            return (
              <g key={i}>
                {/* tube to the next machine (or to the sink) */}
                <line x1={x1} y1={CY} x2={x2} y2={CY} stroke={s.err ? "#6b2622" : "#7a4526"} strokeWidth={10} strokeLinecap="round" />
                {s.out.length > 0 && <line x1={x1} y1={CY} x2={x2} y2={CY} stroke={P.copper} strokeWidth={3} className="tube-flow" />}
                {s.err && (
                  <g fill={P.red}>
                    {[0, 1, 2].map((k) => (
                      <circle key={k} cx={x1 + 8 + k * 9} cy={CY + 8} r={2.2} className="drip" style={{ animationDelay: `${k * 0.25}s` }} />
                    ))}
                    <text x={mid} y={CY + 56} textAnchor="middle" fontSize={9.5} letterSpacing={1}>
                      ԱՐՏԱՀՈՍՔ · stderr
                    </text>
                  </g>
                )}
                <rect x={mid - 13} y={CY - 24} width={26} height={14} rx={7} fill={P.b950} stroke={s.err ? P.red : P.copper} strokeWidth={1} />
                <text x={mid} y={CY - 13.4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={s.err ? P.red : P.copper}>
                  {s.out.length}
                </text>

                {/* the machine */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Մեքենա ${i + 1}: ${s.label}. ելքում՝ ${s.out.length} տող։`}
                  onClick={() => setSel(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSel(i);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {i === 0 ? (
                    <rect x={cx - 48} y={CY - 26} width={96} height={52} rx={26} fill={P.b700} stroke={active ? P.gold : P.b600} strokeWidth={active ? 2 : 1.2} />
                  ) : (
                    <polygon
                      points={`${cx - 48},${CY - 16} ${cx - 38},${CY - 26} ${cx + 38},${CY - 26} ${cx + 48},${CY - 16} ${cx + 48},${CY + 16} ${cx + 38},${CY + 26} ${cx - 38},${CY + 26} ${cx - 48},${CY + 16}`}
                      fill={P.b700}
                      stroke={active ? P.gold : P.b600}
                      strokeWidth={active ? 2 : 1.2}
                    />
                  )}
                  <text x={cx} y={CY - 32} textAnchor="middle" fontSize={9.5} letterSpacing={1.3} fill={P.silkDim}>
                    {i === 0 ? "ԱՂԲՅՈՒՐ" : `ՖԻԼՏՐ ${i}`}
                  </text>
                  <text x={cx} y={rest.length ? CY - 2 : CY + 4} textAnchor="middle" fontSize={14.5} fontWeight={600} fill={P.gold}>
                    {cmd || "(ոչինչ)"}
                  </text>
                  {rest.length > 0 && (
                    <text x={cx} y={CY + 13} textAnchor="middle" fontSize={10} fill={P.silkDim}>
                      {clip(rest.join(" "), 14)}
                    </text>
                  )}
                  {s.inN != null && (
                    <text x={cx} y={CY + 41} textAnchor="middle" fontSize={10} fill={P.silkDim}>
                      {s.inN} մուտք → {s.out.length} ելք
                    </text>
                  )}
                </g>
              </g>
            );
          })}

          {/* where it all ends up */}
          {(() => {
            const cx = X0 + n * GAP;
            if (!sink) {
              return (
                <g>
                  <rect x={cx - 28} y={CY - 22} width={56} height={38} rx={4} fill={P.b950} stroke={P.silkMute} strokeWidth={1.3} />
                  <path d={`M${cx - 16},${CY - 10} l8,6 -8,6 M${cx - 3},${CY + 3} h12`} fill="none" stroke={P.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={`M${cx - 10},${CY + 22} h20 M${cx},${CY + 16} v6`} stroke={P.silkMute} strokeWidth={1.4} />
                  <text x={cx} y={CY + 41} textAnchor="middle" fontSize={10} fill={P.silkDim}>
                    stdout → terminal
                  </text>
                </g>
              );
            }
            const top = CY - 34;
            const th = 60;
            const lvl = (v: number) => Math.max(0.001, v / cap);
            const oldCol = sink.sludge ? P.glitch : P.green;
            return (
              <g>
                <text x={cx} y={top - 8} textAnchor="middle" fontSize={9.5} letterSpacing={1.1} fill={P.copper}>
                  {sink.op === ">" ? ">  ԴԱՏԱՐԿԵԼ + ԼՑՆԵԼ" : ">>  ԱՎԵԼԱՑՆԵԼ"}
                </text>
                <rect x={cx - 26} y={top} width={52} height={th} rx={5} fill={P.b950} />
                {sink.op === ">" ? (
                  <>
                    <rect className="tank-drain" x={cx - 23} y={top + 3} width={46} height={th - 6} rx={3} fill={oldCol} opacity={0.85} style={{ ["--from" as string]: lvl(sink.before) }} />
                    <rect className="tank-fill" x={cx - 23} y={top + 3} width={46} height={th - 6} rx={3} fill={P.green} opacity={0.85} style={{ ["--from" as string]: 0.001, ["--to" as string]: lvl(sink.after) }} />
                  </>
                ) : (
                  <rect className="tank-append" x={cx - 23} y={top + 3} width={46} height={th - 6} rx={3} fill={oldCol} opacity={0.85} style={{ ["--from" as string]: lvl(sink.before), ["--to" as string]: lvl(sink.after) }} />
                )}
                <rect x={cx - 26} y={top} width={52} height={th} rx={5} fill="none" stroke={P.silkDim} strokeWidth={1.4} />
                {[1, 2, 3].map((k) => (
                  <line key={k} x1={cx + 18} x2={cx + 26} y1={top + (th * k) / 4} y2={top + (th * k) / 4} stroke={P.silkDim} strokeWidth={1} />
                ))}
                <text x={cx} y={top + th + 13} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={P.silk}>
                  {clip(sink.file, 16)}
                </text>
                <text x={cx} y={top + th + 25} textAnchor="middle" fontSize={9.5} fill={P.silkDim}>
                  {sink.op === ">" ? `${sink.before} → 0 → ${sink.after} տող` : `${sink.before} + ${sink.added} = ${sink.after} տող`}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {picked && (
        <div className="min-h-0 flex-1 overflow-auto border-t border-board-700 px-3 py-2" aria-live="polite">
          <p className="text-[13px] text-silk-mute">
            Ելք <span className="font-mono text-gold">{picked.label || "(ոչինչ)"}</span>-ից՝{" "}
            <span className="text-silk-dim">
              {picked.out.length} տող
            </span>
          </p>
          {picked.out.length > 0 && (
            <pre className="mt-1 font-mono text-[12.5px] leading-[1.5] text-silk-dim">
              {picked.out.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
