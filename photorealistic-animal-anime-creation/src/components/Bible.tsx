import { useState } from "react";
import { CAST, SCENES, SERIES, SPEAKER_COLOR, TOTAL, fmt } from "../story/script";

const seek = (t: number) => {
  document.getElementById("watch")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => window.dispatchEvent(new CustomEvent("gerald-seek", { detail: t })), 350);
};

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function scriptMarkdown() {
  let md = `# GERALD IS FINE — Episode 01: Terms & Conditions\nRuntime ${fmt(TOTAL)} · dark comedy · 12 scenes\n\n`;
  for (const s of SCENES) {
    md += `## Scene ${s.n}: ${s.title}  [${fmt(s.start)}–${fmt(s.start + s.dur)}]\n`;
    md += `**Scene description:** ${s.desc}\n\n**Emotional tone:** ${s.tone}\n\n`;
    for (const l of s.lines) md += `- ${l.speaker}${l.speaker === "NARRATOR" ? " (narrator line)" : ""} @${fmt(s.start + l.at)}: "${l.text}"  \n  _direction: ${l.dir}_\n`;
    md += `\n**Midjourney:** ${s.mj}\n\n**Runway:** ${s.runway}\n\n**Suno:** ${s.suno}\n\n---\n\n`;
  }
  return md;
}

const STEPS = [
  { n: "01", tool: "Claude", job: "Script", did: "Wrote 12 scenes in the post's format (scene description · dialogue · narrator · tone) at 30 to 45 seconds each, ending on a cliffhanger.", here: "src/story/script.ts", color: "#ffd84d" },
  { n: "02", tool: "Midjourney", job: "Characters", did: "Base / action / emotional prompt templates per scene. In this build the character is not an image: it's a procedural, photoreal opossum with 30-shell GPU fur.", here: "engine/opossum.ts · fur.ts", color: "#ff4d8d" },
  { n: "03", tool: "Runway", job: "Animate", did: "Motion prompts per scene become real camera moves: pushes, cranes, rack focus, handheld drift, impact shake, whiteouts.", here: "engine/stage.ts", color: "#7dffc4" },
  { n: "04", tool: "ElevenLabs", job: "Voice", did: "Every line carries performance direction (pauses, whispers, breaks). Playback uses your browser's speech engine, with different pitch and rate per character.", here: "engine/audio.ts", color: "#c6ff3d" },
  { n: "05", tool: "Suno", job: "Music", did: "Nine generative cues: drones, piano motifs, taiko, glitch ticks, rain, fluorescent hum. All synthesized live with WebAudio.", here: "engine/audio.ts", color: "#ff9a5c" },
  { n: "06", tool: "Make", job: "Publish", did: "The director clock fires every voice line, SFX and music cue on a timeline. Export the script as Markdown to feed your own pipeline.", here: "engine/director.ts", color: "#6aa0ff" },
];

const MAKE = [
  "Schedule: Tue + Fri 9am",
  "Pull new script from Drive",
  "Send scene list → Midjourney",
  "Download images to Drive",
  "Dialogue → ElevenLabs",
  "Download audio",
  "Assemble in CapCut template",
  "Upload to YouTube",
  "Post clip to X + Telegram stats",
];

