import { MAN_PAGES } from "../game/manPages";

export function ManPanel({ cmd, onClose }: { cmd: string; onClose: () => void }) {
  const page = MAN_PAGES[cmd];

  return (
    <aside
      aria-label={`Manual page for ${cmd}`}
      className="slide-up relative z-20 flex max-h-[56%] min-w-0 flex-none flex-col border-t border-led-cyan/50 bg-board-950/95 lg:max-h-none lg:w-[46%] lg:border-l lg:border-t-0"
    >
      <header className="flex items-center justify-between gap-3 border-b border-board-700 px-3.5 py-2">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="silk text-led-cyan">MAN(1) · Linux Programmer's Manual</span>
          <span className="truncate font-mono text-xs font-bold text-gold">{cmd.toUpperCase()}(1)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close manual panel"
          className="silk rounded border border-board-600 px-2 py-0.5 text-silk-dim hover:border-silk-mute hover:text-silk"
        >
          Close
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed text-silk-dim">
        {!page ? (
          <p className="text-led-red">No manual entry for {cmd}</p>
        ) : (
          <>
            <section>
              <h3 className="font-bold tracking-wider text-gold">NAME</h3>
              <p className="mt-0.5 pl-4 text-silk">{page.name}</p>
            </section>

            <section>
              <h3 className="font-bold tracking-wider text-gold">SYNOPSIS</h3>
              <p className="mt-0.5 pl-4 font-semibold text-led-cyan">{page.synopsis}</p>
            </section>

            <section>
              <h3 className="font-bold tracking-wider text-gold">DESCRIPTION</h3>
              <p className="mt-0.5 pl-4 font-sans text-[13px] leading-relaxed text-silk-dim">{page.description}</p>
            </section>

            {page.options && page.options.length > 0 && (
              <section>
                <h3 className="font-bold tracking-wider text-gold">OPTIONS</h3>
                <dl className="mt-1 space-y-2 pl-4">
                  {page.options.map((opt) => (
                    <div key={opt.flag}>
                      <dt className="font-bold text-led-cyan">{opt.flag}</dt>
                      <dd className="pl-4 font-sans text-[12.5px] text-silk-dim">{opt.desc}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {page.examples && page.examples.length > 0 && (
              <section>
                <h3 className="font-bold tracking-wider text-gold">EXAMPLES</h3>
                <div className="mt-1.5 space-y-2 pl-4">
                  {page.examples.map((ex, i) => (
                    <div key={i} className="rounded border border-board-700 bg-board-900/90 p-2">
                      <code className="block text-led-green">$ {ex.cmd}</code>
                      <p className="mt-0.5 font-sans text-[12px] text-silk-mute">{ex.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
