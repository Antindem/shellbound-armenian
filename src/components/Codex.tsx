import { Dispatch, ReactNode, useEffect, useRef, useState } from "react";
import { ACTS, MISSIONS, type InteractiveLabConfig } from "../game/missions";
import type { Action, Game } from "../game/state";
import { cn } from "../utils/cn";
import {
  Anatomy,
  HeadTailLab,
  InodeLab,
  InspectorLab,
  PermissionsLab,
  PipelineLab,
  TankLab,
  TreeNavLab,
  WildcardLab,
} from "./Diagrams";
import { AVATAR_COLORS, AvatarSprite, P } from "./Sprites";

const LAB_META: Record<InteractiveLabConfig["kind"], { label: string }> = {
  treenav: { label: "Սենյակներ · ls / cp / mv" },
  inspector: { label: "Դետեկտիվ · type / man" },
  inode: { label: "Հղումներ · Inode / ln" },
  tank: { label: "Ռեզերվուար · > / >>" },
  pipeline: { label: "Զտարան · Pipe | / grep" },
  headtail: { label: "Կտրվածք · head / tail" },
  wildcard: { label: "Դիմակներ · *, ?, [...]" },
  permissions: { label: "Անվտանգություն · chmod / sudo" },
};

/** Renders `backticked` spans as inline code. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((p, i) => (i % 2 ? <code key={i}>{p}</code> : <span key={i}>{p}</span>))}
    </>
  );
}

/** INIT, process 1: a small chip with a face. */
function InitFace() {
  const pins = [12, 20, 28];
  return (
    <svg width="46" height="46" viewBox="0 0 44 44" aria-hidden className="float flex-none">
      {pins.map((p) => (
        <g key={p} fill={P.gold}>
          <rect x={p} y={2} width={3} height={6} rx={1} />
          <rect x={p} y={36} width={3} height={6} rx={1} />
          <rect x={2} y={p} width={6} height={3} rx={1} />
          <rect x={36} y={p} width={6} height={3} rx={1} />
        </g>
      ))}
      <rect x={7} y={7} width={30} height={30} rx={5} fill={P.b600} stroke={P.gold} strokeWidth={1.4} />
      <circle cx={12} cy={12} r={1.6} fill={P.goldDim} />
      <rect x={13.5} y={17} width={5.5} height={7} rx={2.5} fill={P.green} className="caret" style={{ animationDuration: "4s" }} />
      <rect x={25} y={17} width={5.5} height={7} rx={2.5} fill={P.green} className="caret" style={{ animationDuration: "4s" }} />
      <path d="M17,29 q5,3.5 10,0" fill="none" stroke={P.silk} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function Check({ state }: { state: "done" | "current" | "todo" | "fail" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex size-5 flex-none items-center justify-center rounded-sm border",
        state === "done" && "border-led-green bg-led-green text-board-950",
        state === "current" && "border-gold text-gold",
        state === "todo" && "border-board-500 text-transparent",
        state === "fail" && "border-led-red bg-led-red text-board-950",
      )}
    >
      {state === "done" && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 6.5l2.8 2.8L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      {state === "current" && <span className="caret size-1.5 rounded-full bg-gold" />}
      {state === "fail" && <span className="text-xs font-bold leading-none">!</span>}
    </span>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="silk flex items-center gap-2 text-gold">
      <span aria-hidden className="h-px w-3 bg-gold" />
      {children}
    </h2>
  );
}

const SUIT_OPTIONS = [
  { id: "cadet", label: "Կադետի համազգեստ" },
  { id: "spacesuit", label: "Տիեզերական սկաֆանդր" },
  { id: "hoodie", label: "Հաքերային հուդի" },
  { id: "armor", label: "Կիբեր զրահ" },
];

const HAT_OPTIONS = [
  { id: "none", label: "Առանց գլխարկի" },
  { id: "astro", label: "Աստրո սաղավարտ" },
  { id: "wizard", label: "Կախարդի գլխարկ" },
  { id: "visor", label: "Կիբեր վիզոր" },
  { id: "catears", label: "Կատվի ականջներ" },
  { id: "captain", label: "Կապիտանի գլխարկ" },
];

const COLOR_OPTIONS = [
  "cyan",
  "teal",
  "gold",
  "yellow",
  "magenta",
  "pink",
  "lime",
  "green",
  "violet",
  "purple",
  "orange",
  "red",
  "blue",
  "white",
];

function AvatarGearReference({ game }: { game: Game }) {
  const [previewSuit, setPreviewSuit] = useState(game.avatar.suit ?? game.avatar.cls ?? "cadet");
  const [previewHat, setPreviewHat] = useState(game.avatar.hat ?? "astro");
  const [previewColor, setPreviewColor] = useState(game.avatar.color ?? "cyan");

  useEffect(() => {
    if (game.avatar.suit || game.avatar.cls) setPreviewSuit((game.avatar.suit ?? game.avatar.cls ?? "cadet").toLowerCase());
    if (game.avatar.hat) setPreviewHat(game.avatar.hat.toLowerCase());
    if (game.avatar.color) setPreviewColor(game.avatar.color.toLowerCase());
  }, [game.avatar]);

  return (
    <section className="rounded border border-gold/50 bg-board-800/90 p-3.5">
      <div className="flex items-center justify-between border-b border-board-600 pb-2">
        <span className="silk text-gold">Հանդերձանքի կատալոգ · avatar.cfg</span>
        <span className="font-mono text-[11px] text-led-cyan">Ինտերակտիվ նախադիտում</span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center justify-center rounded border border-board-600 bg-board-950 px-4 py-3">
          <svg width="78" height="88" viewBox="-30 -58 60 66" aria-label="Կերպարի նախադիտում">
            <AvatarSprite
              av={{
                exists: true,
                suit: previewSuit,
                cls: previewSuit,
                hat: previewHat,
                color: previewColor,
                name: game.avatar.name ?? "architect",
              }}
            />
          </svg>
          <span className="mt-1 font-mono text-[11px] text-gold">
            {previewSuit} · {previewHat} · {previewColor}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 text-xs">
          <div>
            <p className="font-mono text-[11px] text-silk-mute">
              1. Հագուստ (<code>Suit=...</code>)՝
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SUIT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPreviewSuit(s.id)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[11px] transition",
                    previewSuit === s.id
                      ? "border-gold bg-gold/20 text-gold"
                      : "border-board-600 bg-board-950 text-silk-dim hover:border-silk-mute",
                  )}
                  title={s.label}
                >
                  {s.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] text-silk-mute">
              2. Գլխարկ (<code>Hat=...</code>)՝
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {HAT_OPTIONS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setPreviewHat(h.id)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[11px] transition",
                    previewHat === h.id
                      ? "border-led-cyan bg-led-cyan/20 text-led-cyan"
                      : "border-board-600 bg-board-950 text-silk-dim hover:border-silk-mute",
                  )}
                  title={h.label}
                >
                  {h.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] text-silk-mute">
              3. Գույն (<code>Color=...</code>)՝
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPreviewColor(c)}
                  className={cn(
                    "flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10.5px] transition",
                    previewColor === c
                      ? "border-gold bg-board-900 text-silk"
                      : "border-board-600 bg-board-950 text-silk-dim hover:border-silk-mute",
                  )}
                >
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: AVATAR_COLORS[c] ?? c }}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Codex({ game, dispatch, onUnlock }: { game: Game; dispatch: Dispatch<Action>; onUnlock: () => void }) {
  const m = MISSIONS[game.mi];
  const act = ACTS[m.act] ?? { tag: `Արար ${m.act}`, title: "" };
  const [tab, setTab] = useState<"brief" | "obj">(game.phase === "briefing" ? "brief" : "obj");
  const [labIdx, setLabIdx] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const labs: InteractiveLabConfig[] =
    m.labs ??
    (m.diagram.kind === "inode"
      ? [{ kind: "inode" }]
      : m.diagram.kind === "tank"
        ? [{ kind: "tank" }]
        : []);
  const activeCfg = labs.length > 0 ? labs[Math.min(labIdx, labs.length - 1)] : null;
  const showAnatomy = !m.hideAnatomy && m.diagram.kind === "anatomy";
  const showLabSection = labs.length > 0 || showAnatomy;

  useEffect(() => setTab(game.phase === "briefing" ? "brief" : "obj"), [game.phase, game.mi]);
  useEffect(() => {
    setLabIdx(0);
  }, [game.mi]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [tab, game.mi]);

  const total = m.objectives.length;
  const doneN = game.done.filter(Boolean).length;
  const nextIdx = game.done.findIndex((d) => !d);
  const complete = game.phase === "complete";
  const last = game.mi >= MISSIONS.length - 1;
  const nextMission = MISSIONS[Math.min(game.mi + 1, MISSIONS.length - 1)];
  const finale = m.boss === "boss-5";
  const levelScore = game.activeSave.levelScores[m.id];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-board-900" aria-label="Codex">
      <header className="flex-none border-b border-board-600 px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="silk text-silk-mute">U1 · Codex</span>
          <span className="silk text-silk-mute">
            Առաքելություն {String(game.mi + 1).padStart(2, "0")} / {MISSIONS.length}
          </span>
        </div>
        <p className="silk mt-2.5 text-gold">
          {act.tag} · {act.title}
        </p>
        <h1 className="mt-0.5 font-display text-[1.5rem] font-bold leading-tight tracking-wide text-silk">{m.title}</h1>
        <div className="mt-3 flex gap-5" role="tablist" aria-label="Codex-ի բաժիններ">
          {(
            [
              ["brief", "Հրահանգավորում"],
              ["obj", total ? `Նպատակներ ${doneN}/${total}` : "Նպատակներ"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px border-b-2 pb-2 font-display text-sm font-semibold tracking-wide transition-colors",
                tab === id ? "border-gold text-gold" : "border-transparent text-silk-mute hover:text-silk",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div ref={scroller} className="prose-codex min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {tab === "brief" ? (
          <div className="min-w-0 space-y-6 p-4">
            {/* Phase 1: the transmission */}
            <section className="min-w-0 rounded border border-board-600 bg-board-800">
              <div className="flex items-center gap-3 border-b border-board-600 px-3 py-2">
                <InitFace />
                <div className="min-w-0">
                  <p className="silk text-led-green">Մուտքային հաղորդագրություն</p>
                  <p className="font-display text-base font-semibold tracking-wide text-silk">
                    INIT <span className="ml-1 font-mono text-xs font-normal text-silk-mute">PID 1 · համակարգային ուղեկցորդ</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 px-3.5 py-3 text-[15px] leading-relaxed text-silk-dim">
                {m.story.map((p, i) => (
                  <p key={i}>
                    <Rich text={p} />
                  </p>
                ))}
              </div>
            </section>

            {m.act === 0 && <AvatarGearReference game={game} />}

            <section>
              <H2>Նոր գործիքներ</H2>
              <dl className="mt-2 divide-y divide-board-700 border-y border-board-700">
                {m.concepts.map((c) => (
                  <div key={c.term} className="grid grid-cols-[6.75rem_minmax(0,1fr)] gap-3 py-2.5">
                    <dt className="break-words font-mono text-[13px] font-medium leading-snug text-gold">{c.term}</dt>
                    <dd className="text-sm leading-snug text-silk-dim">
                      <Rich text={c.text} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {showLabSection && (
              <section>
                <H2>Կապոտի տակ · Ինտերակտիվ լաբորատորիա</H2>
                {labs.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Ինտերակտիվ սիմուլյատորներ">
                    {labs.map((cfg, idx) => (
                      <button
                        key={`${cfg.kind}-${idx}`}
                        type="button"
                        role="tab"
                        aria-selected={idx === Math.min(labIdx, labs.length - 1)}
                        onClick={() => setLabIdx(idx)}
                        className={cn(
                          "rounded border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                          idx === Math.min(labIdx, labs.length - 1)
                            ? "border-gold bg-gold/20 text-gold"
                            : "border-board-600 bg-board-950 text-silk-dim hover:border-silk-mute hover:text-silk",
                        )}
                      >
                        {LAB_META[cfg.kind].label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 space-y-4">
                  {activeCfg?.kind === "inode" && <InodeLab key={`${m.id}-inode`} />}
                  {activeCfg?.kind === "tank" && <TankLab key={`${m.id}-tank`} />}
                  {activeCfg?.kind === "headtail" && <HeadTailLab key={`${m.id}-headtail`} />}
                  {activeCfg?.kind === "wildcard" && <WildcardLab key={`${m.id}-wildcard`} />}
                  {activeCfg?.kind === "permissions" && (
                    <PermissionsLab
                      key={`${m.id}-permissions`}
                      showUmask={activeCfg.showUmask}
                      showChown={activeCfg.showChown}
                      showSudo={activeCfg.showSudo}
                    />
                  )}
                  {activeCfg?.kind === "pipeline" && (
                    <PipelineLab key={`${m.id}-pipeline`} stages={activeCfg.stages} />
                  )}
                  {activeCfg?.kind === "inspector" && <InspectorLab key={`${m.id}-inspector`} />}
                  {activeCfg?.kind === "treenav" && <TreeNavLab key={`${m.id}-treenav`} />}

                  {showAnatomy && m.diagram.kind === "anatomy" && (
                    <div>
                      <p className="silk mb-1.5 text-silk-mute">Հրամանի կառուցվածքը (Command Anatomy)</p>
                      <Anatomy key={m.id} variants={m.diagram.variants} />
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {complete && (
              <section className="fade-in rounded border border-led-green/50 bg-led-green/[0.07] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="silk text-led-green">Ամփոփում</p>
                  {levelScore && (
                    <span className="rounded border border-gold/60 bg-gold/15 px-2.5 py-0.5 font-mono text-xs font-bold text-gold">
                      Միավորներ՝ {levelScore.score} / {levelScore.maxScore}
                    </span>
                  )}
                </div>
                <h2 className="mt-0.5 font-display text-xl font-bold tracking-wide text-silk">
                  {finale ? "Mainframe-ը վերականգնված է" : "Սեկտորը վերականգնված է"}
                </h2>
                {finale && (
                  <p className="mt-1.5 text-sm leading-snug text-silk-dim">
                    Ռեակտորն աշխատում է մաքուր էներգիայով։ Այս համակարգի յուրաքանչյուր սենյակ, link և pipeline գոյություն ունի, որովհետև դուք եք այն մուտքագրել։
                  </p>
                )}
                <ul className="mt-2.5 space-y-1.5 text-sm leading-snug text-silk-dim">
                  {m.recap.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-[0.45em] size-1.5 flex-none bg-led-green" />
                      <span>
                        <Rich text={r} />
                      </span>
                    </li>
                  ))}
                </ul>
                {!last && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "next" })}
                    className="mt-3.5 w-full rounded bg-led-green px-3 py-2.5 font-display text-sm font-bold tracking-wide text-board-950 hover:brightness-110"
                  >
                    {finale ? "Անցնել ազատ ռեժիմի" : `Հաջորդ առաքելությունը՝ ${nextMission.title}`}
                  </button>
                )}
              </section>
            )}

            {m.act === 0 && <AvatarGearReference game={game} />}

            {game.phase === "briefing" && total > 0 && (
              <p className="rounded border border-dashed border-board-500 px-3 py-2 text-sm text-silk-mute">
                Սպասվող առաջադրանքների նախադիտում։ Սկսելու համար ապակողպեք terminal-ը։
              </p>
            )}

            {total === 0 ? (
              <div className="space-y-3 text-[15px] leading-relaxed text-silk-dim">
                <p>Նպատակներ չկան։ Ամբողջ mainframe-ը ձեր sandbox-ն է։</p>
                <p className="text-sm text-silk-mute">
                  Գաղափարներ՝ կառուցեք բազա <code>mkdir -p</code>-ով, ստեղծեք file-ի hard link և հետևեք ընդհանուր միջուկին, կոտրեք պորտալը <code>mv</code>-ով կամ փորձարկեք <code>chmod</code>, <code>sudo</code> և <code>man</code> հրամանները։
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-1" aria-hidden>
                  {game.done.map((d, i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", d ? "bg-led-green" : "bg-board-600")} />
                  ))}
                </div>
                <ol className="space-y-2">
                  {m.objectives.map((o, i) => {
                    const d = game.done[i];
                    const current = !d && i === nextIdx && game.phase === "active";
                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex gap-3 rounded border px-3 py-2.5 transition-colors",
                          d ? "border-led-green/25 bg-led-green/[0.05]" : current ? "border-gold/60 bg-board-800" : "border-board-700",
                        )}
                      >
                        <Check state={d ? "done" : current ? "current" : "todo"} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[14.5px] leading-snug", d ? "text-silk-mute" : "text-silk")}>
                            <span className="sr-only">{d ? "Ավարտված՝ " : current ? "Ընթացիկ՝ " : ""}</span>
                            <Rich text={o.text} />
                          </p>
                          {game.hinted[i] && !d && (
                            <p className="mt-1.5 break-all rounded-sm border border-gold/30 bg-board-950 px-2 py-1 font-mono text-[12.5px] text-gold">
                              <span className="select-none text-silk-mute">$ </span>
                              {o.hint}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {(m.guards ?? []).map((g, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3 rounded border px-3 py-2.5 text-sm leading-snug",
                      game.guards[i] ? "border-board-600 text-silk-dim" : "border-led-red/60 bg-led-red/[0.08] text-silk",
                    )}
                  >
                    {game.guards[i] ? (
                      <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden className="mt-0.5 flex-none text-led-cyan">
                        <path d="M9 1.5l7 2.6v5.4c0 4.3-3 7.4-7 9-4-1.6-7-4.7-7-9V4.1z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    ) : (
                      <Check state="fail" />
                    )}
                    <p>
                      <span className="silk mr-2 text-led-cyan">Պաշտպանել</span>
                      <Rich text={g.text} />
                      {!game.guards[i] && (
                        <span className="mt-1 block text-led-red">
                          Ոչնչացված է։ <code>rm</code>-ը հետադարձ չունի։ Սեղմեք «Կրկին փորձել»՝ այս առաքելությունը վերականգնելու համար։
                        </span>
                      )}
                    </p>
                  </div>
                ))}

                {game.phase === "active" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "hint" })}
                      disabled={nextIdx < 0 || game.hinted[nextIdx]}
                      className="rounded border border-gold/60 px-3 py-1.5 font-display text-sm font-semibold tracking-wide text-gold hover:bg-gold/10 disabled:border-board-600 disabled:text-silk-mute"
                    >
                      {nextIdx >= 0 && game.hinted[nextIdx] ? "Հուշումը ցուցադրված է" : "Ցույց տալ հուշում (-100 միավոր)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "retryLevel" })}
                      className="rounded border border-board-500 px-3 py-1.5 font-display text-sm font-semibold tracking-wide text-silk-dim hover:border-silk-mute hover:text-silk"
                    >
                      Վերականգնել աշխարհը
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Phase gate */}
      <footer className="flex-none border-t border-board-600 bg-board-900 p-3">
        {game.phase === "briefing" ? (
          <button
            type="button"
            onClick={onUnlock}
            className="flex w-full items-center justify-center gap-2.5 rounded bg-gold px-4 py-3 font-display text-[15px] font-bold tracking-wide text-board-950 shadow-[0_0_0_1px_rgba(237,189,79,.4),0_6px_24px_-8px_rgba(237,189,79,.6)] transition hover:brightness-110"
          >
            <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden>
              <rect x="1" y="7" width="12" height="8" rx="1.5" fill="currentColor" />
              <path d="M3.5 7V4.5a3.5 3.5 0 016.6-1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Հրահանգավորումը կարդացված է։ Ապակողպել terminal-ը
          </button>
        ) : tab === "brief" ? (
          <button
            type="button"
            onClick={() => setTab("obj")}
            className="w-full rounded border border-gold/60 px-4 py-2.5 font-display text-sm font-semibold tracking-wide text-gold hover:bg-gold/10"
          >
            Վերադառնալ նպատակներին
          </button>
        ) : (
          <p className="text-center text-xs text-silk-mute">
            {total === 0
              ? "Մուտքագրեք reset terminal-ում, երբ ցանկանաք մաքուր աշխարհ։"
              : complete
                ? "Terminal-ը մնում է բաց։ Շարունակեք փորձարկել, եթե ցանկանում եք։"
                : "Չե՞ք կողմնորոշվում։ Վերաբացեք «Հրահանգավորում» ներդիրը կամ terminal-ում մուտքագրեք hint։"}
          </p>
        )}
      </footer>
    </section>
  );
}