export default function Bible() {
  const [sel, setSel] = useState(0);
  const s = SCENES[sel];
  const [copied, setCopied] = useState("");
  const copy = (k: string, v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(""), 1200);
  };

  const Prompt = ({ id, label, color, text }: { id: string; label: string; color: string; text: string }) => (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold tracking-[0.3em]" style={{ color }}>{label}</span>
        <button onClick={() => copy(id, text)} className="font-mono text-[10px] tracking-widest text-white/40 hover:text-acid">
          {copied === id ? "COPIED" : "COPY"}
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-white/75">{text}</p>
    </div>
  );

  return (
    <>
      {/* marquee */}
      <div className="mt-20 overflow-hidden border-y border-white/10 bg-acid py-3 text-ink">
        <div className="anim-marquee flex w-max gap-10 whitespace-nowrap font-mono text-sm font-bold tracking-[0.3em]">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-10">
              {["I'M NOT DEAD, I'M UNAVAILABLE", "DAY 1,204 OF BEING FINE", "LIVES LIVED: ZERO", "BAD AT LIVING, LOUDLY", "CLAUSE 14(B)", "THE WI-FI IN OPTION A IS TERRIBLE", "NATURE IS HEALING"].map((t) => (
                <span key={t}>{t} ✺</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* PIPELINE */}
      <section id="pipeline" className="mx-auto max-w-[1300px] px-5 pt-24">
        <SectionHead kicker="THE FACTORY" title="Six tools. One pipeline." sub="This episode follows the AI-anime-factory framework: script → characters → animate → voice → music → publish. Here every stage is code, so it all runs in your browser." />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((p) => (
            <div key={p.n} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/30">
              <div className="absolute -right-3 -top-6 font-sans text-[110px] font-bold leading-none opacity-[0.07]" style={{ color: p.color }}>{p.n}</div>
              <div className="font-mono text-[10px] tracking-[0.3em]" style={{ color: p.color }}>{p.job.toUpperCase()}</div>
              <div className="mt-1 text-2xl font-bold">{p.tool}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{p.did}</p>
              <div className="mt-3 font-mono text-[10px] tracking-wider text-white/35">↳ {p.here}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-acid">PROMPT LAB</div>
              <h3 className="font-serif text-3xl italic">Every scene, in the factory format</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => download("gerald-is-fine-ep01.md", scriptMarkdown(), "text/markdown")} className="rounded-full border border-white/20 px-4 py-2 font-mono text-[11px] tracking-widest hover:border-acid hover:text-acid">
                ↓ SCRIPT .MD
              </button>
              <button onClick={() => download("gerald-is-fine-ep01.json", JSON.stringify(SCENES.map(({ shots, fx, sfx, ...rest }) => ({ ...rest, shotCount: shots.length, fx, sfx })), null, 2), "application/json")} className="rounded-full border border-white/20 px-4 py-2 font-mono text-[11px] tracking-widest hover:border-acid hover:text-acid">
                ↓ SHOT LIST .JSON
              </button>
            </div>
          </div>
          <div className="scroll-thin mt-5 flex gap-1.5 overflow-x-auto pb-2">
            {SCENES.map((x, i) => (
              <button key={x.n} onClick={() => setSel(i)} className={`shrink-0 rounded-full px-3.5 py-1.5 font-mono text-xs transition ${i === sel ? "bg-acid font-bold text-ink" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
                {String(x.n).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/40 p-4 lg:row-span-2">
              <div className="font-mono text-[10px] font-bold tracking-[0.3em] text-gold">01 · CLAUDE SCRIPT · {s.title.toUpperCase()}</div>
              <p className="mt-2 text-[13px] text-white/70"><b className="text-white/90">Scene:</b> {s.desc}</p>
              <p className="mt-2 text-[13px] text-white/70"><b className="text-white/90">Tone:</b> {s.tone}</p>
              <ul className="mt-3 space-y-2">
                {s.lines.map((l, i) => (
                  <li key={i} className="text-[13px] leading-snug">
                    <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: SPEAKER_COLOR[l.speaker] }}>{l.speaker}</span>
                    <span className="text-white/85"> “{l.text}”</span>
                    <div className="mt-0.5 font-mono text-[10px] text-white/35">◂ ElevenLabs: {l.dir}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-white/10 pt-3 font-mono text-[10px] text-white/40">
                ElevenLabs settings → Stability 0.35 · Similarity 0.85 · Style 0.40 · Speaker boost ON
              </div>
            </div>
            <Prompt id="mj" label="02 · MIDJOURNEY" color="#ff4d8d" text={s.mj} />
            <Prompt id="rw" label="03 · RUNWAY" color="#7dffc4" text={s.runway} />
            <div className="lg:col-span-2">
              <Prompt id="su" label="05 · SUNO" color="#ff9a5c" text={s.suno} />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="font-mono text-[10px] tracking-[0.3em] text-white/40">06 · MAKE SCENARIO</div>
          <ol className="scroll-thin mt-3 flex gap-2 overflow-x-auto pb-2">
            {MAKE.map((m, i) => (
              <li key={m} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-xs text-white/70">
                <span className="font-mono text-acid">{i}</span>
                {m}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CAST */}
      <section id="cast" className="mx-auto max-w-[1300px] px-5 pt-28">
        <SectionHead kicker="CHARACTER DEVELOPMENT" title="Four voices. One breakdown." sub="Everyone starts as a joke and ends up with a want, a flaw and an arc." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {CAST.map((c) => (
            <article key={c.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="pointer-events-none absolute -right-4 -top-10 select-none font-sans text-[200px] font-bold leading-none opacity-[0.06]" style={{ color: c.color }}>{c.glyph}</div>
              <div className="font-mono text-[10px] tracking-[0.3em]" style={{ color: c.color }}>{c.role.toUpperCase()}</div>
              <h3 className="mt-1 text-4xl font-bold tracking-tight">{c.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{c.bio}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                {([["WANTS", c.want], ["NEEDS", c.need], ["FLAW", c.flaw]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-black/40 p-3">
                    <div className="font-mono text-[9px] tracking-[0.25em] text-white/35">{k}</div>
                    <div className="mt-1 leading-snug text-white/80">{v}</div>
                  </div>
                ))}
              </div>
              <ol className="mt-4 space-y-2 border-l border-white/15 pl-4">
                {c.arc.map((a, i) => (
                  <li key={i} className="relative text-[13px] leading-snug text-white/70">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {a}
                  </li>
                ))}
              </ol>
              <div className="mt-4 font-mono text-[10px] leading-relaxed text-white/35">VOICE · {c.voice}</div>
              <div className="mt-1 font-mono text-[10px] leading-relaxed text-white/35">MJ · {c.mj}</div>
            </article>
          ))}
        </div>
      </section>

      {/* SCRIPT */}
      <section id="script" className="mx-auto max-w-[1000px] px-5 pt-28">
        <SectionHead kicker="THE FULL SCRIPT" title="Click any line to jump to it." sub="Twelve scenes, 6:00 flat. Every timecode is wired to the player." />
        <div className="mt-10 space-y-10">
          {SCENES.map((sc) => (
            <div key={sc.n}>
              <button onClick={() => seek(sc.start)} className="group flex w-full items-baseline gap-4 border-b border-white/15 pb-2 text-left">
                <span className="font-mono text-xs text-acid">{String(sc.n).padStart(2, "0")}</span>
                <span className="font-serif text-3xl italic group-hover:text-acid">{sc.title}</span>
                <span className="ml-auto font-mono text-[11px] text-white/35">{fmt(sc.start)}</span>
              </button>
              <ul className="mt-3 space-y-1">
                {sc.lines.map((l, i) => (
                  <li key={i}>
                    <button onClick={() => seek(sc.start + l.at)} className="grid w-full grid-cols-[52px_96px_1fr] items-baseline gap-3 rounded px-2 py-1.5 text-left hover:bg-white/5">
                      <span className="font-mono text-[11px] text-white/30">{fmt(sc.start + l.at)}</span>
                      <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: SPEAKER_COLOR[l.speaker] }}>{l.speaker}</span>
                      <span className={`text-[15px] leading-snug text-white/85 ${l.speaker === "NARRATOR" ? "font-serif italic" : ""}`}>{l.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SERIES */}
      <section id="series" className="mx-auto max-w-[1300px] px-5 pt-28">
        <SectionHead kicker="THE SERIES" title="Twelve episodes. One opossum." sub="Episode 1 is playable above. The rest of Season 1 is outlined and ready to run through the factory." />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERIES.map((e) => (
            <div key={e.ep} className={`rounded-xl border p-4 ${e.ep === 1 ? "border-acid bg-acid/10" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em]">
                <span className={e.ep === 1 ? "text-acid" : "text-white/40"}>EP {String(e.ep).padStart(2, "0")}</span>
                <span className="text-white/40">{e.status.toUpperCase()}</span>
              </div>
              <div className="mt-2 text-lg font-bold leading-tight">{e.title}</div>
              <p className="mt-1.5 text-[13px] leading-snug text-white/55">{e.log}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto mt-32 max-w-[1300px] border-t border-white/10 px-5 py-10 font-mono text-[11px] tracking-wider text-white/35">
        GERALD IS FINE · Ep. 01 · Procedural fur, fog and feelings. No actual opossums were harmed (several were faked).
      </footer>
    </>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.4em] text-hot">{kicker}</div>
      <h2 className="mt-2 text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-white/55">{sub}</p>
    </div>
  );
}
