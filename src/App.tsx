import { useEffect, useReducer, useRef, useState } from "react";
import { Codex } from "./components/Codex";
import { GlitchBattle } from "./components/GlitchBattle";
import { MainMenu } from "./components/MainMenu";
import { P } from "./components/Sprites";
import { Terminal } from "./components/Terminal";
import { WorldView } from "./components/WorldView";
import { ACTS, MISSIONS } from "./game/missions";
import { init, persist, reducer } from "./game/state";
import { cn } from "./utils/cn";

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2.5 text-left transition hover:opacity-90"
      title="Գլխավոր մենյու"
    >
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="flex-none">
        <rect x="1" y="1" width="30" height="30" rx="6" fill="#0b2620" stroke="#edbd4f" strokeWidth="1.5" />
        <path d="M8 10l7 6-7 6" fill="none" stroke="#edbd4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 22h8" stroke="#eef3ea" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 leading-none">
        <p className="truncate font-display text-[15px] font-bold tracking-[0.1em] text-gold sm:text-[17px] sm:tracking-[0.14em]">
          SHELLBOUND
        </p>
        <p className="silk mt-1 hidden truncate text-[9.5px] text-silk-mute sm:block">Kernel-ի քրոնիկոնը</p>
      </div>
    </button>
  );
}

