import { useState } from "react";
import { EPISODES, cuesFor } from "../story/episodes";
import { mmss } from "../engine/util";

export default function Episodes() {
  const [ei, setEi] = useState(0);
  const ep = EPISODES[ei];
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8">
      <header className="max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#ff8a7a]">Episode scripts & shot lists</div>
        <h2 className="mt-2 font-serif text-5xl text-[#f7f0de]">Episodes 1 & 2</h2>
        <p className="mt-3 text-[#d9cbe8]/85">
          Each episode is five 45-second beats plus a 15-second end card. Only the VO is spoken; picture/sound directions are never narrated. The caption cue times below are the ones the player uses, so every cut is keyed to a spoken line.
        </p>
      </header>
      <div className="mt-6 flex gap-2">
        {EPISODES.map((e, i) => (
          <button key={e.id} onClick={() => setEi(i)} className={`rounded-full border px-4 py-2 text-sm ${i === ei ? "border-[#d23a2a] bg-[#d23a2a]/15 text-white" : "border-white/10 text-[#cdbfe0] hover:border-white/30"}`}>
            Ep {e.number} · {e.title}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-serif text-3xl text-[#f7f0de]">“{ep.title}”</h3>
        <p className="mt-2 text-[#e4d9ef]/90">{ep.logline}</p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Fact k="Local objective" v={ep.objective} />
          <Fact k="Change" v={ep.change} />
          <Fact k="Clock" v={ep.clockLabel} />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {ep.beats.map((b, i) => {
          const cues = cuesFor(ep, i);
          return (
            <article key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-[#ff8a7a]">Beat {i + 1}</span>
                <span className="font-mono text-sm text-[#b9a2d8]">{b.window}</span>
              </div>
              <h4 className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#f3c22f]">Picture / sound (from the bible)</h4>
              <p className="mt-1 text-[15px] leading-relaxed text-[#e4d9ef]/90">{b.picture}</p>

              <h4 className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-[#f3c22f]">Narration — spoken by Orrin</h4>
              <p className="mt-1 border-l-2 border-[#d23a2a] pl-4 font-serif text-xl leading-relaxed text-[#f7f0de]">{b.vo}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cues.map((c, k) => (
                  <span key={k} className="rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-[#b9a2d8]">
                    {mmss(i * 45 + c.start)}.{String(Math.floor(((c.start % 1) * 10))).padStart(1, "0")} · s{k + 1}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#f3c22f]">Shot list as built</h4>
                  <ul className="mt-2 space-y-2">
                    {b.shots.map((s, k) => (
                      <li key={k} className="text-sm leading-relaxed text-[#d9cbe8]/85">{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#f3c22f]">Sound design</h4>
                  <ul className="mt-2 space-y-2">
                    {b.sound.map((s, k) => (
                      <li key={k} className="flex gap-2 text-sm leading-relaxed text-[#d9cbe8]/85">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#b9a2d8]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-[#ff8a7a]">End card · 03:45–04:00</div>
          <p className="mt-2 text-[#e4d9ef]/90">{ep.endCard} Next: “{ep.nextTitle}”.</p>
        </article>
        <article className="rounded-2xl border border-[#f3c22f]/30 bg-[#f3c22f]/5 p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-[#f3c22f]">Continuity checks for this episode</div>
          <ul className="mt-3 space-y-2">
            {ep.continuity.map((c, i) => (
              <li key={i} className="text-sm text-[#e4d9ef]/90">• {c}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#ff8a7a]">{k}</div>
      <div className="mt-1 text-[#e4d9ef]/90">{v}</div>
    </div>
  );
}
