import { useCallback, useEffect, useRef, useState } from "react";
import { Stage } from "../engine/stage";
import { Director } from "../engine/director";
import { SCENES, SPEAKER_COLOR, TOTAL, fmt, sceneAt } from "../story/script";
import { activeLine } from "../story/timeline";

type IcoName = "play" | "pause" | "music" | "voice" | "cc" | "full" | "replay";
const PATHS: Record<IcoName, React.ReactNode> = {
  play: <polygon points="6 4 20 12 6 20" fill="currentColor" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  voice: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  cc: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
    </>
  ),
  full: <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />,
  replay: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
};
function Ico({ n, className = "h-5 w-5" }: { n: IcoName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[n]}
    </svg>
  );
}

export default function Player() {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const dir = useRef<Director | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState({ t: 0, playing: false, idle: true, ended: false });
  const [voice, setVoice] = useState(true);
  const [music, setMusic] = useState(true);
  const [subs, setSubs] = useState(true);
  const [webgl, setWebgl] = useState(true);
  const [hover, setHover] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);

  useEffect(() => {
    if (!host.current) return;
    let stage: Stage;
    try {
      stage = new Stage(host.current);
    } catch (e) {
      console.error(e);
      setWebgl(false);
      return;
    }
    const d = new Director(stage);
    dir.current = d;
    d.onUpdate = (t, playing, idle, ended) => setUi({ t, playing, idle, ended });
    (window as unknown as { __d: Director }).__d = d;
    const ro = new ResizeObserver(() => stage.resize());
    ro.observe(host.current);
    const onSeek = (e: Event) => {
      const t = (e as CustomEvent<number>).detail;
      d.seek(t);
      d.play();
    };
    window.addEventListener("gerald-seek", onSeek);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space" && wrap.current && wrap.current.matches(":hover, :focus-within")) {
        e.preventDefault();
        d.toggle();
      } else if (e.code === "ArrowRight" && !d.idle) d.seek(d.t + 5);
      else if (e.code === "ArrowLeft" && !d.idle) d.seek(d.t - 5);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("gerald-seek", onSeek);
      window.removeEventListener("keydown", onKey);
      ro.disconnect();
      d.dispose();
      stage.dispose();
      dir.current = null;
    };
  }, []);

  const t = scrub ?? ui.t;
  const scene = sceneAt(ui.idle ? 0 : t);
  const st = t - scene.start;
  const al = !ui.idle ? activeLine(t, 0.45) : null;
  const card = scene.cards?.find((c) => st >= c.at && st < c.at + c.dur);

  const seekFromEvent = useCallback((e: React.PointerEvent) => {
    const r = bar.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return f * TOTAL;
  }, []);

  const fullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const showControls = hover || !ui.playing || scrub !== null;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div
        ref={wrap}
        tabIndex={0}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onTouchStart={() => setHover(true)}
        className="scan group relative isolate aspect-video max-h-[84vh] w-full overflow-hidden rounded-xl bg-black outline-none ring-1 ring-white/10 shadow-[0_30px_120px_-30px_rgba(198,255,61,0.25)]"
      >
        <div ref={host} className="absolute inset-0" onClick={() => !ui.idle && dir.current?.toggle()} />

        {!webgl && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black p-8 text-center">
            <p className="max-w-md font-mono text-sm text-white/70">
              This episode is rendered live with WebGL, which your browser or device doesn't seem to support. Try a recent desktop Chrome, Edge, Firefox or Safari.
            </p>
          </div>
        )}

        {/* letterbox */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[6.5%] bg-black" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[6.5%] bg-black" />

        {/* scene lower third */}
        {!ui.idle && st < 4.2 && !card && (
          <div key={scene.n} className="anim-lower-third pointer-events-none absolute left-[3%] top-[10%] z-20">
            <div className="font-mono text-[10px] tracking-[0.3em] text-acid sm:text-xs">
              SCENE {String(scene.n).padStart(2, "0")} / 12 · {fmt(scene.start)}
            </div>
            <div className="mt-1 border-l-2 border-acid pl-3 font-serif text-2xl italic text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-4xl">
              {scene.title}
            </div>
          </div>
        )}

        {/* big cards */}
        {card && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div key={card.title} className="anim-title text-center">
              <div className={`anim-glitch font-sans text-[9vw] font-bold leading-none tracking-tight text-white sm:text-[8vw] ${card.kind === "title" ? "drop-shadow-[4px_0_0_#ff4d8d] [text-shadow:-4px_0_0_#7dffc4]" : "text-acid"}`}>
                {card.title}
              </div>
              <div className="mt-4 font-mono text-[10px] tracking-[0.4em] text-white/80 sm:text-sm">{card.sub}</div>
            </div>
          </div>
        )}

        {/* subtitles */}
        {subs && al && !card && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[9%] z-20 flex justify-center px-[6%]">
            <div key={al.abs} className="anim-sub max-w-[900px] rounded-md bg-black/55 px-4 py-2 text-center backdrop-blur-sm">
              <div className="font-mono text-[9px] font-bold tracking-[0.3em] sm:text-[11px]" style={{ color: SPEAKER_COLOR[al.line.speaker] }}>
                {al.line.speaker === "MOM" ? "MOM (PHONE)" : al.line.speaker}
              </div>
              <div className={`text-[13px] leading-snug text-white sm:text-xl ${al.line.speaker === "NARRATOR" ? "font-serif italic" : "font-medium"}`}>
                {al.line.text}
              </div>
            </div>
          </div>
        )}

        {/* idle overlay */}
        {ui.idle && webgl && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(7,7,10,0.35),rgba(7,7,10,0.85))] px-6 text-center">
            <div className="font-mono text-[10px] tracking-[0.5em] text-acid sm:text-xs">EPISODE 01 · 6:00 · DARK COMEDY</div>
            <h1 className="mt-3 text-[13vw] font-bold leading-[0.85] tracking-tighter text-white sm:text-[9vw] lg:text-[7.5rem]">
              GERALD <span className="font-serif font-normal italic text-hot">is</span> FINE
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/75 sm:text-lg">
              A photoreal opossum who plays dead to avoid his mother. A moth who died at a bug zapper. A dumpster that is God.
              <span className="text-white/45"> Rendered live, in code, as you watch.</span>
            </p>
            <button
              onClick={() => dir.current?.begin()}
              className="anim-ring mt-7 inline-flex items-center gap-3 rounded-full bg-acid px-7 py-3.5 font-mono text-sm font-bold tracking-widest text-ink transition hover:scale-105"
            >
              <Ico n="play" className="h-4 w-4" /> BEGIN SCREENING
            </button>
            <div className="mt-4 font-mono text-[10px] tracking-widest text-white/40">SOUND ON · VOICES USE YOUR BROWSER'S SPEECH ENGINE</div>
          </div>
        )}

        {/* ended overlay */}
        {ui.ended && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
            <div className="font-mono text-xs tracking-[0.4em] text-hot">NEXT: EP 02 · BREACH OF CONTRACT</div>
            <div className="mt-3 font-serif text-4xl italic text-white sm:text-6xl">He had one job.</div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => dir.current?.begin()} className="inline-flex items-center gap-2 rounded-full bg-acid px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-ink">
                <Ico n="replay" className="h-4 w-4" /> REPLAY
              </button>
              <a href="#pipeline" className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 font-mono text-xs tracking-widest text-white hover:border-acid hover:text-acid">
                SEE HOW IT WAS MADE
              </a>
            </div>
          </div>
        )}

        {/* controls */}
        {!ui.idle && (
          <div className={`absolute inset-x-0 bottom-[6.5%] z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-10 transition-opacity duration-300 sm:px-5 ${showControls ? "opacity-100" : "opacity-0"}`}>
            <div
              ref={bar}
              className="group/bar relative h-5 cursor-pointer touch-none"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setScrub(seekFromEvent(e));
              }}
              onPointerMove={(e) => e.buttons && setScrub(seekFromEvent(e))}
              onPointerUp={(e) => {
                const v = seekFromEvent(e);
                setScrub(null);
                dir.current?.seek(v);
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-white/20 group-hover/bar:h-1.5">
                <div className="h-full rounded bg-acid" style={{ width: `${(t / TOTAL) * 100}%` }} />
              </div>
              {SCENES.slice(1).map((s) => (
                <div key={s.n} className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-black/70" style={{ left: `${(s.start / TOTAL) * 100}%` }} title={s.title} />
              ))}
              <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acid shadow-[0_0_12px_#c6ff3d]" style={{ left: `${(t / TOTAL) * 100}%` }} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-white sm:gap-4">
              <button aria-label={ui.playing ? "Pause" : "Play"} onClick={() => dir.current?.toggle()} className="rounded p-1.5 hover:text-acid">
                <Ico n={ui.playing ? "pause" : "play"} />
              </button>
              <div className="font-mono text-xs tabular-nums text-white/80">
                {fmt(t)} <span className="text-white/40">/ {fmt(TOTAL)}</span>
              </div>
              <div className="ml-2 hidden min-w-0 flex-1 truncate font-mono text-[11px] tracking-widest text-white/50 sm:block">
                {String(scene.n).padStart(2, "0")} · {scene.title.toUpperCase()}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Toggle on={voice} label="Voices" onClick={() => { setVoice(!voice); dir.current?.audio.setVoice(!voice); }}>
                  <Ico n="voice" />
                </Toggle>
                <Toggle on={music} label="Music" onClick={() => { setMusic(!music); dir.current?.audio.setMusic(!music); }}>
                  <Ico n="music" />
                </Toggle>
                <Toggle on={subs} label="Subtitles" onClick={() => setSubs(!subs)}>
                  <Ico n="cc" />
                </Toggle>
                <button aria-label="Fullscreen" onClick={fullscreen} className="rounded p-1.5 text-white/80 hover:text-acid">
                  <Ico n="full" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* now-playing + chapters */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] text-white/40">
            <span>NOW PLAYING · SCENE {String(scene.n).padStart(2, "0")}</span>
            <span>{fmt(scene.start)}–{fmt(scene.start + scene.dur)}</span>
          </div>
          <h3 className="mt-2 font-serif text-3xl italic text-white">{scene.title}</h3>
          <p className="mt-1 text-sm text-acid/90">{scene.tone}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{scene.desc}</p>
          {al && (
            <p className="mt-3 rounded border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-white/60">
              <span style={{ color: SPEAKER_COLOR[al.line.speaker] }}>VOICE DIRECTION → </span>
              {al.line.dir}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SCENES.map((s) => (
            <button
              key={s.n}
              onClick={() => window.dispatchEvent(new CustomEvent("gerald-seek", { detail: s.start }))}
              className={`rounded-lg border p-2.5 text-left transition hover:border-acid/60 ${!ui.idle && s.n === scene.n ? "border-acid bg-acid/10" : "border-white/10 bg-white/[0.02]"}`}
            >
              <div className="font-mono text-[10px] tracking-widest text-white/40">
                {String(s.n).padStart(2, "0")} · {fmt(s.start)}
              </div>
              <div className="mt-0.5 text-[13px] leading-tight text-white/90">{s.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} aria-pressed={on} onClick={onClick} className={`relative rounded p-1.5 transition hover:text-acid ${on ? "text-white" : "text-white/35"}`}>
      {children}
      {!on && <span className="absolute left-1 right-1 top-1/2 h-px -rotate-45 bg-white/70" />}
    </button>
  );
}
