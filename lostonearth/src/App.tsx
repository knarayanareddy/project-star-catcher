import { useCallback, useEffect, useRef, useState } from "react";
import { W, H, DURATION, tc } from "./engine/util";
import { renderAt, SCENES, state as renderState } from "./engine/timeline";
import { renderScore, audioBufferToWav } from "./engine/audio";
import type { Assets } from "./engine/fx";

const ART = ["river_dawn", "canopy", "walk_back", "portrait", "jaguar", "storm", "fungi_night", "flashback", "clearing", "ridge_dawn"];
const FONTS = ['400 20px "Space Mono"', '20px "Bebas Neue"', '500 20px "Zen Kaku Gothic New"', '800 20px "Shippori Mincho"', '500 20px "Shippori Mincho"'];

const SYNOPSIS: Record<string, string> = {
  log: "A black screen, a heartbeat, a voice memo. The recording starts.",
  sandbar: "Maya wakes on a river sandbar. The rapids flash back. She opens her eyes.",
  title: "Lost on Earth.",
  inventory: "Five items. One recorder. Zero maps. One good decision.",
  maze: "She's walking in circles. The way out is hidden in sound.",
  silence: "Every living thing in the forest stops at once. Something is listening.",
  flood: "The ants know before she does. A flash flood from the mountains.",
  dark: "Her light dies. A memory of her grandfather. The forest answers.",
  knock: "Three knocks, getting louder. The recording reveals a pattern.",
  clearing: "A fire still warm. A small red handprint. Someone is right behind her.",
  end: "Next: The One Who Knocks.",
};

const BRIEF: [string, string][] = [
  ["GOAL", "Five minutes of studio-grade anime that makes the viewer feel what Maya feels: the jungle isn't hostile, it's speaking, and she is learning to listen."],
  ["FORMAT", "One HTML page, 1920×820 (2.34:1), 300 s × 60 fps = 18,000 frames. Every frame is a pure function of t. Exposes window.seek(t)."],
  ["BEAT", "72 BPM score (1 beat = 0.833 s). Jaguar heartbeat follows φ = 1.15u + 0.035u², the same function drives the on-screen pulse and the audio."],
  ["LOOK", "Hand-painted key plates, cel-shaded vector eyes, bloom pyramid, film grain on twos, teal / amber palette, one accent: #ff7a2f."],
  ["SHOTS", "11 scenes, one hero move each: push-in, flash-cut, spectrogram, time-freeze, impact frames, rising water, mycelium growth, rewind scrub, handprint push."],
  ["MOTION", "ease-out-expo for reveals, ease-in-out-sine for camera, ease-in-out-cubic for travel, springs on the compass. Walk bob drawn on twos."],
  ["BANNED", "Floating particles as decoration (every mote is weather), text that moves while you read, generic purple gradients, centered-everything layouts."],
  ["CHECK", "Stills at named frames via ?t=SECONDS. Compare. Fix. Re-render."],
];

declare global {
  interface Window {
    seek: (t: number) => void;
    __ready?: boolean;
    __episode?: { duration: number; width: number; height: number; fps: number };
  }
}

