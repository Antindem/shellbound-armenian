import { Dispatch, useState } from "react";
import { playSfx } from "../game/audio";
import { ACTS, MISSIONS } from "../game/missions";
import type { Action, Game } from "../game/state";
import { cn } from "../utils/cn";
import { AvatarSprite, GlitchSprite, P } from "./Sprites";

export function MainMenu({ game, dispatch }: { game: Game; dispatch: Dispatch<Action> }) {
  const [showStats, setShowStats] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);

  const byAct = ACTS.map((a, ai) => ({
    ...a,
    actIdx: ai,
    missions: MISSIONS.map((m, mi) => ({ m, mi })).filter((x) => x.m.act === ai),
  }));

  const currentLevelIdx = game.activeSave.hasActiveSave ? game.activeSave.currentLevel : game.mi;
  const previewAvatar = game.avatar.exists
    ? game.avatar
    : game.activeSave.hasActiveSave
      ? {
          exists: true,
          color: game.activeSave.avatar.color,
          hat: game.activeSave.avatar.hat,
          suit: game.activeSave.avatar.suit,
          cls: game.activeSave.avatar.suit,
          name: game.activeSave.avatar.name ?? "architect",
        }
      : { exists: true, color: "cyan", hat: "astro", suit: "cadet", cls: "cadet", name: "architect" };

  if (game.screen === "levelSelect") {
    return (
      <div className="pcb flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-board-600 bg-board-900/95 px-4 py-3 backdrop-blur-sm">
            <div>
              <p className="silk text-gold">Արշավի քարտեզ · Առաքելությունների ընտրություն</p>
              <h1 className="mt-0.5 font-display text-2xl font-bold tracking-wide text-silk">
                Ընտրեք սեկտորը (Արարներ I–V)
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => dispatch({ type: "goto", mi: currentLevelIdx })}
                className="rounded bg-gold px-4 py-2 font-display text-sm font-bold tracking-wide text-board-950 transition hover:brightness-110"
              >
                Շարունակել (#{currentLevelIdx + 1})
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "openMenu" })}
                className="rounded border border-board-500 bg-board-950 px-3.5 py-2 font-display text-sm font-semibold text-silk-dim transition hover:border-gold hover:text-silk"
              >
                ← Գլխավոր մենյու
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {byAct.map((a) => (
              <section
                key={a.tag}
                className="flex flex-col rounded border border-board-600 bg-board-900/90 p-4 shadow-lg shadow-black/40"
              >
                <header className="mb-3 flex items-center justify-between border-b border-board-700 pb-2">
                  <div>
                    <span className="silk text-gold">{a.tag}</span>
                    <h2 className="font-display text-lg font-bold tracking-wide text-silk">{a.title}</h2>
                  </div>
                  <span className="rounded border border-board-600 bg-board-950 px-2 py-0.5 font-mono text-xs text-silk-mute">
                    {a.missions.filter(({ m }) => game.activeSave.levelScores[m.id] != null).length} / {a.missions.length}
                  </span>
                </header>

                <div className="space-y-2">
                  {a.missions.map(({ m, mi }) => {
                    const currentScore = game.activeSave.levelScores[m.id];
                    const isCompletedInRun = currentScore != null;
                    const isCurrent = mi === currentLevelIdx;
                    const tooltipText = isCompletedInRun
                      ? `Միավորներ՝ ${currentScore.score} / ${currentScore.maxScore}`
                      : undefined;

                    return (
                      <div
                        key={m.id}
                        className="relative"
                        onMouseEnter={() => setHoveredLevel(m.id)}
                        onMouseLeave={() => setHoveredLevel((prev) => (prev === m.id ? null : prev))}
                      >
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "goto", mi })}
                          title={tooltipText}
                          className={cn(
                            "flex w-full items-center gap-3 rounded border px-3 py-2.5 text-left transition",
                            isCurrent
                              ? "border-gold bg-gold/10 ring-1 ring-gold/60"
                              : isCompletedInRun
                                ? "border-led-green/40 bg-board-800/90 hover:border-led-green"
                                : "border-board-700 bg-board-950/75 hover:border-board-500 hover:bg-board-800/60",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 flex-none items-center justify-center rounded-full border font-mono text-xs font-bold",
                              isCompletedInRun
                                ? "border-led-green bg-led-green text-board-950"
                                : isCurrent
                                  ? "border-gold bg-gold text-board-950"
                                  : "border-board-500 text-silk-mute",
                            )}
                          >
                            {mi + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "truncate font-display text-sm font-bold tracking-wide",
                                  isCurrent ? "text-gold" : "text-silk",
                                )}
                              >
                                {m.title}
                              </span>
                              {m.boss && (
                                <span className="rounded bg-glitch/20 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-glitch">
                                  ԲՈՍ
                                </span>
                              )}
                              {isCurrent && (
                                <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gold">
                                  ԸՆԹԱՑԻԿ
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-silk-mute">
                              {m.commands.join(" · ")}
                            </p>
                          </div>

                          {isCompletedInRun && (
                            <span className="flex-none rounded border border-led-green/40 bg-led-green/10 px-2 py-0.5 font-mono text-xs font-semibold text-led-green">
                              {currentScore.score}/{currentScore.maxScore}
                            </span>
                          )}
                        </button>

                        {tooltipText && hoveredLevel === m.id && (
                          <div
                            role="tooltip"
                            className="fade-in pointer-events-none absolute -top-9 right-2 z-30 rounded border border-gold bg-board-950 px-2.5 py-1 font-mono text-xs font-semibold text-gold shadow-lg"
                          >
                            {tooltipText}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Menu ("menu")
  return (
    <div className="pcb relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto grid w-full max-w-4xl items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left column: Hero & Menu Buttons */}
        <div className="flex flex-col rounded border border-board-600 bg-board-900/95 p-6 shadow-2xl shadow-black/70 backdrop-blur-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-block size-2.5 rounded-full bg-led-green led-on" style={{ color: P.green }} />
            <span className="silk text-gold">KERNEL OS · ԿՐԹԱԿԱՆ ՍԻՄՈՒԼՅԱՏՈՐ</span>
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold tracking-[0.12em] text-gold sm:text-5xl">
            SHELLBOUND
          </h1>
          <p className="mt-1 font-display text-lg font-semibold text-silk">
            Kernel-ի քրոնիկոնը · 5 Արարների ընդլայնված հրատարակություն
          </p>
          <p className="mt-3 text-sm leading-relaxed text-silk-dim">
            Բացահայտեք Linux terminal-ի ուժը, կառուցեք ամրոցներ, կառավարեք տվյալների հոսքերը և մաքրեք համակարգը վիրուսային խափանումներից (Glitches) ու 5 հզոր Բոսերից։
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: "startNewGame" })}
              className="flex items-center justify-between rounded bg-gold px-5 py-3.5 font-display text-base font-bold tracking-wide text-board-950 shadow-[0_0_0_1px_rgba(237,189,79,.4),0_8px_24px_-6px_rgba(237,189,79,.5)] transition hover:brightness-110"
            >
              <span>Սկսել / Նոր խաղ</span>
              <span className="font-mono text-xs uppercase opacity-80">Նախաբան → Արար I</span>
            </button>

            {game.activeSave.hasActiveSave && (
              <button
                type="button"
                onClick={() => dispatch({ type: "openLevelSelect" })}
                className="flex items-center justify-between rounded border border-led-green/70 bg-led-green/15 px-5 py-3.5 font-display text-base font-bold tracking-wide text-led-green transition hover:bg-led-green/25"
              >
                <span>Շարունակել</span>
                <span className="font-mono text-xs">
                  Առաքելություն #{currentLevelIdx + 1} · { Object.keys(game.activeSave.levelScores).length } ավարտված
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setShowStats(true);
              }}
              className="flex items-center justify-between rounded border border-board-500 bg-board-800 px-5 py-3 font-display text-base font-semibold tracking-wide text-silk transition hover:border-gold hover:text-gold"
            >
              <span>Վիճակագրություն</span>
              <span className="font-mono text-xs text-silk-mute">Պատմական արդյունքներ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setShowResetConfirm(true);
              }}
              className="flex items-center justify-between rounded border border-led-red/50 bg-led-red/10 px-5 py-3 font-display text-base font-semibold tracking-wide text-led-red transition hover:bg-led-red/20"
            >
              <span>Զրոյացնել ամենը</span>
              <span className="font-mono text-xs opacity-80">Ջնջել պահպանումները</span>
            </button>
          </div>
        </div>

        {/* Right column: Architect & Glitch Showcase Card */}
        <div className="flex flex-col gap-4 rounded border border-board-600 bg-board-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-board-700 pb-2">
            <span className="silk text-led-cyan">Ճարտարապետի հոլոգրամ</span>
            <span className="font-mono text-xs text-gold">~/avatar.cfg</span>
          </div>

          <div className="flex items-center justify-around rounded border border-board-700 bg-board-950/90 py-4">
            <div className="flex flex-col items-center">
              <svg width="96" height="106" viewBox="-30 -58 60 66" aria-label="Ճարտարապետ">
                <AvatarSprite av={previewAvatar} />
              </svg>
              <span className="mt-1 font-mono text-xs text-gold">
                {previewAvatar.name ?? "architect"}
              </span>
              <span className="font-mono text-[11px] text-silk-mute">
                {[previewAvatar.suit ?? "cadet", previewAvatar.hat ?? "none", previewAvatar.color ?? "cyan"].join(" · ")}
              </span>
            </div>

            <div className="font-display text-lg font-bold text-glitch">VS</div>

            <div className="flex flex-col items-center">
              <svg width="96" height="106" viewBox="-34 -56 68 64" aria-label="Վիրուսային Բոս">
                <GlitchSprite type="boss-1" />
              </svg>
              <span className="mt-1 font-mono text-xs text-glitch">Ֆրագմենտատոր</span>
              <span className="font-mono text-[11px] text-silk-mute">Արար I–V Բոսեր</span>
            </div>
          </div>

          <div className="space-y-1.5 rounded border border-board-700 bg-board-800/60 p-3 text-xs leading-relaxed text-silk-dim">
            <p className="font-semibold text-gold">Ինչպե՞ս է հարմարեցվում կերպարը․</p>
            <p>
              Shellbound-ում դուք կերտում եք ձեր կերպարը հենց Linux հրամաններով՝ Նախաբանի <code>0-1</code> և{" "}
              <code>0-2</code> առաքելություններում գրելով <code>Suit</code>, <code>Hat</code> և <code>Color</code> դաշտերը{" "}
              <code>~/avatar.cfg</code> ֆայլի մեջ։
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Modal */}
      {showStats && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Վիճակագրություն"
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-board-950/80 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded border border-gold/60 bg-board-900 shadow-2xl">
            <header className="flex items-center justify-between border-b border-board-600 px-5 py-3.5">
              <div>
                <p className="silk text-gold">Պատմական տվյալներ · cli_game_history</p>
                <h2 className="font-display text-xl font-bold text-silk">Վիճակագրություն</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  playSfx("click");
                  setShowStats(false);
                }}
                className="rounded border border-board-500 px-3 py-1 font-mono text-xs text-silk-dim hover:border-gold hover:text-silk"
              >
                Փակել ✕
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded border border-board-600 bg-board-950 p-3 text-center">
                  <p className="silk text-silk-mute">Հաղթած խափանումներ</p>
                  <p className="mt-1 font-display text-2xl font-bold text-glitch">
                    {game.history.totalGlitchesDefeated}
                  </p>
                </div>
                <div className="rounded border border-board-600 bg-board-950 p-3 text-center">
                  <p className="silk text-silk-mute">Կատարված հրամաններ</p>
                  <p className="mt-1 font-display text-2xl font-bold text-led-cyan">
                    {game.history.totalCommandsRun}
                  </p>
                </div>
                <div className="rounded border border-board-600 bg-board-950 p-3 text-center">
                  <p className="silk text-silk-mute">Ավարտված արշավներ</p>
                  <p className="mt-1 font-display text-2xl font-bold text-led-green">
                    {game.history.completedRuns.length}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="silk mb-2 text-gold">Լավագույն միավորներ ըստ առաքելությունների</h3>
                {Object.keys(game.history.bestLevelScores).length === 0 ? (
                  <p className="rounded border border-dashed border-board-600 p-4 text-center text-sm text-silk-mute">
                    Դեռևս ավարտված առաքելություններ չկան։
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MISSIONS.filter((m) => game.history.bestLevelScores[m.id] != null).map((m) => {
                      const minCmds = m.minCommands ?? Math.max(1, m.objectives.length);
                      const maxScore = Math.max(100, minCmds * 100);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded border border-board-700 bg-board-950 px-3 py-2"
                        >
                          <span className="truncate font-sans text-xs text-silk-dim" title={m.title}>
                            {m.id} · {m.title}
                          </span>
                          <span className="ml-2 flex-none font-mono text-xs font-bold text-gold">
                            {game.history.bestLevelScores[m.id]}{" "}
                            <span className="font-normal text-silk-mute">/ {maxScore}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="silk mb-2 text-gold">Անցած խաղարկումներ (Completed Runs)</h3>
                {game.history.completedRuns.length === 0 ? (
                  <p className="rounded border border-dashed border-board-600 p-4 text-center text-sm text-silk-mute">
                    Ամբողջական ավարտված արշավներ դեռ չկան։
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(() => {
                      const totalCampaignMaxScore = MISSIONS.filter((m) => m.objectives.length > 0).reduce(
                        (sum, m) => sum + Math.max(100, (m.minCommands ?? Math.max(1, m.objectives.length)) * 100),
                        0,
                      );
                      return game.history.completedRuns.map((run, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between rounded border border-board-700 bg-board-950 px-3.5 py-2 text-xs"
                        >
                          <span className="font-mono text-silk-dim">
                            #{idx + 1} · {new Date(run.timestamp).toLocaleDateString()}
                          </span>
                          <span className="font-mono text-led-green">
                            Միավորներ՝ <strong>{run.totalScore}</strong>{" "}
                            <span className="text-silk-mute">/ {totalCampaignMaxScore}</span> · Խափանումներ՝{" "}
                            <strong>{run.glitchesDefeated}</strong>
                          </span>
                        </li>
                      ));
                    })()}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Confirmation Dialog */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Զրոյացնել ամենը"
          className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-board-950/85 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded border border-led-red bg-board-900 p-6 shadow-2xl">
            <p className="silk text-led-red">Զգուշացում · Անդառնալի գործողություն</p>
            <h2 className="mt-1 font-display text-xl font-bold text-silk">
              Զրոյացնե՞լ ամբողջ առաջընթացը և պատմությունը
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-silk-dim">
              Այս գործողությունը ամբողջությամբ կջնջի թե՛ ընթացիկ խաղի պահպանումը (<code>cli_game_active_save</code>), թե՛ բոլոր ժամանակների վիճակագրությունը (<code>cli_game_history</code>)։
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  playSfx("click");
                  setShowResetConfirm(false);
                }}
                className="rounded border border-board-500 bg-board-800 px-4 py-2 font-display text-sm font-semibold text-silk hover:border-silk-mute"
              >
                Չեղարկել
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  dispatch({ type: "hardReset" });
                }}
                className="rounded bg-led-red px-4 py-2 font-display text-sm font-bold text-board-950 hover:brightness-110"
              >
                Այո, զրոյացնել ամենը
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
