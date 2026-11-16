import { Dispatch, useEffect, useState } from "react";
import { BOSSES } from "../game/questions";
import type { Action, Game } from "../game/state";
import { cn } from "../utils/cn";
import { Rich } from "./Codex";
import { AvatarSprite, GlitchSprite, P } from "./Sprites";

const BOSS_QUESTION_SECONDS = 30;

export function GlitchBattle({ game, dispatch }: { game: Game; dispatch: Dispatch<Action> }) {
  const battle = game.battle;
  const [animState, setAnimState] = useState<"idle" | "laser" | "hurt">("idle");
  const [timeLeft, setTimeLeft] = useState<number>(BOSS_QUESTION_SECONDS);

  useEffect(() => {
    if (!battle?.lastResult) return;
    setAnimState(battle.lastResult === "hit" ? "laser" : "hurt");
    const t = setTimeout(() => setAnimState("idle"), 650);
    return () => clearTimeout(t);
  }, [battle?.qIdx, battle?.lastResult]);

  // Reset the 30-second timer whenever a new question appears in a Boss battle
  useEffect(() => {
    setTimeLeft(BOSS_QUESTION_SECONDS);
  }, [battle?.qIdx, battle?.targetPath]);

  // Tick down the 30-second timer during Boss battles
  useEffect(() => {
    if (!battle || !battle.glitchType.startsWith("boss-") || animState !== "idle") return;
    if (timeLeft <= 0) {
      dispatch({ type: "answerBattle", idx: -1 });
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [battle, animState, timeLeft, dispatch]);

  if (!battle) return null;

  const isBoss = battle.glitchType.startsWith("boss-");
  const bossMeta = isBoss ? BOSSES[battle.glitchType as keyof typeof BOSSES] : undefined;
  const q = battle.questions[battle.qIdx % battle.questions.length];

  const enemyTitle = bossMeta
    ? bossMeta.name
    : battle.glitchType === "nest"
      ? `Խափանումների Բույն (${battle.targetName})`
      : `Վիրուսային Խափանում (${battle.targetName})`;

  const enemySubtitle = bossMeta
    ? bossMeta.subtitle
    : battle.glitchType === "nest"
      ? "Վարակված directory · rm -r պաշտպանություն"
      : "Վնասված ֆայլ · rm պաշտպանություն";

  const hpPct = Math.max(0, Math.min(100, Math.round((battle.hp / battle.maxHp) * 100)));
  const playerAv = game.avatar.exists ? game.avatar : { exists: true, suit: "cadet", hat: "none", color: "cyan" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Մարտ վիրուսային խափանման դեմ"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-board-950/88 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border-2 border-glitch/80 bg-board-900 shadow-[0_0_50px_-10px_rgba(255,91,220,0.45)]">
        {/* Top Battle Banner */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-board-600 bg-board-950 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-block size-2.5 rounded-full bg-glitch led-on" style={{ color: P.glitch }} />
            <span className="silk text-glitch">
              {isBoss ? `ԱՐԱՐԻ ԲՈՍԻ ՄԱՐՏ · ACT ${bossMeta?.act ?? ""}` : "ԱՆՎՏԱՆԳՈՒԹՅԱՆ ՄԱՐՏԱԿԱՆ ՌԵԺԻՄ"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isBoss && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 font-mono text-xs font-bold transition",
                  timeLeft <= 10
                    ? "animate-pulse border-led-red bg-led-red/20 text-led-red"
                    : "border-gold/60 bg-gold/10 text-gold",
                )}
                title="Ժամանակաչափ յուրաքանչյուր հարցի համար (30 վայրկյան)"
              >
                <span>⏱</span>
                <span>{timeLeft} վրկ</span>
              </span>
            )}
            <span className="font-mono text-xs text-silk-mute">
              Թիրախ՝ <code className="text-gold">{battle.targetPath}</code>
            </span>
          </div>
        </header>

        {/* Pokémon-style Visual Arena */}
        <div className="pcb relative flex flex-col justify-between gap-4 border-b border-board-600 p-4 sm:p-5">
          {bossMeta && battle.qIdx === 0 && (
            <div className="rounded border border-glitch/40 bg-board-950/90 px-3 py-1.5 font-sans text-xs italic text-silk-dim">
              <strong className="not-italic text-glitch">{bossMeta.name}․</strong> «{bossMeta.introLine}»
            </div>
          )}

          <div className="grid grid-cols-2 items-center gap-4">
            {/* Left Side: Player Avatar & CPU Cores */}
            <div className="flex flex-col items-start gap-2 rounded border border-board-600 bg-board-950/85 p-3">
              <div className="flex w-full items-center justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold text-gold">
                    {playerAv.name ?? "Ճարտարապետ"}
                  </p>
                  <p className="font-mono text-[10px] text-silk-mute">
                    {[playerAv.suit ?? "cadet", playerAv.hat ?? "none", playerAv.color ?? "cyan"].join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1" title={`CPU միջուկներ՝ ${game.cores}/3`}>
                  {[0, 1, 2].map((i) => {
                    const alive = i < game.cores;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded border font-mono text-[10px] font-bold transition",
                          alive
                            ? "border-led-cyan bg-led-cyan/20 text-led-cyan"
                            : "border-led-red/50 bg-board-900 text-led-red/50 line-through",
                        )}
                      >
                        ⚡
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex h-28 w-full items-center justify-center">
                <svg
                  viewBox="-35 -58 70 68"
                  className={cn(
                    "h-28 w-28 transition-transform",
                    animState === "hurt" && "fx-shake",
                    animState === "laser" && "scale-105",
                  )}
                >
                  <AvatarSprite av={playerAv} />
                </svg>
              </div>
            </div>

            {/* Right Side: Glitch / Boss Sprite & HP Bar */}
            <div className="flex flex-col items-end gap-2 rounded border border-glitch/50 bg-board-950/85 p-3">
              <div className="w-full">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-display text-sm font-bold text-glitch">{enemyTitle}</p>
                  <span className="flex-none font-mono text-xs font-bold text-silk">
                    HP {battle.hp} / {battle.maxHp}
                  </span>
                </div>
                <p className="truncate font-mono text-[10px] text-silk-mute">{enemySubtitle}</p>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border border-board-600 bg-board-900">
                  <div
                    className="h-full bg-gradient-to-r from-glitch to-led-red transition-all duration-300"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>

              <div className="relative flex h-28 w-full items-center justify-center">
                <svg
                  viewBox="-36 -56 72 64"
                  className={cn(
                    "h-28 w-28 transition-transform",
                    animState === "laser" && "fx-shake brightness-150",
                    animState === "hurt" && "scale-110",
                  )}
                >
                  <GlitchSprite type={battle.glitchType} />
                </svg>
              </div>
            </div>
          </div>

          {/* Laser / Glitch Attack SVG Overlay Beam */}
          {animState !== "idle" && (
            <svg
              viewBox="0 0 400 80"
              className="pointer-events-none absolute inset-x-0 top-1/2 h-20 w-full -translate-y-1/2"
              aria-hidden
            >
              {animState === "laser" ? (
                <g>
                  <line
                    x1="90"
                    y1="40"
                    x2="310"
                    y2="40"
                    stroke={P.cyan}
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="fx-beam"
                  />
                  <circle cx="310" cy="40" r="18" fill={P.cyan} opacity="0.55" className="fx-ring" />
                </g>
              ) : (
                <g>
                  <polyline
                    points="310,40 250,22 200,55 150,25 90,40"
                    fill="none"
                    stroke={P.glitch}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="90" cy="40" r="18" fill={P.red} opacity="0.6" className="fx-ring" />
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Question & Mechanic Hint Area */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
          {q?.mechanicHint && (
            <div className="rounded border border-led-cyan/60 bg-board-950 px-3.5 py-2.5 font-mono text-xs text-led-cyan shadow-inner">
              <span className="silk mr-2 text-gold">ՍԿԱՆԵՐԻ ՏՎՅԱԼՆԵՐ ·</span>
              <span>{q.mechanicHint}</span>
            </div>
          )}

          <div className="rounded border border-board-600 bg-board-800/90 px-4 py-3">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="silk text-gold">
                Հարց #{battle.qIdx + 1} · Ընտրեք ճիշտ հրամանը՝ լազերային հարվածի համար
              </p>
              {isBoss && (
                <span
                  className={cn(
                    "font-mono text-xs font-bold",
                    timeLeft <= 10 ? "text-led-red" : "text-gold",
                  )}
                >
                  ⏱ {timeLeft} / {BOSS_QUESTION_SECONDS} վրկ
                </span>
              )}
            </div>
            {isBoss && (
              <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-board-950">
                <div
                  className={cn(
                    "h-full transition-all duration-1000 ease-linear",
                    timeLeft <= 10 ? "bg-led-red" : "bg-gold",
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / BOSS_QUESTION_SECONDS) * 100))}%` }}
                />
              </div>
            )}
            <p className="prose-codex text-[15px] font-medium leading-relaxed text-silk">
              {q ? <Rich text={q.prompt} /> : "Ընտրեք ճիշտ պատասխանը․"}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {(q?.options ?? []).map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => dispatch({ type: "answerBattle", idx })}
                className="group flex items-start gap-3 rounded border border-board-500 bg-board-950 px-3.5 py-3 text-left transition hover:border-gold hover:bg-board-800"
              >
                <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded border border-gold/60 bg-gold/10 font-mono text-xs font-bold text-gold group-hover:bg-gold group-hover:text-board-950">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="prose-codex text-sm leading-snug text-silk">
                  <Rich text={opt} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
