import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H, tc } from "./engine/util";
import { renderAt, sceneAt, state as renderState } from "./engine/timeline";
import { audioBufferToWav } from "./engine/audio";
import type { Assets } from "./engine/fx";
import { EPISODES, STILL } from "./episodes";
import { loadArt } from "./art";

const FONTS = ['400 20px "Space Mono"', '20px "Bebas Neue"', '500 20px "Zen Kaku Gothic New"', '800 20px "Shippori Mincho"', '500 20px "Shippori Mincho"'];
const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

declare global {
  interface Window {
    seek: (t: number) => void;
    __ready?: boolean;
  }
}

const params = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
const RENDER_MODE = params.has("render");

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

const REVIEW: { h: string; k: string; items: string[] }[] = [
  {
    h: "What Episode 1 does",
    k: "REVIEW",
    items: [
      "Ten AI-painted key plates carry every composition; code never draws a landscape.",
      "A virtual camera (zoom, focus point, handheld drift) flies through the paintings; overlays are anchored to plate coordinates.",
      "Cel-shaded vector eyes, shafts of light, mist, motes, rain and ferns are all deterministic functions of time.",
      "A bloom pyramid, vignette and grain-on-twos finish every frame; the whole film is window.seek(t)-able.",
      "A 5-minute score is synthesised offline from oscillators and seeded noise — a heartbeat spine at 72 BPM.",
    ],
  },
  {
    h: "What Episodes 2–4 keep",
    k: "CONTINUITY",
    items: [
      "Same 1920×820 frame, same teal/amber grade, same #ff7a2f accent, same render contract.",
      "Maya's recorder, the hand-cranked battery, the three-knock motif and Grandpa's sentence run through all three.",
      "Episode 1's plates are re-used as memory (recaps, flashback) so the series reads as one world.",
      "Every episode opens with a Log, ends with a Next card, and is 300 s long.",
    ],
  },
  {
    h: "What Episodes 2–4 add",
    k: "NEW IN THIS BUILD",
    items: [
      "A shot-language engine: camera keyframes, whip-pans, flash/dip/dissolve cuts, rack focus, camera punches on every knock.",
      "‘Living plates’: foliage, braids and water are re-sliced and swayed per frame so painted stills breathe.",
      "New FX: firelight + embers, ripples, sound-pulse rings, lightning bolts, lens flares, rising water, negative impact frames, chromatic aberration.",
      "Diegetic instruments: spectrogram, hand-crank HUD, compass, tap-test, sat-phone, field-notebook map, crayon drawing that writes itself.",
      "Ten new painted plates (Wayra, Ila, the Mother Tree, the night bridge…) and a richer score: bamboo flute, vowel choir, talking-log drum with distant-canopy echo, helicopter, thunder.",
    ],
  },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const assets = useRef<Assets>({});
  const bufs = useRef<Map<string, AudioBuffer>>(new Map());
  const scoring = useRef<Set<string>>(new Set());
  const A = useRef({
    actx: null as AudioContext | null,
    gain: null as GainNode | null,
    dest: null as MediaStreamAudioDestinationNode | null,
    src: null as AudioBufferSourceNode | null,
    playing: false,
    startCtx: 0,
    startT: 0,
    t: 0,
    perf: 0,
    recording: false,
    spoken: "",
  });
  const initialEp = Math.max(0, Math.min(EPISODES.length - 1, (parseInt(params.get("ep") ?? "2") || 2) - 1));
  const [epIdx, setEpIdx] = useState(initialEp);
  const ep = EPISODES[epIdx];
  const [ready, setReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [ui, setUi] = useState({ t: 0, playing: false });
  const [vol, setVol] = useState(0.9);
  const [caps, setCaps] = useState(true);
  const [voice, setVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [started, setStarted] = useState(false);
  const [fs, setFs] = useState(false);
  const [tab, setTab] = useState(0);

  const epRef = useRef(ep);
  epRef.current = ep;
  const readyRef = useRef(false);
  readyRef.current = ready;
  const voiceRef = useRef(false);
  voiceRef.current = voice;

  const draw = useCallback((t: number) => {
    const c = canvasRef.current?.getContext("2d");
    const e = epRef.current;
    if (!c || !readyRef.current) return;
    renderAt(c, t, assets.current, e.scenes, e.duration);
  }, []);

  const stopSrc = () => {
    const a = A.current;
    if (a.src) {
      try { a.src.stop(); } catch { /* already stopped */ }
      a.src.disconnect();
      a.src = null;
    }
  };
  const cancelVoice = () => {
    A.current.spoken = "";
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  };

  /* ---------------- boot an episode: fonts, art, score */
  useEffect(() => {
    let dead = false;
    A.current.playing = false;
    stopSrc();
    cancelVoice();
    setReady(false);
    readyRef.current = false;
    setStarted(false);
    setUi({ t: 0, playing: false });
    const still = STILL[ep.id] ?? 0;
    A.current.t = still;
    setAudioReady(bufs.current.has(ep.id));
    (async () => {
      try {
        await Promise.race([Promise.all(FONTS.map((f) => document.fonts.load(f, "Aあ"))), new Promise((r) => setTimeout(r, 4500))]);
      } catch { /* fonts are optional */ }
      const imgs = await Promise.all(ep.art.map((n) => loadArt(n)));
      if (dead) return;
      ep.art.forEach((n, i) => (assets.current[n] = imgs[i]));
      readyRef.current = true;
      setReady(true);
    })();
    if (!RENDER_MODE && !bufs.current.has(ep.id) && !scoring.current.has(ep.id)) {
      scoring.current.add(ep.id);
      ep.score()
        .then((b) => {
          bufs.current.set(ep.id, b);
          if (!dead && epRef.current.id === ep.id) setAudioReady(true);
        })
        .catch(() => scoring.current.delete(ep.id));
    }
    return () => { dead = true; };
  }, [ep]);

  /* poster frame + render contract */
  useEffect(() => {
    if (!ready) return;
    window.seek = (t: number) => {
      const c = canvasRef.current?.getContext("2d");
      if (c) renderAt(c, t, assets.current, ep.scenes, ep.duration);
    };
    const q = params.get("t");
    if (q !== null && epIdx === initialEp) window.seek(parseFloat(q) || 0);
    else if (!A.current.playing) window.seek(A.current.t || STILL[ep.id] || 0);
    window.__ready = true;
  }, [ready, ep, epIdx, initialEp]);

  /* ---------------- transport */
  const ensureAudio = () => {
    const a = A.current;
    if (!a.actx) {
      const ctx = new AudioContext();
      const g = ctx.createGain();
      g.gain.value = vol;
      g.connect(ctx.destination);
      const dest = ctx.createMediaStreamDestination();
      g.connect(dest);
      a.actx = ctx; a.gain = g; a.dest = dest;
    }
    return a.actx!;
  };
  const nowT = () => {
    const a = A.current;
    if (!a.playing) return a.t;
    const buf = bufs.current.get(epRef.current.id);
    if (a.actx && buf && a.src) return a.startT + (a.actx.currentTime - a.startCtx);
    return a.startT + (performance.now() - a.perf) / 1000;
  };
  const play = (from?: number) => {
    const a = A.current;
    const dur = epRef.current.duration;
    let t0 = from ?? a.t;
    if (t0 >= dur - 0.1) t0 = 0;
    stopSrc();
    cancelVoice();
    const buf = bufs.current.get(epRef.current.id);
    if (buf) {
      const ctx = ensureAudio();
      if (ctx.state === "suspended") void ctx.resume();
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(a.gain!);
      s.start(0, t0);
      a.src = s;
      a.startCtx = ctx.currentTime;
    }
    a.perf = performance.now();
    a.startT = t0;
    a.t = t0;
    a.playing = true;
    setStarted(true);
  };
  const pause = () => {
    const a = A.current;
    a.t = Math.min(nowT(), epRef.current.duration - 0.01);
    a.playing = false;
    stopSrc();
    cancelVoice();
    setUi({ t: a.t, playing: false });
    draw(a.t);
  };
  const toggle = () => (A.current.playing ? pause() : play());
  const seekTo = (t: number) => {
    const a = A.current;
    t = Math.max(0, Math.min(epRef.current.duration - 0.02, t));
    if (a.playing) play(t);
    else {
      cancelVoice();
      a.t = t;
      draw(t);
      setUi({ t, playing: false });
    }
  };

  const stopRecordRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    let raf = 0;
    let lastUi = 0;
    const loop = () => {
      const a = A.current;
      if (a.playing) {
        const e = epRef.current;
        let t = nowT();
        if (t >= e.duration - 0.02) {
          t = e.duration - 0.02;
          a.playing = false;
          a.t = t;
          stopSrc();
          if (a.recording) stopRecordRef.current?.();
          // roll into the next episode's poster when one exists
          setUi({ t, playing: false });
        }
        draw(t);
        if (voiceRef.current && typeof speechSynthesis !== "undefined") {
          const s = e.scenes[sceneAt(e.scenes, t)];
          const lt = t - s.start;
          const cap = s.caps.find(([t0, t1]) => lt >= t0 && lt <= t1);
          const text = cap ? cap[2] : "";
          if (text && text !== a.spoken && !text.startsWith("LOG ")) {
            a.spoken = text;
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ""));
            u.rate = 1.02; u.pitch = 1.08; u.volume = vol;
            speechSynthesis.speak(u);
          }
        }
        const p = performance.now();
        if (p - lastUi > 100) {
          lastUi = p;
          setUi({ t, playing: a.playing });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, vol]);

  useEffect(() => { if (A.current.gain) A.current.gain.gain.value = vol; }, [vol]);
  useEffect(() => {
    renderState.captions = caps;
    if (!A.current.playing) draw(A.current.t);
  }, [caps, draw, ready]);
  useEffect(() => { if (!voice) cancelVoice(); }, [voice]);

  // late-arriving score joins the film in sync
  useEffect(() => {
    if (audioReady && A.current.playing && !A.current.src && !A.current.recording) play(nowT());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioReady]);

  /* ---------------- recording */
  const recRef = useRef<MediaRecorder | null>(null);
  const startRecord = () => {
    const a = A.current;
    const buf = bufs.current.get(ep.id);
    if (!buf || !canvasRef.current) return;
    const ctx = ensureAudio();
    void ctx.resume();
    const stream = canvasRef.current.captureStream(60);
    a.dest!.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 192_000 });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      download(new Blob(chunks, { type: "video/webm" }), `lost-on-earth-${ep.id}.webm`);
      a.recording = false;
      setRecording(false);
    };
    recRef.current = rec;
    a.recording = true;
    setRecording(true);
    rec.start(1000);
    play(0);
  };
  stopRecordRef.current = () => { if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop(); };

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void boxRef.current?.requestFullscreen();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (RENDER_MODE) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      else if (e.code === "ArrowRight") seekTo(nowT() + 5);
      else if (e.code === "ArrowLeft") seekTo(nowT() - 5);
      else if (e.key === "c") setCaps((v) => !v);
      else if (e.key === "n") setVoice((v) => !v);
      else if (e.key === "f") fullscreen();
      else if (e.key >= "1" && e.key <= String(EPISODES.length)) setEpIdx(parseInt(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  });

  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const move = (ev: PointerEvent) => seekTo(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * ep.duration);
    move(e.nativeEvent);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const curIdx = sceneAt(ep.scenes, ui.t);
  const cur = ep.scenes[curIdx];
  const wavUrl = useMemo(() => null, []);
  void wavUrl;

  if (RENDER_MODE) {
    return (
      <div style={{ background: "#000", width: W, height: H, overflow: "hidden" }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: W, height: H, display: "block" }} />
      </div>
    );
  }

  const mono = { fontFamily: '"Space Mono", monospace' };
  const bebas = { fontFamily: '"Bebas Neue", Impact, sans-serif' };

  return (
    <div className="min-h-screen bg-[#05090a] text-[#e8f5ef]" style={{ fontFamily: '"Zen Kaku Gothic New", system-ui, sans-serif' }}>
      <header className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-3 px-5 pt-6 pb-3">
        <div>
          <div className="text-[11px] tracking-[0.4em] text-[#ff9a5c]" style={mono}>ORIGINAL ANIME SERIES · SEASON ONE · 4 × 05:00</div>
          <h1 className="text-5xl leading-none tracking-wide md:text-6xl" style={bebas}>
            LOST ON EARTH <span className="ml-2 text-xl text-[#ffcfa0]" style={{ fontFamily: '"Shippori Mincho", serif' }}>ロスト・オン・アース</span>
          </h1>
        </div>
        <div className="hidden text-right text-xs text-[#7fb5a6] md:block" style={mono}>
          <div>Every frame is a function of time.</div>
          <div>space ▸ play · ← → ▸ ±5s · 1–4 ▸ episode · c ▸ captions · n ▸ narration · f ▸ fullscreen</div>
        </div>
      </header>

      {/* episode picker */}
      <nav className="mx-auto grid max-w-[1500px] grid-cols-2 gap-2 px-3 pb-3 md:grid-cols-4 md:px-5">
        {EPISODES.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setEpIdx(i)}
            className={`group relative overflow-hidden rounded-md border px-4 py-3 text-left transition ${i === epIdx ? "border-[#ff7a2f]/80 bg-[#10201c]" : "border-white/10 bg-[#0a1412] hover:border-white/30"}`}
          >
            <div className="text-[10px] tracking-[0.35em]" style={{ ...mono, color: e.accent }}>EPISODE {String(e.num).padStart(2, "0")} · {mm(e.duration)}</div>
            <div className="text-2xl leading-tight tracking-wide" style={bebas}>{e.title}</div>
            <div className="text-xs text-[#9fc9bb]" style={{ fontFamily: '"Shippori Mincho", serif' }}>{e.jp}</div>
            {i === epIdx && <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[#ff7a2f]" />}
          </button>
        ))}
      </nav>

      {/* screen */}
      <div className="mx-auto max-w-[1500px] px-3 md:px-5">
        <div
          ref={boxRef}
          className="relative overflow-hidden rounded-md bg-black shadow-[0_30px_120px_rgba(0,160,120,0.14)] ring-1 ring-white/10"
          style={fs ? { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" } : undefined}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={() => ready && started && toggle()}
            className="block w-full cursor-pointer"
            style={{ aspectRatio: `${W} / ${H}`, maxHeight: fs ? "100vh" : undefined, objectFit: "contain" }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm tracking-[0.3em] text-[#8fe8d0]" style={mono}>
              LOADING PLATES…
            </div>
          )}
          {ready && !started && (
            <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/85 via-black/10 to-transparent pb-[6%]">
              <div className="mb-3 text-center">
                <div className="text-[11px] tracking-[0.4em] text-[#ffb27a]" style={mono}>EPISODE {String(ep.num).padStart(2, "0")}</div>
                <div className="text-5xl tracking-wide drop-shadow-lg md:text-7xl" style={bebas}>{ep.title}</div>
                <div className="mx-auto mt-1 max-w-xl px-4 text-sm text-[#e6d8c6]/90">{ep.tagline}</div>
              </div>
              <button
                onClick={() => play(0)}
                className="rounded-full border border-[#ffb27a]/60 bg-[#ff7a2f]/90 px-9 py-3.5 text-lg font-semibold tracking-wide text-[#1a0d05] shadow-[0_0_50px_rgba(255,122,47,0.5)] transition hover:scale-105"
              >
                ▶ Play episode
              </button>
              <div className="mt-2 text-[11px] tracking-[0.25em] text-[#8fb9ab]" style={mono}>
                {audioReady ? "SCORE READY · USE HEADPHONES" : "SYNTHESISING SCORE… (PLAYS SILENT UNTIL READY)"}
              </div>
            </div>
          )}
        </div>

        {/* transport */}
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-[#0a1412] px-3 py-2.5">
          <button onClick={() => (started ? toggle() : play(0))} disabled={!ready} className="h-9 w-9 rounded-full bg-[#ff7a2f] text-[#1a0d05] disabled:opacity-40" aria-label="play/pause">
            {ui.playing ? "❚❚" : "▶"}
          </button>
          <div className="w-24 text-xs text-[#9fe8d2]" style={mono}>{mm(ui.t)} / {mm(ep.duration)}</div>
          <div className="relative h-8 min-w-[220px] flex-1 cursor-pointer touch-none select-none" onPointerDown={scrub}>
            <div className="absolute inset-x-0 top-1/2 flex h-3 -translate-y-1/2 gap-[2px]">
              {ep.scenes.map((s, i) => (
                <div key={s.id} title={`${mm(s.start)} · ${s.label}`} className={`h-full rounded-[2px] ${i === curIdx ? "bg-[#3a5c52]" : "bg-[#1a2b27]"}`} style={{ width: `${(s.dur / ep.duration) * 100}%` }} />
              ))}
            </div>
            <div className="pointer-events-none absolute top-1/2 h-3 -translate-y-1/2 rounded-[2px] bg-[#ff7a2f]/70" style={{ width: `${(ui.t / ep.duration) * 100}%`, maxWidth: "100%" }} />
            <div className="pointer-events-none absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded bg-white" style={{ left: `${(ui.t / ep.duration) * 100}%` }} />
          </div>
          <div className="hidden w-44 truncate text-xs text-[#ffcfa0] lg:block" style={mono}>▸ {cur.label.toUpperCase()}</div>
          <label className="flex items-center gap-1 text-xs text-[#7fb5a6]" style={mono}>
            VOL <input type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(parseFloat(e.target.value))} className="w-20 accent-[#ff7a2f]" />
          </label>
          <Toggle on={caps} onClick={() => setCaps((v) => !v)}>CC</Toggle>
          <Toggle on={voice} onClick={() => setVoice((v) => !v)}>VOICE</Toggle>
          <Toggle on={fs} onClick={fullscreen}>FULL</Toggle>
          <button disabled={!audioReady || recording} onClick={startRecord} className="rounded border border-white/15 px-2.5 py-1 text-xs text-[#cfeee3] hover:border-[#ff7a2f] disabled:opacity-40" style={mono}>
            {recording ? "● REC…" : "⬇ WEBM"}
          </button>
          <button disabled={!audioReady} onClick={() => { const b = bufs.current.get(ep.id); if (b) download(audioBufferToWav(b), `lost-on-earth-${ep.id}-score.wav`); }} className="rounded border border-white/15 px-2.5 py-1 text-xs text-[#cfeee3] hover:border-[#ff7a2f] disabled:opacity-40" style={mono}>
            ⬇ SCORE
          </button>
        </div>

        {/* chapters + file */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-md border border-white/10 bg-[#0a1412] p-4">
            <h2 className="mb-3 text-2xl tracking-wide" style={bebas}>CHAPTERS</h2>
            <ol className="grid gap-1">
              {ep.scenes.map((s, i) => (
                <li key={s.id}>
                  <button onClick={() => { seekTo(s.start + 0.2); if (!started) play(s.start + 0.2); }} className={`flex w-full items-start gap-3 rounded px-2 py-1.5 text-left transition hover:bg-white/5 ${i === curIdx ? "bg-[#12241f]" : ""}`}>
                    <span className="w-12 pt-0.5 text-xs text-[#ff9a5c]" style={mono}>{tc(s.start).slice(3)}</span>
                    <span>
                      <span className="block text-[15px] font-medium text-[#f4efe6]">{String(i + 1).padStart(2, "0")} · {s.label}</span>
                      <span className="block text-[13px] leading-snug text-[#8fb9ab]">{ep.synopsis[s.id]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-md border border-white/10 bg-[#0a1412] p-4">
            <h2 className="mb-3 text-2xl tracking-wide" style={bebas}>EPISODE FILE</h2>
            <dl className="grid gap-3">
              {ep.brief.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] tracking-[0.35em] text-[#ff9a5c]" style={mono}>{k}</dt>
                  <dd className="text-[14px] leading-snug text-[#d8e9e2]">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* methodology review */}
        <section className="mt-5 rounded-md border border-white/10 bg-[#0a1412] p-4">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-2xl tracking-wide" style={bebas}>METHOD · REVIEW OF EPISODE 1 → BUILD OF EPISODES 2–4</h2>
            <div className="hidden gap-1 md:flex">
              {REVIEW.map((r, i) => (
                <button key={r.k} onClick={() => setTab(i)} className={`rounded px-2 py-1 text-[10px] tracking-[0.25em] ${tab === i ? "bg-[#ff7a2f] text-[#1a0d05]" : "bg-white/5 text-[#9fc9bb]"}`} style={mono}>{r.k}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {REVIEW.map((r, i) => (
              <div key={r.k} className={`rounded border p-3 ${i === tab ? "border-[#ff7a2f]/50" : "border-white/10"}`}>
                <div className="text-[10px] tracking-[0.35em] text-[#ff9a5c]" style={mono}>{r.k}</div>
                <h3 className="mb-2 text-lg font-semibold">{r.h}</h3>
                <ul className="grid gap-1.5 text-[13px] leading-snug text-[#c4dcd3]">
                  {r.items.map((it) => (<li key={it} className="flex gap-2"><span className="text-[#ff7a2f]">▸</span><span>{it}</span></li>))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <footer className="py-8 text-center text-xs text-[#5f8a7d]" style={mono}>
          Every frame and every note rendered by code in your browser · 20 painted plates · 0 recorded sounds
        </footer>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded border px-2.5 py-1 text-xs transition ${on ? "border-[#ff7a2f] bg-[#ff7a2f]/15 text-[#ffcfa0]" : "border-white/15 text-[#7fb5a6]"}`} style={{ fontFamily: '"Space Mono", monospace' }}>
      {children}
    </button>
  );
}
