import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SeriesEngine, type AudioMode } from "./series/engine";
import { EPISODES } from "./series";
import type { EpisodeDef } from "./series/types";
import { SUBTITLES } from "./series/subtitles";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const fmtMs = (t: number) => `${fmt(t)}.${String(Math.floor((t % 1) * 10))}`;
const SERIF = '"Cormorant Garamond", Georgia, serif';

type Tab = "chapters" | "narration" | "bible" | "export";

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function cueSheet(ep: EpisodeDef) {
  const L: string[] = [];
  L.push(`# STAR CATCHER — Episode ${ep.roman}: ${ep.title}`);
  L.push(`Runtime ${fmt(ep.duration)} · 16:9 · generated in-browser\n`);
  L.push(ep.pitch + "\n");
  L.push("## Chapters & narration windows\n");
  for (const c of ep.chapters) {
    L.push(`### ${c.n}. ${c.title}  (${fmt(c.start)} – ${fmt(c.end)})`);
    L.push(`*Homage:* ${c.homage}\n`);
    L.push(c.logline + "\n");
    for (const v of c.vo) L.push(`- **VO ${fmtMs(v.at)} → ${fmtMs(v.at + v.dur)}** (${v.dur}s): ${v.note}`);
    L.push("");
  }
  return L.join("\n");
}

