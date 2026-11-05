import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Engine } from "./film/engine";
import { CHAPTERS, SERIES, chapterAt } from "./film/timeline";
import { DURATION } from "./film/util";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const fmtMs = (t: number) => `${fmt(t)}.${String(Math.floor((t % 1) * 10))}`;

type Tab = "chapters" | "narration" | "series" | "export";

function cueSheet() {
  const lines: string[] = [];
  lines.push("# STAR CATCHER — Episode I: The Hollow Tide");
  lines.push("Runtime 5:00 · 16:9 · generated in-browser · heartbeat motif spine\n");
  lines.push("## Chapters & narration windows\n");
  for (const c of CHAPTERS) {
    lines.push(`### ${c.n}. ${c.title}  (${fmt(c.start)} – ${fmt(c.end)})`);
    lines.push(`*Homage:* ${c.homage}\n`);
    lines.push(c.logline + "\n");
    for (const v of c.vo) lines.push(`- **VO ${fmtMs(v.at)} → ${fmtMs(v.at + v.dur)}** (${v.dur}s): ${v.note}`);
    lines.push("");
  }
  lines.push("## Series bible\n");
  for (const e of SERIES) lines.push(`- **Episode ${e.n} — ${e.title}** [${e.status}]: ${e.pitch}`);
  lines.push("\n## Motifs to carry forward\n");
  lines.push("- The **heartbeat** (mech heart → baby's heart → the empty mech's final beat at 4:55).");
  lines.push("- The **lullaby** (D-minor music box; major when given, warped when wrong).");
  lines.push("- The **belly map**: the Mother's constellation is a portrait of the Star Catcher. His chest star was missing until he gave it away.");
  lines.push("- The **sea reflects the true sky**: watch the eyes.");
  lines.push("- The **spinning top** never falls on screen.");
  return lines.join("\n");
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const engRef = useRef<Engine | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState<Tab>("chapters");
  const [recording, setRecording] = useState(false);
  const [ended, setEnded] = useState(false);
  const [note, setNote] = useState("");
  const lastUi = useRef(0);

  useEffect(() => {
    const e = new Engine(canvasRef.current!);
    engRef.current = e;
    (window as any).__film = e;
    e.onTick = (t) => {
      const now = performance.now();
      if (now - lastUi.current > 90) {
        lastUi.current = now;
        setTime(t);
      }
    };
    e.onState = setPlaying;
    e.onEnd = () => {
      setEnded(true);
      setTime(DURATION);
    };
    e.seek(31.6, false);
    setTime(0);
    return () => e.destroy();
  }, []);

  const eng = () => engRef.current!;

  const play = useCallback(async () => {
    setStarted(true);
    setEnded(false);
    await eng().play();
  }, []);
  const toggle = useCallback(() => {
    if (!started || eng().t >= DURATION - 0.1 || ended) {
      if (ended || eng().t >= DURATION - 0.1) eng().seek(0);
      play();
      return;
    }
    if (eng().playing) eng().pause();
    else play();
  }, [started, ended, play]);

  const jump = useCallback(
    (t: number) => {
      setStarted(true);
      setEnded(false);
      eng().seek(t);
      if (!eng().playing) play();
    },
    [play],
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" && (e.target as HTMLInputElement).type === "range" && e.code !== "Space") return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowRight") eng().seek(eng().t + 5);
      else if (e.code === "ArrowLeft") eng().seek(eng().t - 5);
      else if (e.key === "f") playerRef.current?.requestFullscreen?.();
      else if (e.key === "m") {
        setMuted((m) => {
          eng().setMuted(!m);
          return !m;
        });
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [toggle]);

  const chapter = chapterAt(time);
  const vo = useMemo(() => CHAPTERS.flatMap((c) => c.vo.map((v) => ({ ...v, c }))), []);
  const activeVo = vo.find((v) => time >= v.at && time < v.at + v.dur);

  const record = async () => {
    setStarted(true);
    setEnded(false);
    setRecording(true);
    setNote("Recording in real time. Keep this tab in the foreground until the film ends.");
    await eng().record((blob, ext) => {
      setRecording(false);
      setNote(`Saved star-catcher-ep1.${ext} (${(blob.size / 1e6).toFixed(1)} MB). Score is baked in; mute it in post if you want a clean VO pass.`);
      download(blob, `star-catcher-ep1.${ext}`);
    });
  };

  const stopRecord = () => {
    eng().cancelRecording();
    eng().pause();
    setRecording(false);
    setNote("Recording cancelled.");
  };

  const still = () => {
    eng().out.toBlob((b) => b && download(b, `star-catcher-${fmt(eng().t).replace(":", "m")}s.png`), "image/png");
  };

  return (
    <div className="min-h-screen bg-[#05050b] text-slate-200 selection:bg-amber-300/30" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <header className="mx-auto flex max-w-6xl items-end justify-between px-5 pt-7 pb-4">
        <div>
          <p className="text-[11px] tracking-[0.42em] text-amber-200/60">EPISODE I · A SERIES IN CODE</p>
          <h1 className="mt-1 text-3xl text-white sm:text-4xl" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', letterSpacing: "0.22em", fontWeight: 300 }}>
            STAR CATCHER
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-xs leading-relaxed text-slate-400 sm:block">
          Every frame and every note is generated by code in your browser. Five minutes. No narration yet, on purpose.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        {/* ------------------------------------------------------------ player */}
        <div ref={playerRef} className="group relative overflow-hidden rounded-xl bg-black shadow-[0_0_80px_-20px_rgba(120,100,255,0.45)] ring-1 ring-white/10">
          <canvas ref={canvasRef} className="block aspect-video w-full" onClick={toggle} />
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-end gap-4 bg-gradient-to-t from-black/85 via-black/20 to-transparent pb-8">
              <button
                onClick={play}
                className="flex items-center gap-3 rounded-full border border-amber-200/40 bg-black/50 px-8 py-3 text-sm tracking-[0.3em] text-amber-100 backdrop-blur transition hover:border-amber-200 hover:bg-amber-200/10"
              >
                <span className="text-lg">▶</span> BEGIN · 5:00
              </button>
              <p className="max-w-md px-6 text-center text-[11px] leading-relaxed text-slate-400">
                Headphones recommended. Contains flashing light, intense imagery and unsettling themes. Not suitable for viewers with photosensitive epilepsy.
              </p>
            </div>
          )}
          {ended && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <button onClick={() => { eng().seek(0); play(); }} className="rounded-full border border-white/30 px-7 py-3 text-xs tracking-[0.3em] hover:bg-white/10">
                ↺ WATCH AGAIN
              </button>
            </div>
          )}
          {recording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] tracking-widest text-red-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC {fmt(time)}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------- controls */}
        <div className="mt-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
          <div className="relative h-8">
            {/* chapter + VO markers */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
              {CHAPTERS.map((c, i) => (
                <div key={c.id} className="absolute top-0 h-full border-l border-black/70" style={{ left: `${(c.start / DURATION) * 100}%`, width: `${((c.end - c.start) / DURATION) * 100}%`, background: i % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.09)" }} />
              ))}
              {vo.map((v, i) => (
                <div key={i} className="absolute top-0 h-full bg-amber-300/50" style={{ left: `${(v.at / DURATION) * 100}%`, width: `${(v.dur / DURATION) * 100}%` }} />
              ))}
              <div className="absolute top-0 left-0 h-full bg-violet-400/70" style={{ width: `${(time / DURATION) * 100}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={DURATION}
              step={0.1}
              value={time}
              aria-label="Seek"
              onChange={(e) => {
                setTime(+e.target.value);
                eng().seek(+e.target.value, false);
              }}
              onPointerUp={(e) => eng().seek(+(e.target as HTMLInputElement).value, true)}
              onKeyUp={(e) => eng().seek(+(e.target as HTMLInputElement).value, true)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_rgba(180,160,255,0.9)]" style={{ left: `${(time / DURATION) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={playing ? "Pause" : "Play"}>
                {playing ? "❚❚" : "▶"}
              </button>
              <button onClick={() => jump(Math.max(0, chapter.start - (time - chapter.start < 2 ? 1 : 0)))} className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white" title="Chapter start">
                PREV
              </button>
              <span className="tabular-nums text-slate-300">{fmt(time)} <span className="text-slate-600">/ 5:00</span></span>
            </div>
            <div className="min-w-0 flex-1 truncate text-center text-slate-400">
              <span className="text-amber-200/70">{chapter.n}.</span> {chapter.title}
              {activeVo && <span className="ml-3 rounded bg-amber-300/15 px-2 py-0.5 text-[10px] tracking-widest text-amber-200">VO WINDOW</span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { eng().setMuted(!muted); setMuted(!muted); }}
                className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white"
                aria-label="Mute"
              >
                {muted ? "UNMUTE" : "MUTE"}
              </button>
              <button onClick={() => playerRef.current?.requestFullscreen?.()} className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white" aria-label="Fullscreen">
                FULLSCREEN
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] tracking-wider text-slate-600">SPACE play/pause · ← → ±5s · F fullscreen · M mute</p>
        </div>

        {/* -------------------------------------------------------------- tabs */}
        <nav className="mt-8 flex gap-1 border-b border-white/10 text-xs tracking-[0.2em]">
          {([["chapters", "CHAPTERS"], ["narration", "NARRATION MAP"], ["series", "SERIES BIBLE"], ["export", "EXPORT"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-3 transition ${tab === k ? "border-b-2 border-amber-200 text-amber-100" : "text-slate-500 hover:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </nav>

        {tab === "chapters" && (
          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHAPTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => jump(c.start)}
                className={`group rounded-xl p-4 text-left ring-1 transition ${chapter.id === c.id ? "bg-violet-400/10 ring-violet-300/40" : "bg-white/[0.03] ring-white/5 hover:bg-white/[0.06]"}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] tracking-[0.3em] text-amber-200/70">CHAPTER {c.n}</span>
                  <span className="text-[11px] tabular-nums text-slate-500">{fmt(c.start)}–{fmt(c.end)}</span>
                </div>
                <h3 className="mt-1 text-lg text-white" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>{c.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.logline}</p>
                <p className="mt-2 text-[10px] tracking-wider text-slate-600">↳ {c.homage}</p>
              </button>
            ))}
          </section>
        )}

        {tab === "narration" && (
          <section className="mt-5">
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              The film is silent of voice by design. The amber blocks are windows where the score breathes and the picture holds, built for your narration. Click a window to audition it.
            </p>
            <div className="mt-5 space-y-2">
              {vo.map((v, i) => (
                <button key={i} onClick={() => jump(Math.max(0, v.at - 1))} className="flex w-full items-start gap-4 rounded-lg bg-white/[0.03] p-3 text-left ring-1 ring-white/5 hover:bg-white/[0.06]">
                  <div className="w-28 shrink-0 text-xs tabular-nums text-amber-200">{fmtMs(v.at)} → {fmtMs(v.at + v.dur)}</div>
                  <div className="text-xs leading-relaxed text-slate-300">
                    <span className="mr-2 text-slate-500">Ch.{v.c.n} {v.c.title}</span>
                    {v.note}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "series" && (
          <section className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              {SERIES.map((e) => (
                <div key={e.n} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[0.3em] text-amber-200/70">EPISODE {e.n}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] tracking-widest ${e.status === "released" ? "bg-emerald-400/15 text-emerald-200" : e.status === "next" ? "bg-violet-400/15 text-violet-200" : "bg-white/5 text-slate-500"}`}>
                      {e.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg text-white" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>{e.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{e.pitch}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white/[0.03] p-5 text-sm leading-relaxed text-slate-300 ring-1 ring-white/5">
              <h3 className="text-[11px] tracking-[0.3em] text-amber-200/80">PLANTED FOR LATER</h3>
              <ul className="mt-3 space-y-3 text-xs text-slate-400">
                <li><b className="text-slate-200">The belly map.</b> The Mother's constellation is a portrait of the Star Catcher: hat, lantern pole, arms. His chest star stayed dark until he gave it away.</li>
                <li><b className="text-slate-200">The drowned sky.</b> The sea reflects what is really up there. Eyes. Always eyes.</li>
                <li><b className="text-slate-200">The lanterns.</b> They rose into her belly in Chapter 4. They were never lanterns.</li>
                <li><b className="text-slate-200">The pilot.</b> In the white room he turns to dust and the hat stays behind. Who woke the empty machine at 4:55?</li>
                <li><b className="text-slate-200">The top.</b> It was still spinning when we cut away.</li>
                <li><b className="text-slate-200">The heartbeat.</b> It moves from the mech to the child, then returns once, alone, at the end.</li>
                <li><b className="text-slate-200">The lullaby.</b> D minor, then major, then warped. It will come back wrong.</li>
              </ul>
              <p className="mt-4 text-[11px] text-slate-500">New episodes drop into <code className="text-slate-300">src/film/scenes</code> and <code className="text-slate-300">timeline.ts</code>. The engine, palette and heartbeat spine are shared.</p>
            </div>
          </section>
        )}

        {tab === "export" && (
          <section className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/5">
              <h3 className="text-[11px] tracking-[0.3em] text-amber-200/80">RECORD THE FILM</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Captures the 1920×1080 canvas and the score in real time to a WebM file for your editor. Best in desktop Chrome or Edge. Leave the tab in the foreground.
              </p>
              {!recording ? (
                <button onClick={record} className="mt-4 rounded-full bg-amber-200 px-5 py-2 text-xs font-medium tracking-[0.2em] text-black hover:bg-amber-100">● RECORD 5:00</button>
              ) : (
                <button onClick={stopRecord} className="mt-4 rounded-full bg-red-400 px-5 py-2 text-xs font-medium tracking-[0.2em] text-black">■ STOP</button>
              )}
            </div>
            <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/5">
              <h3 className="text-[11px] tracking-[0.3em] text-amber-200/80">SAVE THE CURRENT FRAME</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">A full-resolution PNG of whatever is on screen right now. Scrub, then save.</p>
              <button onClick={still} className="mt-4 rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.2em] hover:bg-white/10">SAVE PNG</button>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/5">
              <h3 className="text-[11px] tracking-[0.3em] text-amber-200/80">POST-PRODUCTION SHEET</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Chapters, timecoded VO windows with tone notes, homages, series bible and motifs, as Markdown.</p>
              <button onClick={() => download(new Blob([cueSheet()], { type: "text/markdown" }), "star-catcher-ep1-cue-sheet.md")} className="mt-4 rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.2em] hover:bg-white/10">DOWNLOAD .MD</button>
            </div>
            {note && <p className="md:col-span-3 rounded-lg bg-violet-400/10 px-4 py-3 text-xs text-violet-100">{note}</p>}
          </section>
        )}

        <footer className="mt-14 border-t border-white/5 pt-6 text-[11px] leading-relaxed text-slate-600">
          Reimagined from the 90-second <i>Star Catcher</i> short by anstapnever. Homage to E.T., Interstellar, Inception and 2001: A Space Odyssey. All imagery and music synthesized live. No video or image models, no samples.
        </footer>
      </main>
    </div>
  );
}