/** 3 CPU Core icons in the top HUD with spark/smoke burnout animation when lost. */
function CpuCoresHud({ cores }: { cores: number }) {
  const prevCores = useRef(cores);
  const [burningIdx, setBurningIdx] = useState<number | null>(null);

  useEffect(() => {
    if (cores < prevCores.current) {
      setBurningIdx(cores);
      const t = setTimeout(() => setBurningIdx(null), 900);
      prevCores.current = cores;
      return () => clearTimeout(t);
    }
    prevCores.current = cores;
  }, [cores]);

  return (
    <div
      className="flex items-center gap-1.5 rounded border border-board-600 bg-board-950 px-2.5 py-1"
      title={`CPU միջուկներ՝ ${cores} / 3`}
      aria-label={`CPU միջուկներ՝ ${cores} / 3`}
    >
      <span className="silk hidden text-[9.5px] text-silk-mute xl:inline">CPU</span>
      {[0, 1, 2].map((i) => {
        const active = i < cores;
        const justBurned = burningIdx === i;
        return (
          <div key={i} className={cn("relative flex items-center justify-center", justBurned && "fx-shake")}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              {/* CPU pins */}
              <path
                d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"
                stroke={active ? P.cyan : "#3b4f48"}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* CPU body */}
              <rect
                x="5"
                y="5"
                width="14"
                height="14"
                rx="2.5"
                fill={active ? "#0d3834" : "#151a19"}
                stroke={active ? P.cyan : justBurned ? P.red : "#3b4f48"}
                strokeWidth="1.6"
              />
              {active ? (
                <rect x="8.5" y="8.5" width="7" height="7" rx="1" fill={P.cyan} className="core-pulse" />
              ) : (
                /* Cracked core trace */
                <path d="M7 7l4 5-2 3 6 2" fill="none" stroke={P.red} strokeWidth="1.5" strokeLinecap="round" />
              )}
              {justBurned && (
                <g>
                  <circle cx="12" cy="12" r="10" fill="none" stroke={P.gold} strokeWidth="2" className="fx-ring" />
                  <path d="M12 2l2-2M4 6l-3-2M20 6l3-2" stroke={P.gold} strokeWidth="1.8" strokeLinecap="round" />
                </g>
              )}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [game, dispatch] = useReducer(reducer, undefined, init);
  const [tab, setTab] = useState<"codex" | "world">("codex");
  const [menu, setMenu] = useState(false);

  useEffect(() => persist(game), [game]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const go = (mi: number) => {
    dispatch({ type: "goto", mi });
    setTab("codex");
    setMenu(false);
  };

  // A new mission always opens on its briefing (matters on small screens, where panels are tabbed).
  useEffect(() => {
    if (game.phase === "briefing") setTab("codex");
  }, [game.mi, game.phase]);

  const byAct = ACTS.map((a, ai) => ({
    ...a,
    missions: MISSIONS.map((m, mi) => ({ m, mi })).filter((x) => x.m.act === ai),
  }));

  return (
    <div className="flex h-dvh min-h-[420px] flex-col bg-board-950 text-silk">
      <header className="relative z-30 flex h-12 flex-none items-center gap-2 border-b border-board-600 bg-board-900 px-3 sm:gap-3">
        <Logo onClick={() => dispatch({ type: "openMenu" })} />

        {/* campaign track: one solder pad per mission (only when in game screen) */}
        {game.screen === "game" && (
          <nav aria-label="Առաջընթաց" className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 xl:flex">
            {byAct.map((a, ai) => (
              <div
                key={a.tag}
                className={cn(
                  "flex flex-none items-center gap-1.5 whitespace-nowrap",
                  ai === 0 && "ml-auto pl-1",
                  ai === byAct.length - 1 && "mr-auto pr-1",
                )}
              >
                {ai > 0 && <span aria-hidden className="h-px w-3 flex-none bg-gold-dim/60" />}
                <span className="silk whitespace-nowrap text-[9.5px] text-silk-mute">{a.tag}</span>
                {a.missions.map(({ m, mi }) => {
                  const scoreObj = game.activeSave.levelScores[m.id];
                  const done = scoreObj != null || game.completed.includes(m.id);
                  const current = mi === game.mi;
                  const titleText = scoreObj
                    ? `${mi + 1}. ${m.title} — Միավորներ՝ ${scoreObj.score} / ${scoreObj.maxScore}`
                    : `${mi + 1}. ${m.title}`;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => go(mi)}
                      title={titleText}
                      aria-label={titleText}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "flex size-3.5 flex-none items-center justify-center rounded-full border transition",
                        done ? "border-gold bg-gold" : "border-board-500 bg-board-950 hover:border-gold",
                        current && "ring-2 ring-gold/70 ring-offset-1 ring-offset-board-900",
                      )}
                    >
                      <span className={cn("size-1 rounded-full", done ? "bg-board-950" : current ? "bg-gold" : "bg-transparent")} />
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}

        <div className="ml-auto flex flex-none items-center gap-1.5 sm:gap-2">
          {/* 3 CPU Cores Status */}
          {game.screen === "game" && <CpuCoresHud cores={game.cores} />}

          {/* Persistent SFX Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={() => dispatch({ type: "toggleSfx" })}
            aria-pressed={!game.settings.sfxMuted}
            title={game.settings.sfxMuted ? "Միացնել ձայնային էֆեկտները (SFX)" : "Անջատել ձայնային էֆեկտները (SFX)"}
            className={cn(
              "silk flex h-[30px] items-center gap-1 rounded border px-2 transition",
              game.settings.sfxMuted
                ? "border-board-600 bg-board-950 text-silk-mute"
                : "border-led-cyan/60 bg-led-cyan/10 text-led-cyan",
            )}
          >
            <span>{game.settings.sfxMuted ? "🔇" : "🔊"}</span>
            <span className="hidden sm:inline">SFX</span>
          </button>

          {/* Persistent BGM Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={() => dispatch({ type: "toggleMusic" })}
            aria-pressed={!game.settings.musicMuted}
            title={game.settings.musicMuted ? "Միացնել երաժշտությունը (BGM)" : "Անջատել երաժշտությունը (BGM)"}
            className={cn(
              "silk flex h-[30px] items-center gap-1 rounded border px-2 transition",
              game.settings.musicMuted
                ? "border-board-600 bg-board-950 text-silk-mute"
                : "border-gold/60 bg-gold/10 text-gold",
            )}
          >
            <span>{game.settings.musicMuted ? "🎵✕" : "🎵"}</span>
            <span className="hidden sm:inline">BGM</span>
          </button>

          {game.screen === "game" && (
            <>
              <div className="flex rounded border border-board-600 p-0.5 md:hidden" role="tablist" aria-label="Վահանակ">
                {(["codex", "world"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "silk rounded-sm px-2 py-1 transition-colors",
                      tab === t ? "bg-gold text-board-950" : "text-silk-dim hover:text-silk",
                    )}
                  >
                    {t === "codex" ? "codex" : "աշխարհ"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => dispatch({ type: "openLevelSelect" })}
                className="silk flex h-[30px] items-center gap-1.5 rounded border border-board-600 px-2.5 text-silk-dim hover:border-gold hover:text-silk"
              >
                <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden>
                  <path d="M0 1h12M0 5h12M0 9h12" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <span className="hidden sm:inline">Առաքելություններ</span>
              </button>

              <button
                type="button"
                onClick={() => dispatch({ type: "openMenu" })}
                className="silk flex h-[30px] items-center gap-1 rounded border border-board-600 px-2.5 text-silk-dim hover:border-gold hover:text-gold"
              >
                <span>Մենյու</span>
              </button>
            </>
          )}
        </div>
      </header>

      {game.screen !== "game" ? (
        <MainMenu game={game} dispatch={dispatch} />
      ) : (
        <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            className={cn(
              "min-h-0 flex-1 border-board-600 md:flex md:w-[340px] md:flex-none md:border-r lg:w-[390px] xl:w-[420px]",
              tab === "codex" ? "flex" : "hidden",
            )}
          >
            <Codex
              game={game}
              dispatch={dispatch}
              onUnlock={() => {
                dispatch({ type: "unlock" });
                setTab("world");
              }}
            />
          </div>

          <div className={cn("flex min-h-0 min-w-0 flex-col md:flex-1", tab === "world" ? "flex-1" : "flex-none")}>
            {/* On phones the locked terminal steps aside while the briefing is being read. */}
            <div className={cn("min-h-0 flex-1 md:flex md:flex-[1.45]", tab === "world" ? "flex" : "hidden")}>
              <WorldView game={game} dispatch={dispatch} />
            </div>
            <div
              className={cn(
                "h-[38dvh] min-h-0 flex-none md:flex md:h-auto md:flex-1",
                tab === "codex" && game.phase === "briefing" ? "hidden" : "flex",
              )}
            >
              <Terminal game={game} dispatch={dispatch} onOpenCodex={() => setTab("codex")} />
            </div>
          </div>

          {/* Pokémon-style Glitch Battle Modal */}
          {game.battle && <GlitchBattle game={game} dispatch={dispatch} />}

          {/* System Crash (0 CPU Cores) Game Over Overlay */}
          {game.cores <= 0 && (
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label="Համակարգի խափանում"
              className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-board-950/90 p-4 backdrop-blur-sm"
            >
              <div className="w-full max-w-md rounded-lg border-2 border-led-red bg-board-900 p-6 text-center shadow-[0_0_50px_-10px_rgba(255,110,102,0.6)]">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-led-red/60 bg-led-red/15 text-2xl text-led-red">
                  ⚡
                </div>
                <p className="silk mt-3 text-led-red">CPU CORES DEPLETED · 0 / 3</p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-wide text-silk">
                  Համակարգի խափանում
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-silk-dim">
                  Ձեր բոլոր 3 CPU միջուկները շարքից դուրս եկան։ Վերագործարկեք ընթացիկ առաքելությունը՝ բոլոր 3 CPU միջուկները վերականգնելու և նորից փորձելու համար։
                </p>
                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "retryLevel" })}
                    className="rounded bg-led-red px-5 py-2.5 font-display text-sm font-bold tracking-wide text-board-950 transition hover:brightness-110"
                  >
                    Կրկին փորձել
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "openLevelSelect" })}
                    className="rounded border border-board-500 bg-board-800 px-4 py-2.5 font-display text-sm font-semibold text-silk transition hover:border-gold"
                  >
                    Առաքելությունների ցանկ
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