const MOTIFS = [
  { k: "The heartbeat", v: ["Mech heart → baby's heart → the empty mech's last beat (I).", "Silence, then a far-off pulse from above the mirror, answered at 2:22 by a lantern heart (II).", "A second, smaller heart inside the belly map (III).", "Both hearts find the same beat at 2:30 (IV)."] },
  { k: "The lullaby", v: ["D-minor music box; major when given, warped when wrong (I).", "Hummed by a lantern in an empty cockpit (II).", "Eight stars, eight bells: the child figure draws itself (III).", "Fully major, full choir, as the star comes home (IV)."] },
  { k: "The belly map", v: ["The Mother's constellation is a portrait of the Star Catcher (I).", "A black rectangle appears in the reflected sky (II).", "A second figure, smaller, holding his hand (III).", "Three hearts, completed across the whole sky (IV)."] },
  { k: "The sea reflects the true sky", v: ["Watch the eyes (I).", "The mirror gives the lanterns back as stars (II).", "The slab shows him something that isn't his reflection (III).", "The sky was never above. It was the other side of the water (IV)."] },
  { k: "The spinning top", v: ["Never falls on screen (I).", "Spins by itself in an empty cockpit (II).", "Wobbles in the vision tunnel (III).", "Still spinning. We cut before we know (IV)."] },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const engRef = useRef<SeriesEngine | null>(null);
  const lastUi = useRef(0);
  const [epIdx, setEpIdx] = useState(0);
  const [audioMode, setAudioMode] = useState<AudioMode>("suno-master");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [tab, setTab] = useState<Tab>("chapters");
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState("");
  const [binge, setBinge] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSubs, setShowSubs] = useState(true);

  const ep = EPISODES[epIdx];
  const currentSub = showSubs ? SUBTITLES[ep.id]?.find((s) => time >= s.start && time <= s.end)?.text : null;

  useEffect(() => {
    const e = new SeriesEngine(canvasRef.current!, EPISODES[0]);
    engRef.current = e;
    (window as any).__eng = e;
    (window as any).__eps = Object.fromEntries(EPISODES.map((x) => [x.id.toUpperCase(), x]));
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
      setTime(e.duration);
    };
    e.seek(EPISODES[0].posterAt, false);
    return () => e.destroy();
  }, []);

  const eng = () => engRef.current!;

  const changeAudioMode = useCallback((mode: AudioMode) => {
    setAudioMode(mode);
    engRef.current?.setAudioMode(mode);
  }, []);

  const play = useCallback(async () => {
    setStarted(true);
    setEnded(false);
    setCountdown(null);
    await eng().play();
  }, []);

  const toggle = useCallback(() => {
    const e = eng();
    if (!started || ended || e.t >= e.duration - 0.1) {
      if (ended || e.t >= e.duration - 0.1) e.seek(0);
      play();
      return;
    }
    if (e.playing) e.pause();
    else play();
  }, [started, ended, play]);

  const jump = useCallback(
    (t: number) => {
      setStarted(true);
      setEnded(false);
      setCountdown(null);
      eng().seek(t);
      if (!eng().playing) play();
    },
    [play],
  );

  const pick = useCallback(
    (i: number, autoplay = false) => {
      const e = eng();
      setEpIdx(i);
      setStarted(false);
      setEnded(false);
      setCountdown(null);
      setTime(EPISODES[i].posterAt);
      setNote("");
      e.setEpisode(EPISODES[i]);
      if (autoplay) {
        e.seek(0, false);
        setStarted(true);
        e.play();
      }
    },
    [],
  );

  // auto-advance: the series plays on its own if you let it
  useEffect(() => {
    if (!ended || !binge || epIdx >= EPISODES.length - 1 || recording) return;
    setCountdown(6);
    const iv = window.setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          window.clearInterval(iv);
          pick(epIdx + 1, true);
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [ended, binge, epIdx, recording, pick]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (tg?.tagName === "INPUT" && (tg as HTMLInputElement).type === "range" && e.code !== "Space") return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowRight") eng().seek(eng().t + 5);
      else if (e.code === "ArrowLeft") eng().seek(eng().t - 5);
      else if (e.key === "f") playerRef.current?.requestFullscreen?.();
      else if (e.key === "c" || e.key === "C") setShowSubs((s) => !s);
      else if (e.key === "m") {
        setMuted((m) => {
          eng().setMuted(!m);
          return !m;
        });
      } else if (e.key >= "1" && e.key <= "4") pick(+e.key - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [toggle, pick]);

  const D = ep.duration;
  const chapter = ep.chapters.find((c) => time >= c.start && time < c.end) ?? ep.chapters[ep.chapters.length - 1];
  const vo = useMemo(() => ep.chapters.flatMap((c) => c.vo.map((v) => ({ ...v, c }))), [ep]);
  const activeVo = vo.find((v) => time >= v.at && time < v.at + v.dur);

  const record = async () => {
    setStarted(true);
    setEnded(false);
    setRecording(true);
    setNote("Recording in real time. Keep this tab in the foreground until the episode ends.");
    await eng().record((blob, ext) => {
      setRecording(false);
      setNote(`Saved star-catcher-ep${ep.roman}.${ext} (${(blob.size / 1e6).toFixed(1)} MB). Score is baked in.`);
      download(blob, `star-catcher-ep${ep.roman}.${ext}`);
    });
  };
  const stopRecord = () => {
    eng().cancelRecording();
    eng().pause();
    setRecording(false);
    setNote("Recording cancelled.");
  };
  const still = () => eng().out.toBlob((b) => b && download(b, `star-catcher-ep${ep.roman}-${fmt(eng().t).replace(":", "m")}s.png`), "image/png");

  return (
    <div className="min-h-screen bg-[#05050b] text-slate-200 selection:bg-amber-300/30" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <header className="mx-auto flex max-w-6xl items-end justify-between px-5 pt-7 pb-4">
        <div>
          <p className="text-[11px] tracking-[0.42em]" style={{ color: ep.accent, opacity: 0.8 }}>EPISODE {ep.roman} · A SERIES IN CODE</p>
          <h1 className="mt-1 text-3xl text-white sm:text-4xl" style={{ fontFamily: SERIF, letterSpacing: "0.22em", fontWeight: 300 }}>STAR CATCHER</h1>
        </div>
        <p className="hidden max-w-xs text-right text-xs leading-relaxed text-slate-400 sm:block">
          Four episodes. Every frame and every note generated by code in your browser. Episodes II–IV cut faster on purpose.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        {/* ----------------------------------------------- episode rail */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EPISODES.map((e, i) => (
            <button
              key={e.id}
              onClick={() => pick(i)}
              className={`group relative overflow-hidden rounded-xl p-3 text-left ring-1 transition ${i === epIdx ? "bg-white/[0.07]" : "bg-white/[0.02] hover:bg-white/[0.05]"}`}
              style={{ ["--tw-ring-color" as any]: i === epIdx ? e.accent : "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.3em]" style={{ color: e.accent }}>EPISODE {e.roman}</span>
                {e.status === "new" && <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] tracking-widest text-emerald-200">NEW</span>}
              </div>
              <div className="mt-1 text-lg leading-tight text-white" style={{ fontFamily: SERIF }}>{e.title}</div>
              <div className="mt-1 text-[10px] tracking-wider text-slate-500">{e.bpmNote}</div>
              <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: e.accent, opacity: i === epIdx ? 0.9 : 0.15 }} />
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------ player */}
        <div ref={playerRef} className="group relative overflow-hidden rounded-xl bg-black shadow-[0_0_80px_-20px_rgba(120,100,255,0.45)] ring-1 ring-white/10">
          <canvas ref={canvasRef} className="block aspect-video w-full" onClick={toggle} />
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/90 via-black/25 to-transparent pb-7">
              <p className="max-w-lg px-6 text-center text-sm leading-relaxed text-slate-200" style={{ fontFamily: SERIF, fontSize: 18 }}>{ep.pitch}</p>
              {ep.recap && <p className="max-w-lg px-6 text-center text-[11px] leading-relaxed text-slate-400">Previously: {ep.recap}</p>}
              <button
                onClick={play}
                className="mt-1 flex items-center gap-3 rounded-full border bg-black/50 px-8 py-3 text-sm tracking-[0.3em] backdrop-blur transition hover:bg-white/10"
                style={{ borderColor: ep.accent, color: ep.accent }}
              >
                <span className="text-lg">▶</span> EPISODE {ep.roman} · {fmt(D)}
              </button>
              <p className="max-w-md px-6 text-center text-[10px] leading-relaxed text-slate-500">
                Headphones recommended. Contains flashing light, intense imagery and unsettling themes. Not suitable for viewers with photosensitive epilepsy.
              </p>
            </div>
          )}
          {ended && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              {epIdx < EPISODES.length - 1 ? (
                <>
                  <button
                    onClick={() => pick(epIdx + 1, true)}
                    className="rounded-full border px-8 py-3 text-xs tracking-[0.3em] hover:bg-white/10"
                    style={{ borderColor: EPISODES[epIdx + 1].accent, color: EPISODES[epIdx + 1].accent }}
                  >
                    NEXT · EPISODE {EPISODES[epIdx + 1].roman} · {EPISODES[epIdx + 1].title.toUpperCase()}
                    {countdown !== null && <span className="ml-3 text-slate-400">{countdown}</span>}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-slate-400">
                    <input type="checkbox" checked={binge} onChange={(e) => { setBinge(e.target.checked); if (!e.target.checked) setCountdown(null); }} /> AUTO-PLAY NEXT
                  </label>
                </>
              ) : (
                <p className="text-sm tracking-[0.4em] text-amber-100" style={{ fontFamily: SERIF }}>THE END</p>
              )}
              <button onClick={() => { eng().seek(0); play(); }} className="rounded-full border border-white/30 px-6 py-2 text-[11px] tracking-[0.3em] hover:bg-white/10">↺ WATCH AGAIN</button>
            </div>
          )}
          {recording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] tracking-widest text-red-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC {fmt(time)}
            </div>
          )}
          {started && !ended && currentSub && (
            <div className="pointer-events-none absolute bottom-8 left-0 right-0 z-20 flex justify-center px-6 text-center transition-all duration-300">
              <span
                className="inline-block max-w-2xl rounded-lg bg-black/85 px-4 py-2 text-sm md:text-base font-light tracking-wide text-amber-100 backdrop-blur-md shadow-2xl ring-1 ring-white/15"
                style={{ fontFamily: SERIF, textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}
              >
                {currentSub}
              </span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ controls */}
        <div className="mt-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
          <div className="relative h-8">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
              {ep.chapters.map((c, i) => (
                <div key={c.id} className="absolute top-0 h-full border-l border-black/70" style={{ left: `${(c.start / D) * 100}%`, width: `${((c.end - c.start) / D) * 100}%`, background: i % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.09)" }} />
              ))}
              {vo.map((v, i) => (
                <div key={i} className="absolute top-0 h-full bg-amber-300/50" style={{ left: `${(v.at / D) * 100}%`, width: `${(v.dur / D) * 100}%` }} />
              ))}
              <div className="absolute top-0 left-0 h-full" style={{ width: `${(time / D) * 100}%`, background: ep.accent, opacity: 0.75 }} />
            </div>
            <input
              type="range" min={0} max={D} step={0.1} value={time} aria-label="Seek"
              onChange={(e) => { setTime(+e.target.value); eng().seek(+e.target.value, false); }}
              onPointerUp={(e) => eng().seek(+(e.target as HTMLInputElement).value, true)}
              onKeyUp={(e) => eng().seek(+(e.target as HTMLInputElement).value, true)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_rgba(180,160,255,0.9)]" style={{ left: `${(time / D) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
              <button onClick={() => jump(Math.max(0, chapter.start - (time - chapter.start < 2 ? 1 : 0)))} className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white">PREV</button>
              <button onClick={() => jump(Math.min(D - 1, chapter.end + 0.01))} className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white">NEXT</button>
              <span className="tabular-nums text-slate-300">{fmt(time)} <span className="text-slate-600">/ {fmt(D)}</span></span>
            </div>
            <div className="min-w-0 flex-1 truncate text-center text-slate-400">
              <span style={{ color: ep.accent }}>{chapter.n}.</span> {chapter.title}
              {activeVo && <span className="ml-3 rounded bg-amber-300/15 px-2 py-0.5 text-[10px] tracking-widest text-amber-200">VO WINDOW</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSubs(!showSubs)} className={`rounded px-2 py-1 text-[10px] tracking-widest transition ${showSubs ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30" : "text-slate-400 hover:text-white"}`}>{showSubs ? "CC ON" : "CC OFF"}</button>
              <button onClick={() => { eng().setMuted(!muted); setMuted(!muted); }} className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white">{muted ? "UNMUTE" : "MUTE"}</button>
              <button onClick={() => playerRef.current?.requestFullscreen?.()} className="rounded px-2 py-1 text-[10px] tracking-widest text-slate-400 hover:text-white">FULLSCREEN</button>
            </div>
          </div>
          <p className="mt-1 text-[10px] tracking-wider text-slate-600">SPACE play/pause · ← → ±5s · 1–4 episode · F fullscreen · M mute · C subtitles</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] tracking-widest text-slate-400">AUDIO TRACK:</span>
              {[
                ["suno-master", "🎙️ Suno Master (VO + Score)"],
                ["suno-score", "🎵 Suno Score"],
                ["suno-vo", "🗣️ Suno VO"],
                ["procedural", "💻 Code Synth"],
              ].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => changeAudioMode(m as any)}
                  className={`rounded-md px-2.5 py-1 text-[10px] tracking-wider transition ${audioMode === m ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/30" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[10px] tracking-wider text-slate-500">Stitched with Suno Speech & Music</span>
          </div>
        </div>

        {/* ---------------------------------------------------------- tabs */}
        <nav className="mt-8 flex flex-wrap gap-1 border-b border-white/10 text-xs tracking-[0.2em]">
          {([["chapters", "CHAPTERS"], ["narration", "NARRATION MAP"], ["bible", "SERIES BIBLE"], ["export", "EXPORT"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-3 transition ${tab === k ? "border-b-2 text-white" : "text-slate-500 hover:text-slate-300"}`} style={tab === k ? { borderColor: ep.accent } : undefined}>{label}</button>
          ))}
        </nav>

        {tab === "chapters" && (
          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ep.chapters.map((c) => (
              <button key={c.id} onClick={() => jump(c.start)} className={`rounded-xl p-4 text-left ring-1 transition ${chapter.id === c.id ? "bg-white/[0.07] ring-white/30" : "bg-white/[0.03] ring-white/5 hover:bg-white/[0.06]"}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] tracking-[0.3em]" style={{ color: ep.accent }}>CHAPTER {c.n}</span>
                  <span className="text-[11px] tabular-nums text-slate-500">{fmt(c.start)}–{fmt(c.end)}</span>
                </div>
                <h3 className="mt-1 text-lg text-white" style={{ fontFamily: SERIF }}>{c.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.logline}</p>
                <p className="mt-2 text-[10px] tracking-wider text-slate-600">↳ {c.homage}</p>
              </button>
            ))}
          </section>
        )}

        {tab === "narration" && (
          <section className="mt-5">
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">The episodes are silent of voice by design. Amber blocks are windows where the score breathes and the picture holds, built for narration. Click one to audition it.</p>
            <div className="mt-5 space-y-2">
              {vo.map((v, i) => (
                <button key={i} onClick={() => jump(Math.max(0, v.at - 1))} className="flex w-full items-start gap-4 rounded-lg bg-white/[0.03] p-3 text-left ring-1 ring-white/5 hover:bg-white/[0.06]">
                  <div className="w-28 shrink-0 text-xs tabular-nums text-amber-200">{fmtMs(v.at)} → {fmtMs(v.at + v.dur)}</div>
                  <div className="text-xs leading-relaxed text-slate-300"><span className="mr-2 text-slate-500">Ch.{v.c.n} {v.c.title}</span>{v.note}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "bible" && (
          <section className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              {EPISODES.map((e, i) => (
                <button key={e.id} onClick={() => pick(i)} className="block w-full rounded-xl bg-white/[0.03] p-4 text-left ring-1 ring-white/5 hover:bg-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[0.3em]" style={{ color: e.accent }}>EPISODE {e.roman} · {fmt(e.duration)}</span>
                    <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-[10px] tracking-widest text-emerald-200">RELEASED</span>
                  </div>
                  <h3 className="mt-1 text-lg text-white" style={{ fontFamily: SERIF }}>{e.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{e.pitch}</p>
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-white/5">
              <h3 className="text-[11px] tracking-[0.3em] text-amber-200/80">HOW THE MOTIFS TRAVEL</h3>
              <div className="mt-3 space-y-4 text-xs text-slate-400">
                {MOTIFS.map((m) => (
                  <div key={m.k}>
                    <b className="text-slate-200">{m.k}</b>
                    <ol className="mt-1 space-y-0.5">{m.v.map((l, i) => <li key={i}><span className="mr-2 text-slate-600">{["I", "II", "III", "IV"][i]}</span>{l}</li>)}</ol>
                  </div>
                ))}
              </div>
              <h3 className="mt-6 text-[11px] tracking-[0.3em] text-amber-200/80">PACING NOTE</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Ep. I breathes at 5:00 with ~40 s chapters. Episodes II–IV run 3:00–3:30 with a hard cut every 4–10 s, a groove-driven score in the action chapters (up to 154 BPM), and hit-stop slow-motion on key impacts.</p>
            </div>
          </section>
        )}

        {tab === "export" && (
          <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
              <h3 className="text-sm text-white">Record episode {ep.roman}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Captures the canvas and score in real time to a video file. Keep the tab in front for {fmt(D)}.</p>
              {recording ? (
                <button onClick={stopRecord} className="mt-3 rounded-full border border-red-400/50 px-4 py-2 text-[11px] tracking-widest text-red-300">STOP</button>
              ) : (
                <button onClick={record} className="mt-3 rounded-full border border-white/30 px-4 py-2 text-[11px] tracking-widest hover:bg-white/10">● RECORD</button>
              )}
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
              <h3 className="text-sm text-white">Still frame</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Save the current frame as a 1920×1080 PNG.</p>
              <button onClick={still} className="mt-3 rounded-full border border-white/30 px-4 py-2 text-[11px] tracking-widest hover:bg-white/10">SAVE PNG</button>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
              <h3 className="text-sm text-white">Cue sheet</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Chapters, homages and narration windows as Markdown.</p>
              <button onClick={() => download(new Blob([cueSheet(ep)], { type: "text/markdown" }), `star-catcher-ep${ep.roman}-cues.md`)} className="mt-3 rounded-full border border-white/30 px-4 py-2 text-[11px] tracking-widest hover:bg-white/10">DOWNLOAD .MD</button>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
              <h3 className="text-sm text-white">Subtitles</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Time-locked subtitles for Ep. {ep.roman} in VTT and SRT format.</p>
              <div className="mt-3 flex gap-2">
                <a href={`/subtitles/${ep.id}.vtt`} download={`star-catcher-ep${ep.roman}.vtt`} className="rounded-full border border-white/30 px-3 py-2 text-[10px] tracking-widest hover:bg-white/10">.VTT</a>
                <a href={`/subtitles/${ep.id}.srt`} download={`star-catcher-ep${ep.roman}.srt`} className="rounded-full border border-white/30 px-3 py-2 text-[10px] tracking-widest hover:bg-white/10">.SRT</a>
              </div>
            </div>
            {note && <p className="text-xs text-slate-400 sm:col-span-3">{note}</p>}
          </section>
        )}
      </main>
    </div>
  );
}
