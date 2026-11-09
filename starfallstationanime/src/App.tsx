import { useCallback, useEffect, useRef, useState } from 'react';
import { createRenderer, SHOTS, Renderer } from './film/engine';
import { renderScore, bufferToWav } from './film/audio';
import { DURATION, FPS } from './film/util';
import { RENDER_MJS } from './film/renderScript';

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const BRIEF = [
  ['GOAL', 'A two-minute anime short that feels like a studio film: a girl carries a fallen star home across a mirror sea. Quiet, wide, lyrical. Hope after loss.'],
  ['FORMAT', 'One self-contained page. 1920×804 (2.39:1), 120 s × 24 fps = 2880 frames. Every frame is a pure function of t. window.seek(t). No clock, no Math.random: all randomness seeded.'],
  ['BEAT', '96 BPM, 1 beat = 0.625 s, 1 bar = 2.5 s. Theme in B minor, resolving to D major. The star docks on the beat at 1:32.5; twelve sockets ignite on ascending notes.'],
  ['LOOK', 'Painted skies (Shinkai-style plates) + code-drawn cel characters on twos (12 fps). Palette: blue hour → gold → violet → dawn rose, one accent: scarf red E8584A. Bloom, grain, vignette, 2.39:1.'],
  ['SHOTS', 'Twelve shots, one hero move each, every cut a decision (see the shot list).'],
  ['MOTION', 'Camera: ease-in-out sine/cubic/quart. Character: hair and scarf animated on twos. Ambient: slow sines, never stops. Secondary moves lag the hero.'],
  ['BANNED', 'Default gradients without a plate, floating particles as the only decoration, everything fading in at once, centered-everything layouts, text that moves while you read it.'],
  ['CHECK', 'Stills at named frames, fix, then the full render. Frame 0 is black; frame 2879 is black.'],
];

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const R = useRef<Renderer | null>(null);
  const score = useRef<AudioBuffer | null>(null);
  const ac = useRef<AudioContext | null>(null);
  const src = useRef<AudioBufferSourceNode | null>(null);
  const offset = useRef(0);
  const startAt = useRef(0);
  const lastFrame = useRef(-1);
  const exporting = useRef(false);
  const [status, setStatus] = useState('Painting the skies…');
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tA = performance.now();
        const r = await createRenderer();
        console.info('renderer ms', Math.round(performance.now() - tA));
        if (!alive) return;
        R.current = r;
        r.canvas.style.width = '100%';
        r.canvas.style.height = 'auto';
        r.canvas.style.display = 'block';
        host.current?.appendChild(r.canvas);
        const w = window as unknown as Record<string, unknown>;
        w.seek = (t: number) => {
          lastFrame.current = -1;
          r.render(t);
        };
        r.render(0);
        setStatus('Composing the score…');
        const tB = performance.now();
        const s = await renderScore((p) => setStatus(`Composing the score… ${Math.round(p * 100)}%`));
        console.info('score ms', Math.round(performance.now() - tB));
        if (!alive) return;
        score.current = s;
        w.getScoreWav = async () => {
          const blob = bufferToWav(s);
          const buf = new Uint8Array(await blob.arrayBuffer());
          let bin = '';
          for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          return btoa(bin);
        };
        w.__ready = true;
        const q = new URLSearchParams(location.search);
        if (q.has('t')) r.render(parseFloat(q.get('t')!));
        setReady(true);
      } catch (e) {
        console.error(e);
        setStatus('Something went wrong while loading: ' + String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const draw = useCallback((t: number) => {
    const f = Math.floor(t * FPS);
    if (f !== lastFrame.current && R.current) {
      lastFrame.current = f;
      R.current.render(t);
    }
  }, []);

  const stopSrc = () => {
    try {
      src.current?.stop();
    } catch {
      /* already stopped */
    }
    src.current = null;
  };

  const startAudio = useCallback((from: number) => {
    if (!ac.current) ac.current = new AudioContext({ sampleRate: 44100 });
    const a = ac.current;
    void a.resume();
    stopSrc();
    const s = a.createBufferSource();
    s.buffer = score.current;
    s.connect(a.destination);
    s.start(0, from);
    src.current = s;
    startAt.current = a.currentTime;
    offset.current = from;
  }, []);

  const play = useCallback(() => {
    if (!ready) return;
    if (offset.current >= DURATION - 0.2) offset.current = 0;
    setStarted(true);
    startAudio(offset.current);
    setPlaying(true);
  }, [ready, startAudio]);

  const pause = useCallback(() => {
    if (ac.current) offset.current = Math.min(DURATION, offset.current + (ac.current.currentTime - startAt.current));
    stopSrc();
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = ac.current!;
      const t = offset.current + (a.currentTime - startAt.current);
      if (t >= DURATION) {
        offset.current = DURATION;
        setTime(DURATION);
        draw(DURATION - 1 / FPS);
        stopSrc();
        setPlaying(false);
        return;
      }
      draw(t);
      setTime(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, draw]);

  const seek = (t: number) => {
    t = Math.max(0, Math.min(DURATION - 1 / FPS, t));
    offset.current = t;
    setTime(t);
    lastFrame.current = -1;
    draw(t);
    if (playing) startAudio(t);
  };

  const exportWebM = async () => {
    if (!R.current || !score.current || exporting.current) return;
    exporting.current = true;
    pause();
    setBusy('Recording in real time (2:00)… keep this tab open');
    const a = ac.current ?? (ac.current = new AudioContext({ sampleRate: 44100 }));
    await a.resume();
    const dest = a.createMediaStreamDestination();
    const s = a.createBufferSource();
    s.buffer = score.current;
    s.connect(dest);
    const stream = R.current.canvas.captureStream(FPS);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 18_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((res) => (rec.onstop = () => res()));
    rec.start(1000);
    const t0 = a.currentTime + 0.1;
    s.start(t0);
    await new Promise<void>((res) => {
      const loop = () => {
        const t = a.currentTime - t0;
        if (t >= DURATION) return res();
        if (t >= 0) {
          draw(t);
          setTime(t);
        }
        requestAnimationFrame(loop);
      };
      loop();
    });
    rec.stop();
    await done;
    download(new Blob(chunks, { type: 'video/webm' }), 'starfall-station.webm');
    exporting.current = false;
    setBusy('');
    seek(0);
  };

  const exportWav = () => score.current && download(bufferToWav(score.current), 'starfall-station-score.wav');
  const cur = SHOTS.findIndex((s) => time >= s.s && time < s.e);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen();
  };

  return (
    <div className="min-h-screen bg-[#05060f] text-slate-200" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 sm:px-8">
        <header className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200/60">An animated short · 2:00 · rendered entirely in code</p>
            <h1 className="mt-1 text-2xl font-light tracking-[0.18em] text-amber-50 sm:text-3xl" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}>
              STARFALL STATION
            </h1>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">Best with sound on · fullscreen recommended</p>
        </header>

        <div ref={stage} className="relative overflow-hidden rounded-xl bg-black shadow-[0_0_80px_rgba(120,100,255,0.15)] ring-1 ring-white/10">
          <div ref={host} />
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05060f]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-200/20 border-t-amber-200" />
              <p className="mt-4 text-sm tracking-widest text-amber-100/70">{status}</p>
            </div>
          )}
          {ready && !started && (
            <button
              onClick={play}
              className="group absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#05060f]/70 via-[#05060f]/40 to-[#05060f]/80 backdrop-blur-[2px]"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-100/50 bg-amber-100/10 transition group-hover:scale-110 group-hover:bg-amber-100/20">
                <svg viewBox="0 0 24 24" className="ml-1 h-9 w-9 fill-amber-50">
                  <path d="M6 4l14 8-14 8z" />
                </svg>
              </span>
              <span className="mt-6 text-xs uppercase tracking-[0.4em] text-amber-50/80">Play the film</span>
              <span className="mt-2 text-[11px] tracking-widest text-slate-400">sound on</span>
            </button>
          )}
          {busy && (
            <div className="absolute inset-x-0 top-0 bg-amber-300/90 px-4 py-2 text-center text-sm font-medium text-slate-900">{busy}</div>
          )}
          {ready && started && (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 opacity-0 transition hover:opacity-100 focus-within:opacity-100">
              <button onClick={playing ? pause : play} className="rounded-full p-2 hover:bg-white/10" aria-label={playing ? 'Pause' : 'Play'}>
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
                  {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M6 4l14 8-14 8z" />}
                </svg>
              </button>
              <span className="w-24 text-xs tabular-nums text-slate-300">
                {fmt(time)} / {fmt(DURATION)}
              </span>
              <input
                type="range"
                min={0}
                max={DURATION}
                step={1 / FPS}
                value={time}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="h-1 flex-1 cursor-pointer accent-amber-200"
              />
              <button onClick={fullscreen} className="rounded-full p-2 hover:bg-white/10" aria-label="Fullscreen">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* transport (always visible) */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button
            disabled={!ready}
            onClick={playing ? pause : play}
            className="rounded-full bg-amber-200 px-5 py-2 font-medium text-slate-900 transition hover:bg-amber-100 disabled:opacity-40"
          >
            {playing ? 'Pause' : time > 0 && time < DURATION ? 'Resume' : 'Play'}
          </button>
          <input
            type="range"
            min={0}
            max={DURATION}
            step={1 / FPS}
            value={time}
            disabled={!ready}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="min-w-[200px] flex-1 accent-amber-200"
          />
          <span className="w-28 text-right tabular-nums text-slate-400">
            {fmt(time)} / {fmt(DURATION)}
          </span>
          <button onClick={fullscreen} className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10">
            Fullscreen
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section>
            <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-amber-200/70">Shot list</h2>
            <ol className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
              {SHOTS.map((s, i) => (
                <li key={s.name}>
                  <button
                    disabled={!ready}
                    onClick={() => seek(s.s)}
                    className={`flex w-full items-center gap-4 px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${i === cur ? 'bg-amber-200/10 text-amber-50' : 'text-slate-300'}`}
                  >
                    <span className="w-6 text-xs tabular-nums text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {fmt(s.s)}–{fmt(s.e)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <h2 className="mb-3 mt-8 text-xs uppercase tracking-[0.3em] text-amber-200/70">Take it with you</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <button disabled={!ready || !!busy} onClick={exportWebM} className="rounded-lg border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-amber-50 hover:bg-amber-200/20 disabled:opacity-40">
                Record WebM (real-time, with sound)
              </button>
              <button disabled={!ready} onClick={exportWav} className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10 disabled:opacity-40">
                Score (.wav)
              </button>
              <button onClick={() => download(new Blob([RENDER_MJS], { type: 'text/javascript' }), 'render.mjs')} className="rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10">
                render.mjs (frame-exact MP4)
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              The WebM records the live canvas and score in real time. For a frame-exact 24 fps MP4, run <code className="text-slate-300">render.mjs</code> against the built page: it calls{' '}
              <code className="text-slate-300">window.seek(t)</code> for frames 0–2879, pipes them to ffmpeg, and muxes the synthesised score.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-amber-200/70">The brief (directed prompt)</h2>
            <dl className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm">
              {BRIEF.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[72px_1fr] gap-3">
                  <dt className="pt-0.5 text-[11px] font-semibold tracking-[0.2em] text-amber-200/80">{k}</dt>
                  <dd className="leading-relaxed text-slate-300">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Painted skies are generated plates. Everything else is code: the mirror sea (strip-displaced reflections), the train, Mio, the eye, the star-loom, the stars, the clouds, the bloom and grain, and the music.
              Open this page with <code className="text-slate-300">?t=93</code> to freeze any moment.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
