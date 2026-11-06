import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player } from "../engine/player";
import { BEAT_LEN, EP_LEN, mmss } from "../engine/util";
import { EPISODES, cuesFor, type EpisodeData } from "../story/episodes";

const POSTER: Record<string, number> = { ep1: 4.9, ep2: 55 };

export default function Screening() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [epIdx, setEpIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [narr, setNarr] = useState(true);
  const [snd, setSnd] = useState(true);
  const [caps, setCaps] = useState(true);
  const [started, setStarted] = useState(false);
  const ep: EpisodeData = EPISODES[epIdx];

  useEffect(() => {
    const p = new Player(canvasRef.current!, EPISODES[0]);
    playerRef.current = p;
    p.onTick = setT;
    p.onState = setPlaying;
    p.render(POSTER.ep1);
    return () => {
      p.destroy();
      playerRef.current = null;
    };
  }, []);

  const pickEpisode = (i: number) => {
    const p = playerRef.current;
    if (!p) return;
    setEpIdx(i);
    setStarted(false);
    p.setEpisode(EPISODES[i]);
    p.render(POSTER[EPISODES[i].id]);
  };

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    setStarted(true);
    if (p.playing) p.pause();
    else void p.play();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const seek = (v: number) => {
    setStarted(true);
    playerRef.current?.seek(v);
  };

  const beat = Math.min(4, Math.floor(t / BEAT_LEN));
  const inEnd = t >= BEAT_LEN * 5;
  const lt = t - beat * BEAT_LEN;
  const cues = useMemo(() => cuesFor(ep, beat), [ep, beat]);
  const active = !inEnd ? cues.find((c) => lt >= c.start && lt <= c.end + 0.9) : undefined;

  const fullscreen = () => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {EPISODES.map((e, i) => (
          <button
            key={e.id}
            onClick={() => pickEpisode(i)}
            className={`group flex items-center gap-3 rounded-full border px-4 py-2 text-left transition ${
              i === epIdx ? "border-[#d23a2a] bg-[#d23a2a]/15 text-[#f7f0de]" : "border-white/10 text-[#cdbfe0] hover:border-white/30"
            }`}
          >
            <span className="font-mono text-xs tracking-widest text-[#ff8a7a]">EP {e.number}</span>
            <span className="font-serif text-lg">{e.title}</span>
          </button>
        ))}
        <span className="ml-auto font-mono text-xs uppercase tracking-widest text-[#b9a2d8]">4:00 · single narrator · generated in-browser</span>
      </div>

      <div ref={boxRef} className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-30px_rgba(120,60,200,0.5)]">
        <canvas ref={canvasRef} className="block aspect-video w-full cursor-pointer" onClick={toggle} />
        {!started && !playing && (
          <button onClick={toggle} className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-black/70 via-black/20 to-black/30 text-[#f7f0de]">
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#f7f0de] bg-black/30 backdrop-blur transition group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-[#e6d8f2]">Episode {ep.number}</span>
            <span className="font-serif text-4xl">{ep.title}</span>
            <span className="max-w-xl px-6 text-center text-sm text-[#d9cbe8]/80">{ep.tagline}</span>
          </button>
        )}
        {caps && active && (
          <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6">
            <p className="max-w-3xl rounded-md bg-[#12081c]/80 px-5 py-2.5 text-center font-serif text-lg leading-snug text-[#f7f0de] backdrop-blur-sm md:text-2xl">{active.text}</p>
          </div>
        )}
        {/* controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-8 text-[#f7f0de]">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f0de] text-black">
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="w-24 font-mono text-xs tabular-nums">
            {mmss(t)} / {mmss(EP_LEN)}
          </span>
          <div className="relative flex-1">
            <input type="range" min={0} max={EP_LEN} step={0.1} value={t} onChange={(e) => seek(parseFloat(e.target.value))} className="h-1.5 w-full cursor-pointer accent-[#d23a2a]" aria-label="Timeline" />
            {[1, 2, 3, 4, 5].map((k) => (
              <span key={k} className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/50" style={{ left: `${((k * BEAT_LEN) / EP_LEN) * 100}%` }} />
            ))}
          </div>
          <Toggle on={narr} label="VO" title="Orrin's narration (browser voice)" onClick={() => { setNarr(!narr); playerRef.current?.setSettings({ narration: !narr }); }} />
          <Toggle on={snd} label="SND" title="Score & sound design" onClick={() => { setSnd(!snd); playerRef.current?.setSettings({ sound: !snd }); }} />
          <Toggle on={caps} label="CC" title="Captions" onClick={() => setCaps(!caps)} />
          <button onClick={fullscreen} aria-label="Fullscreen" className="rounded p-1.5 hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* chapters */}
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">
        {ep.beats.map((b, i) => (
          <button
            key={i}
            onClick={() => seek(i * BEAT_LEN)}
            className={`rounded-lg border p-3 text-left transition ${!inEnd && beat === i ? "border-[#d23a2a] bg-[#d23a2a]/10" : "border-white/10 hover:border-white/30"}`}
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#ff8a7a]">Beat {i + 1}</div>
            <div className="font-mono text-xs text-[#b9a2d8]">{b.window}</div>
            <div className="mt-1 line-clamp-2 text-xs text-[#d9cbe8]/80">{b.vo.split(".")[0]}.</div>
          </button>
        ))}
        <button onClick={() => seek(BEAT_LEN * 5)} className={`rounded-lg border p-3 text-left transition ${inEnd ? "border-[#d23a2a] bg-[#d23a2a]/10" : "border-white/10 hover:border-white/30"}`}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#ff8a7a]">End card</div>
          <div className="font-mono text-xs text-[#b9a2d8]">03:45–04:00</div>
          <div className="mt-1 text-xs text-[#d9cbe8]/80">{ep.endCard}</div>
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff8a7a]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#d23a2a]" /> Recorder transcript · Beat {inEnd ? "—" : beat + 1}
          </div>
          <p className="font-serif text-lg leading-relaxed text-[#f1e9d6]">
            {inEnd
              ? "End card. No extra whispered voice. Orrin is silent."
              : cues.map((c, i) => (
                  <span key={i} className={active === c ? "bg-[#d23a2a]/30 text-white" : "text-[#cdbfe0]/80"}>
                    {c.text}{" "}
                  </span>
                ))}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-[#d9cbe8]/85">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#b9a2d8]">About this episode</div>
          <p className="mb-3">{ep.logline}</p>
          <dl className="space-y-1.5">
            <div><dt className="inline font-mono text-xs text-[#ff8a7a]">OBJECTIVE · </dt><dd className="inline">{ep.objective}</dd></div>
            <div><dt className="inline font-mono text-xs text-[#ff8a7a]">CHANGE · </dt><dd className="inline">{ep.change}</dd></div>
            <div><dt className="inline font-mono text-xs text-[#ff8a7a]">CLOCK · </dt><dd className="inline">{ep.clockLabel}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-[#b9a2d8]">
            Picture is drawn live on canvas; the score and effects are synthesised with Web Audio. Narration uses your browser’s voice (a male English voice is chosen when available) — for the final cut, cast one human voice for Orrin.
          </p>
        </div>
      </div>
    </section>
  );
}

function Toggle({ on, label, title, onClick }: { on: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className={`rounded px-2 py-1 font-mono text-[11px] font-bold tracking-wider transition ${on ? "bg-[#f7f0de] text-black" : "bg-white/10 text-white/60"}`}>
      {label}
    </button>
  );
}
