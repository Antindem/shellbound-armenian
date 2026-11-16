import { Dispatch, KeyboardEvent, useEffect, useRef, useState } from "react";
import { completions } from "../game/shell";
import type { Seg } from "../game/shell";
import type { Action, Game, TermLine } from "../game/state";
import { tilde } from "../game/vfs";

const SEG: Record<NonNullable<Seg["c"]>, string> = {
  dir: "font-semibold text-gold",
  link: "text-led-cyan",
  broken: "text-led-red underline decoration-wavy decoration-1 underline-offset-2",
  ino: "text-led-violet",
  dim: "text-silk-mute",
  hit: "rounded-sm bg-gold/20 font-semibold text-gold",
};

function shortPath(cwd: string) {
  const t = tilde(cwd);
  if (t.length <= 30) return t;
  const parts = t.split("/");
  return "…/" + parts.slice(-2).join("/");
}

function Prompt({ cwd }: { cwd: string }) {
  return (
    <span className="select-none whitespace-nowrap">
      <span className="hidden text-gold sm:inline">architect@kernel</span>
      <span className="hidden text-silk-mute sm:inline">:</span>
      <span className="text-led-cyan">{shortPath(cwd)}</span>
      <span className="text-silk-mute">$&nbsp;</span>
    </span>
  );
}

function Line({ l }: { l: TermLine }) {
  switch (l.kind) {
    case "in":
      return (
        <div className="break-all">
          <Prompt cwd={l.cwd ?? "~"} />
          <span className="text-silk">{l.text}</span>
        </div>
      );
    case "err":
      return <div className="whitespace-pre-wrap break-words text-led-red">{l.text}</div>;
    case "explain":
      return (
        <div className="my-1 max-w-[68ch] border-l-2 border-led-red/70 bg-led-red/[0.07] py-1.5 pl-2.5 pr-2 font-sans text-[13.5px] leading-snug text-silk-dim">
          <span className="silk mr-2 text-led-red">stderr-ը բացատրված է</span>
          {l.text}
        </div>
      );
    case "sys":
      return <div className="whitespace-pre-wrap break-words text-silk-mute">{"// " + l.text}</div>;
    case "ok":
      return <div className="font-medium text-led-green">{l.text}</div>;
    case "hint":
      return <div className="whitespace-pre-wrap break-words text-gold">{l.text}</div>;
    default:
      return (
        <div className="whitespace-pre-wrap break-words text-silk/90">
          {l.segs && l.segs.length
            ? l.segs.map((s, i) => (
                <span key={i} className={s.c ? SEG[s.c] : undefined}>
                  {s.t}
                </span>
              ))
            : l.text || "\u00a0"}
        </div>
      );
  }
}

export function Terminal({
  game,
  dispatch,
  onOpenCodex,
}: {
  game: Game;
  dispatch: Dispatch<Action>;
  onOpenCodex: () => void;
}) {
  const [val, setVal] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const locked = game.phase === "briefing";

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [game.lines, locked]);

  useEffect(() => {
    if (!locked && !window.matchMedia("(pointer: coarse)").matches) input.current?.focus();
  }, [locked, game.mi]);

  const submit = () => {
    dispatch({ type: "run", raw: val });
    if (val.trim()) setHist((h) => [...h, val]);
    setVal("");
    setHi(null);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!hist.length) return;
      const i = hi == null ? hist.length - 1 : Math.max(0, hi - 1);
      setHi(i);
      setVal(hist[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hi == null) return;
      if (hi + 1 >= hist.length) {
        setHi(null);
        setVal("");
      } else {
        setHi(hi + 1);
        setVal(hist[hi + 1]);
      }
    } else if (e.key === "Tab" && val.trim()) {
      // Only capture Tab while a command is being typed, so keyboard users can still tab away.
      e.preventDefault();
      const c = completions(val, game.fs, game.cwd);
      setVal(c.value);
      if (c.options.length > 1) dispatch({ type: "note", text: c.options.join("   ") });
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      dispatch({ type: "run", raw: "clear" });
    } else if (e.ctrlKey && e.key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
      e.preventDefault();
      setVal("");
      setHi(null);
    }
  };

  return (
    <section
      className="crt group relative flex min-h-0 min-w-0 flex-1 flex-col border-t border-board-600"
      aria-label="Terminal"
      onClick={() => {
        if (!window.getSelection()?.toString()) input.current?.focus();
      }}
    >
      <header className="flex flex-none items-center justify-between gap-3 border-b border-board-700 px-3 py-1.5">
        <span className="silk flex flex-none items-center gap-2 whitespace-nowrap text-silk-mute">
          <span
            aria-hidden
            className={`inline-block size-1.5 rounded-full ${locked ? "bg-led-red" : "bg-board-500 group-focus-within:bg-led-green"}`}
          />
          U3 · Terminal
        </span>
        <span className="silk hidden min-w-0 truncate text-silk-mute lg:inline">Tab-ը լրացնում է · ↑-ը կանչում է նախորդը · help · hint · reset</span>
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[13.5px] leading-[1.55]"
        role="log"
        aria-live="polite"
        aria-label="Terminal-ի ելք"
      >
        {game.lines.map((l) => (
          <Line key={l.id} l={l} />
        ))}

        {locked ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded border border-dashed border-board-500 bg-board-900/70 px-3 py-2.5 font-sans text-sm text-silk-dim">
            <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden className="flex-none text-gold">
              <rect x="1" y="7" width="12" height="8" rx="1.5" fill="currentColor" />
              <path d="M3.5 7V4.5a3.5 3.5 0 017 0V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <span>Terminal-ն ապակողպվում է հրահանգավորումը կարդալուց հետո։</span>
            <button
              type="button"
              onClick={onOpenCodex}
              className="rounded border border-gold/60 px-2 py-0.5 text-gold hover:bg-gold/10 md:hidden"
            >
              Բացել Codex-ը
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "unlock" })}
              className="text-silk-mute underline decoration-board-500 underline-offset-4 hover:text-silk"
            >
              Բաց թողնել հրահանգավորումը
            </button>
          </div>
        ) : (
          <div className="flex items-baseline">
            <Prompt cwd={game.cwd} />
            <input
              ref={input}
              value={val}
              onChange={(e) => {
                setVal(e.target.value);
                setHi(null);
              }}
              onKeyDown={onKey}
              aria-label="Command line։ Մուտքագրեք Bash command և սեղմեք Enter։"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="send"
              placeholder={hist.length === 0 ? "մուտքագրեք command, ապա սեղմեք Enter" : ""}
              className="min-w-0 flex-1 bg-transparent text-silk caret-gold outline-none placeholder:text-silk-mute/70"
            />
          </div>
        )}
      </div>
    </section>
  );
}