const params = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
const RENDER_MODE = params.has("render");

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(src));
    i.src = src;
  });
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
  const boxRef = useRef<HTMLDivElement>(null);
  const assets = useRef<Assets>({});
  const A = useRef({
    actx: null as AudioContext | null,
    gain: null as GainNode | null,
    dest: null as MediaStreamAudioDestinationNode | null,
    buf: null as AudioBuffer | null,
    src: null as AudioBufferSourceNode | null,
    playing: false,
    startCtx: 0,
    startT: 0,
    t: 0,
    perf: 0,
    recording: false,
  });
  const [ready, setReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioErr, setAudioErr] = useState(false);
  const [ui, setUi] = useState({ t: 0, playing: false });
  const [vol, setVol] = useState(0.9);
  const [caps, setCaps] = useState(true);
  const [recording, setRecording] = useState(false);
  const [started, setStarted] = useState(false);
  const [fs, setFs] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const draw = useCallback((t: number) => {
    const c = canvasRef.current?.getContext("2d");
    if (!c || !ready) return;
    renderAt(c, t, assets.current);
  }, [ready]);

  /* ---------------- boot: fonts, art, score */
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        await Promise.race([Promise.all(FONTS.map((f) => document.fonts.load(f, "Aあ"))), new Promise((r) => setTimeout(r, 4500))]);
      } catch {
        /* fonts are optional */
      }
      const imgs = await Promise.all(ART.map((n) => loadImg(`art/${n}.jpg`)));
      if (dead) return;
      ART.forEach((n, i) => (assets.current[n] = imgs[i]));
      setReady(true);
    })();
    if (!RENDER_MODE) {
      renderScore()
        .then((b) => {
          if (dead) return;
          A.current.buf = b;
          (window as unknown as { __score?: AudioBuffer }).__score = b;
          setAudioReady(true);
        })
        .catch(() => setAudioErr(true));
    }
    return () => {
      dead = true;
    };
  }, []);

  /* ---------------- render contract: window.seek(t) */
  useEffect(() => {
    if (!ready) return;
    window.__episode = { duration: DURATION, width: W, height: H, fps: 60 };
    window.seek = (t: number) => {
      const c = canvasRef.current?.getContext("2d");
      if (c) renderAt(c, t, assets.current);
    };
    const q = params.get("t");
    if (q !== null) window.seek(parseFloat(q) || 0);
    else if (!A.current.playing) window.seek(RENDER_MODE ? 0 : 46.2);
    window.__ready = true;
  }, [ready]);

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
      a.actx = ctx;
      a.gain = g;
      a.dest = dest;
    }
    return a.actx!;
  };

  const stopSrc = () => {
    const a = A.current;
    if (a.src) {
      try {
        a.src.stop();
      } catch {
        /* already stopped */
      }
      a.src.disconnect();
      a.src = null;
    }
  };

  const nowT = () => {
    const a = A.current;
    if (!a.playing) return a.t;
    if (a.actx && a.buf) return a.startT + (a.actx.currentTime - a.startCtx);
    return a.startT + (performance.now() - a.perf) / 1000;
  };

  const play = (from?: number) => {
    const a = A.current;
    let t0 = from ?? a.t;
    if (t0 >= DURATION - 0.1) t0 = 0;
    stopSrc();
    if (a.buf) {
      const ctx = ensureAudio();
      if (ctx.state === "suspended") void ctx.resume();
      const s = ctx.createBufferSource();
      s.buffer = a.buf;
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
    a.t = Math.min(nowT(), DURATION - 0.01);
    a.playing = false;
    stopSrc();
    setUi({ t: a.t, playing: false });
    draw(a.t);
  };

  const toggle = () => (A.current.playing ? pause() : play());
  const seekTo = (t: number) => {
    const a = A.current;
    t = Math.max(0, Math.min(DURATION - 0.02, t));
    if (a.playing) play(t);
    else {
      a.t = t;
      draw(t);
      setUi({ t, playing: false });
    }
  };

  // animation loop
  useEffect(() => {
    let raf = 0;
    let lastUi = 0;
    const loop = () => {
      const a = A.current;
      if (a.playing) {
        let t = nowT();
        if (t >= DURATION - 0.02) {
          t = DURATION - 0.02;
          a.playing = false;
          a.t = t;
          stopSrc();
          if (a.recording) stopRecordRef.current?.();
          setUi({ t, playing: false });
        }
        draw(t);
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
  }, [draw]);

  useEffect(() => {
    if (A.current.gain) A.current.gain.gain.value = vol;
  }, [vol]);
  useEffect(() => {
    renderState.captions = caps;
    if (!A.current.playing) draw(A.current.t || 46.2);
  }, [caps, draw]);

  /* ---------------- recording (real-time, canvas + score → .webm) */
  const recRef = useRef<MediaRecorder | null>(null);
  const stopRecordRef = useRef<(() => void) | null>(null);
  const startRecord = () => {
    const a = A.current;
    if (!a.buf || !canvasRef.current) return;
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
      download(new Blob(chunks, { type: "video/webm" }), "lost-on-earth-episode-1.webm");
      a.recording = false;
      setRecording(false);
    };
    recRef.current = rec;
    a.recording = true;
    setRecording(true);
    rec.start(1000);
    play(0);
  };
  stopRecordRef.current = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  };

  /* ---------------- misc UI */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowRight") seekTo(nowT() + 5);
      else if (e.code === "ArrowLeft") seekTo(nowT() - 5);
      else if (e.key === "c") setCaps((v) => !v);
      else if (e.key === "f") fullscreen();
    };
    window.addEventListener("keydown", onKey);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void boxRef.current?.requestFullscreen();
  };

  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const move = (ev: PointerEvent) => seekTo(((ev.clientX - r.left) / r.width) * DURATION);
    move(e.nativeEvent);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const exportWav = () => A.current.buf && download(audioBufferToWav(A.current.buf), "lost-on-earth-ep1-score.wav");

  const canPlay = ready;

  // if the score finishes synthesizing while the film is already running, join it in sync
  useEffect(() => {
    if (audioReady && A.current.playing && !A.current.src && !A.current.recording) play(nowT());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioReady]);
  const cur = SCENES[SCENES.reduce((acc, s, i) => (ui.t >= s.start ? i : acc), 0)];

  /* ---------------- render-mode: bare canvas for the headless exporter */
  if (RENDER_MODE) {
    return (
      <div style={{ background: "#000", width: W, height: H, overflow: "hidden" }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ width: W, height: H, display: "block" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05090a] text-[#e8f5ef]" style={{ fontFamily: '"Zen Kaku Gothic New", system-ui, sans-serif' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <header className="mx-auto flex max-w-[1500px] items-end justify-between px-5 pt-6 pb-4">
        <div>
          <div className="text-[11px] tracking-[0.4em] text-[#ff9a5c]" style={{ fontFamily: '"Space Mono", monospace' }}>
            ORIGINAL ANIME SERIES · EPISODE 01 · 05:00
          </div>
          <h1 className="text-5xl leading-none tracking-wide md:text-6xl" style={{ fontFamily: '"Bebas Neue", Impact, sans-serif' }}>
            LOST ON EARTH <span className="ml-2 text-xl text-[#ffcfa0]" style={{ fontFamily: '"Shippori Mincho", serif' }}>ロスト・オン・アース</span>
          </h1>
        </div>
        <div className="hidden text-right text-xs text-[#7fb5a6] md:block" style={{ fontFamily: '"Space Mono", monospace' }}>
          <div>Every frame is a function of time.</div>
          <div>space ▸ play · ← → ▸ ±5s · c ▸ captions · f ▸ fullscreen</div>
        </div>
      </header>

      {/* ---------------- screen */}
      <div className="mx-auto max-w-[1500px] px-3 md:px-5">
        <div
          ref={boxRef}
          className="group relative overflow-hidden rounded-md bg-black shadow-[0_30px_120px_rgba(0,160,120,0.12)] ring-1 ring-white/10"
          style={fs ? { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" } : undefined}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={() => canPlay && started && toggle()}
            className="block w-full cursor-pointer"
            style={{ aspectRatio: `${W} / ${H}`, maxHeight: fs ? "100vh" : undefined, objectFit: "contain" }}
          />

          {/* begin overlay */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/85 via-black/10 to-transparent pb-[7%]">
              <button
                disabled={!canPlay}
                onClick={() => play(0)}
                className="rounded-full border border-[#ffb27a]/60 bg-[#ff7a2f]/90 px-9 py-3.5 text-lg font-semibold tracking-wide text-[#1b0c04] shadow-[0_0_50px_rgba(255,122,47,0.45)] transition hover:scale-105 hover:bg-[#ff8d4b] disabled:cursor-wait disabled:opacity-60"
              >
                {canPlay ? "▶  Watch Episode 1" : "Loading the painted plates…"}
              </button>
              <p className="mt-3 text-[11px] tracking-[0.25em] text-[#9fd8c7]" style={{ fontFamily: '"Space Mono", monospace' }}>
                HEADPHONES RECOMMENDED · SOUND IS PART OF THE STORY
                {canPlay && !audioReady && !audioErr ? " · SCORE SYNTHESIZING — IT FADES IN AUTOMATICALLY" : ""}
              </p>
            </div>
          )}

          {/* controls */}
          {started && (
            <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10 transition-opacity ${ui.playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
              <div className="relative h-5 cursor-pointer touch-none" onPointerDown={scrub}>
                <div className="absolute inset-x-0 top-2 h-1.5 rounded-full bg-white/20" />
                <div className="absolute left-0 top-2 h-1.5 rounded-full bg-[#ff7a2f]" style={{ width: `${(ui.t / DURATION) * 100}%` }} />
                {SCENES.slice(1).map((s) => (
                  <div key={s.id} className="absolute top-1.5 h-2.5 w-px bg-white/60" style={{ left: `${(s.start / DURATION) * 100}%` }} />
                ))}
                <div className="absolute top-0.5 h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow" style={{ left: `${(ui.t / DURATION) * 100}%` }} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm" style={{ fontFamily: '"Space Mono", monospace' }}>
                <button onClick={toggle} className="w-8 text-xl hover:text-[#ffb27a]">{ui.playing ? "❚❚" : "▶"}</button>
                <span className="tabular-nums text-[#cfeee3]">{tc(ui.t).slice(3)} / 05:00</span>
                <span className="hidden text-[#ffb27a] md:inline">{cur.label}</span>
                <div className="ml-auto flex items-center gap-3">
                  <button onClick={() => setCaps((v) => !v)} className={`rounded border px-2 py-0.5 text-xs ${caps ? "border-[#ffb27a] text-[#ffb27a]" : "border-white/30 text-white/50"}`}>CC</button>
                  <input type="range" min={0} max={1} step={0.01} value={vol} onChange={(e) => setVol(parseFloat(e.target.value))} className="w-20 accent-[#ff7a2f]" />
                  <button onClick={fullscreen} className="text-lg hover:text-[#ffb27a]">⛶</button>
                </div>
              </div>
            </div>
          )}

          {recording && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded bg-black/70 px-3 py-1 text-xs text-red-300" style={{ fontFamily: '"Space Mono", monospace' }}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> RECORDING VIDEO · {tc(ui.t).slice(3)} / 05:00
            </div>
          )}
        </div>

        {/* actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" style={{ fontFamily: '"Space Mono", monospace' }}>
          <button
            disabled={!canPlay || !audioReady || recording}
            onClick={startRecord}
            className="rounded border border-[#ff7a2f]/70 px-4 py-2 text-[#ffb27a] transition hover:bg-[#ff7a2f]/15 disabled:opacity-40"
          >
            ● Record episode to video (.webm · 5:00 real-time)
          </button>
          <button disabled={!audioReady} onClick={exportWav} className="rounded border border-white/25 px-4 py-2 text-[#cfeee3] transition hover:bg-white/10 disabled:opacity-40">
            ↓ Score (.wav)
          </button>
          <span className="text-xs text-[#6f9d90]">
            {audioErr ? "Audio engine unavailable — video plays silent." : audioReady ? "Score synthesized · stereo." : "Rendering score offline…"}
          </span>
        </div>
      </div>

      {/* ---------------- story */}
      <main className="mx-auto mt-12 grid max-w-[1500px] gap-10 px-5 pb-24 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <h2 className="mb-1 text-4xl tracking-wide" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>Episode 01 — The Green Silence</h2>
          <p className="mb-6 max-w-2xl text-[#a9cfc3]">
            Maya Tavares, a sound ecologist, is swept off her river skiff and wakes alone on a sandbar in the Amazon. Her only tools are a recorder with 11% battery
            and a lifetime of listening. Each trial in the jungle can only be solved by hearing what the forest is already saying — and in the end, she
            realises the forest isn't the only thing talking to her.
          </p>
          <ol className="space-y-1.5">
            {SCENES.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    seekTo(s.start);
                    if (!A.current.playing && canPlay) play(s.start);
                    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="group flex w-full items-baseline gap-4 rounded border border-white/5 bg-white/[0.02] px-4 py-2.5 text-left transition hover:border-[#ff7a2f]/50 hover:bg-[#ff7a2f]/[0.06]"
                >
                  <span className="w-12 shrink-0 text-xs text-[#ff9a5c]" style={{ fontFamily: '"Space Mono", monospace' }}>{tc(s.start).slice(3)}</span>
                  <span className="w-60 shrink-0 text-lg tracking-wide" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>{s.label}</span>
                  <span className="text-sm text-[#8fb8ab]">{SYNOPSIS[s.id]}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-1 text-4xl tracking-wide" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>How it was made</h2>
          <p className="mb-5 text-sm text-[#a9cfc3]">
            Built with the “render contract” method: Claude doesn't output a video, it writes a program. The film is directed with a shot-by-shot brief, drawn in
            canvas on top of painted key art, and the score is synthesized offline from code. No clock, no unseeded randomness.
          </p>
          <div className="divide-y divide-white/10 rounded border border-white/10 bg-white/[0.02]" style={{ fontFamily: '"Space Mono", monospace' }}>
            {BRIEF.map(([k, v]) => (
              <button key={k} onClick={() => setOpen(open === k ? null : k)} className="block w-full px-4 py-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.3em] text-[#ff9a5c]">{k}</span>
                  <span className="text-[#6f9d90]">{open === k ? "–" : "+"}</span>
                </div>
                {open === k && <p className="mt-1.5 text-[13px] leading-relaxed text-[#cfeee3]">{v}</p>}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-[#9fd8c7]" style={{ fontFamily: '"Space Mono", monospace' }}>
            <div className="mb-1 text-[#ffb27a]">EXPORT A FRAME-EXACT MP4</div>
            <div>1 · npm run build &amp;&amp; npm run preview</div>
            <div>2 · save the score with “↓ Score (.wav)”</div>
            <div>3 · node public/tools/render.mjs http://localhost:4173 300 60</div>
            <div>4 · ffmpeg -i out/silent.mp4 -i score.wav -c:v copy -c:a aac out/ep1.mp4</div>
            <div className="mt-2 text-[#6f9d90]">Freeze any frame: <span className="text-[#cfeee3]">/?t=134.5</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
