import { useState } from "react";
import { OBJECTS, OCCUPANTS, PRINCIPALS, type Dossier } from "../story/characters";
import { Lineup, Portrait } from "./Figures";

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-[#e4d9ef]/90">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d23a2a]" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-[#ff8a7a]">{children}</h4>;
}

function Dossier({ d }: { d: Dossier }) {
  const core: [string, string | undefined][] = [
    ["Want", d.want],
    ["Wound", d.wound],
    ["False belief", d.belief],
    ["Need", d.need],
  ];
  return (
    <article className="grid gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[300px_1fr] md:p-8">
      <div>
        <Portrait cast={d.cast} className="w-full rounded-xl border border-white/10" />
        <div className="mt-4 space-y-1 font-mono text-xs text-[#cdbfe0]">
          <div><span className="text-[#ff8a7a]">AGE</span> · {d.age}</div>
          <div><span className="text-[#ff8a7a]">HEIGHT</span> · {d.metres.toFixed(2)} m</div>
          {d.room && <div><span className="text-[#ff8a7a]">ROOM</span> · {d.room}</div>}
        </div>
      </div>
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#b9a2d8]">{d.group === "principal" ? "Principal" : "Folded occupant"}</div>
        <h3 className="mt-1 font-serif text-4xl text-[#f7f0de]">{d.name}</h3>
        {d.aka && <div className="mt-1 text-[#cdbfe0]">{d.aka}</div>}
        <p className="mt-3 text-sm text-[#d9cbe8]/80">{d.role}</p>
        <blockquote className="mt-4 border-l-2 border-[#d23a2a] pl-4 font-serif text-xl italic leading-snug text-[#f1e9d6]">{d.hook}</blockquote>

        <H>Appearance</H>
        <List items={d.appearance} />
        <H>Signature objects</H>
        <List items={d.signature} />
        {d.group === "principal" && (
          <>
            <H>Sound & voice</H>
            <p className="text-[15px] leading-relaxed text-[#e4d9ef]/90">{d.sound}</p>
          </>
        )}
        {core.some(([, v]) => v) && (
          <>
            <H>Drive</H>
            <div className="grid gap-3 sm:grid-cols-2">
              {core.map(([k, v]) =>
                v ? (
                  <div key={k} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#f3c22f]">{k}</div>
                    <p className="mt-1 text-sm leading-relaxed text-[#e4d9ef]/90">{v}</p>
                  </div>
                ) : null,
              )}
            </div>
          </>
        )}
        <H>History</H>
        <p className="text-[15px] leading-relaxed text-[#e4d9ef]/90">{d.history}</p>
        <H>Tells</H>
        <List items={d.tells} />
        {d.relationships.length > 0 && (
          <>
            <H>Relationships</H>
            <div className="space-y-2">
              {d.relationships.map((r) => (
                <p key={r.who} className="text-[15px] leading-relaxed text-[#e4d9ef]/90">
                  <span className="font-semibold text-[#f7f0de]">{r.who}.</span> {r.text}
                </p>
              ))}
            </div>
          </>
        )}
        <H>Arc across the season</H>
        <div className="space-y-2">
          {d.arc.map((a) => (
            <div key={a.ep} className="grid grid-cols-[64px_1fr] gap-3 text-[15px] leading-relaxed">
              <span className="font-mono text-xs text-[#ff8a7a]">{a.ep}</span>
              <span className="text-[#e4d9ef]/90">{a.text}</span>
            </div>
          ))}
        </div>
        {d.group === "principal" && (
          <>
            <H>Writer rules</H>
            <List items={d.rules} />
            <H>Animation notes</H>
            <List items={d.animation} />
          </>
        )}
      </div>
    </article>
  );
}

export default function Cast() {
  const [sel, setSel] = useState("orrin");
  const all = [...PRINCIPALS, ...OCCUPANTS];
  const d = all.find((x) => x.id === sel)!;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8">
      <header className="mb-8 max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#ff8a7a]">Cast & character bible</div>
        <h2 className="mt-2 font-serif text-5xl text-[#f7f0de]">Twelve people, one voice</h2>
        <p className="mt-4 text-[#d9cbe8]/85">
          Four principals and eight folded occupants — each with a different silhouette, skill, object and way of being quiet. Only Orrin Voss is ever intelligibly heard; everyone else acts with hands, tools, breath and fabric. Select anyone below for a full dossier.
        </p>
      </header>
      <Lineup />
      <p className="mt-2 text-xs text-[#b9a2d8]">Drawn at relative scale. Yellow ages = principals. Room tags: F-1 linen annex, F-2 Flat 4C, F-3 Room 2-07.</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {all.map((x) => (
          <button
            key={x.id}
            onClick={() => setSel(x.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${sel === x.id ? "border-[#d23a2a] bg-[#d23a2a]/15 text-white" : "border-white/10 text-[#cdbfe0] hover:border-white/30"}`}
          >
            {x.name.replace("Josephine ‘Josie’ Adeyemi", "Josie Adeyemi")}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <Dossier d={d} />
      </div>

      <h3 className="mb-4 mt-14 font-serif text-3xl text-[#f7f0de]">Nine people, three rooms</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["F-1 · linen annex & night lodge", "Tobias Kessing (porter), Ruta Vaitkus, Dev Malhotra", "First transfer. Warm greys and teals. A coat, a red lunch tin, headphones."],
          ["F-2 · Flat 4C", "Samir, Noor and Yusra Haddad", "Second transfer. Blues and mustard. A work cap, a headset, one red child’s shoe."],
          ["F-3 · Room 2-07 (sewing room)", "Lenna Voss, Josie Adeyemi, Anselm Park", "Third transfer. Indigo and rose. A cane, a medical bag, a red pincushion with yellow thread."],
        ].map(([t, who, d2]) => (
          <div key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#ff8a7a]">{t}</div>
            <div className="mt-2 font-serif text-lg text-[#f7f0de]">{who}</div>
            <p className="mt-2 text-sm text-[#d9cbe8]/80">{d2}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-[#b9a2d8]">No surprise extra occupant, no corpse for a last-second emotional cheat. Nine in, nine out.</p>

      <h3 className="mb-4 mt-14 font-serif text-3xl text-[#f7f0de]">Objects that act like characters</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {OBJECTS.map((o) => (
          <div key={o.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="font-serif text-xl text-[#f7f0de]">{o.name}</div>
            <p className="mt-2 text-sm text-[#e4d9ef]/90">{o.what}</p>
            <p className="mt-2 text-xs text-[#f3c22f]">{o.rules}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
