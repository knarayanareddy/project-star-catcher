const RULES = [
  ["Folding acts through a physical frame and motor.", "A form authorizes the machine; a form does not erase a person or space."],
  ["Rooms remain real and occupied while stored.", "Doors and windows compress to seams. No full-sized person fits through a folded threshold."],
  ["Storage is temporary.", "Air and utilities flow only while the storage frame is connected. At dawn a scheduled purge disconnects and crushes the stored modules. That is the lethal threat — no separate oxygen deadline."],
  ["Volume must be accounted for.", "Unfolding three rooms requires three matching empty receiving bays. No speech or sacrifice makes an extra room appear."],
  ["The display suite occupies the original three receiving bays.", "Its finishes and staging furniture must be cleared. The approved emergency-receiver designation survives under a marketing overlay."],
  ["A mechanical transfer lock routes rooms.", "Orrin’s survey key can inspect it, not authorize it. A sealed control prevents unauthorized transfer; breaking the seal is visible and recorded."],
  ["Manual release needs three things.", "Alignment, an external operator, and an internal clear latch. It cannot be done by one heroic button press — which is why the residents matter."],
  ["Memory is unaffected.", "People remember the missing residents. Official records omit occupancy; reality has not erased relationships."],
  ["Reports are evidence, not magic.", "Orrin’s voice preserves names, events and instructions. It cannot hold a wall open. The physical bypass must be disconnected to stop the purge."],
  ["Only Orrin is intelligibly heard.", "Others may breathe or make nonverbal sounds. No whispered explanations, intercoms or recorded voices by another actor."],
];

const MOTIFS: [string, string][] = [
  ["Red correction lines", "Orrin’s own hand marking a wrong figure. Also the wipe at every hard cut in this build."],
  ["Half-flowers on wallpaper", "A flower cut in two by an absent doorway: the lattice continues, the room does not."],
  ["Three service tugs", "Dry fabric rasp. ‘I am here’ — never a sentence."],
  ["The hollow fruit bowl", "Plaster pears, painted books: a life-shaped suite built from the space that should have kept real lives."],
  ["White dust that falls sideways", "Only near compressed frames. The air’s direction tells you the hardware is near."],
  ["The missing inch", "Lenna’s tape is short by one inch; every measurement has to say so."],
];

const PALETTE: [string, string, string][] = [
  ["Municipal cream", "#efe5cd", "The Department, forms, corridors"],
  ["Correction red", "#d23a2a", "Orrin’s marks; danger; the purge"],
  ["Storage violet", "#4a2f6c", "Folded space, shaft, hardware proximity"],
  ["Lenna’s yellow", "#f3c22f", "Thread, care, the ninth tally"],
  ["Wallpaper sage", "#b9bf9f", "Calder Court’s corridors"],
  ["Attendant white", "#f7f6f1", "Procedure, gloves, cloths"],
];

export default function Bible() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8">
      <header className="max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#ff8a7a]">Series bible · the world</div>
        <h2 className="mt-2 font-serif text-5xl text-[#f7f0de]">The Department of Missing Rooms</h2>
        <p className="mt-3 font-serif text-2xl italic text-[#f3c22f]">You have not been evicted. Your home has been corrected.</p>
        <p className="mt-5 text-[#e4d9ef]/90">
          In a city that folds inconvenient rooms into storage, an obedient housing surveyor finds his sister’s sewing room missing from a building he approved. Before its temporary storage is purged at dawn, he must move three occupied rooms into the luxury display suite occupying their emergency receiving bays — and preserve proof that the people inside were never an accounting error.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Architectural horror", "Supplies the threat. The trippy imagery comes from spatial compression, never random hallucination."],
          ["Dystopian satire", "Explains who benefits: efficiency as fairness; the uncounted removed from the denominator."],
          ["Sibling rescue", "The emotional through-line. Lenna doesn’t automatically forgive Orrin."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="font-serif text-xl text-[#f7f0de]">{t}</div>
            <p className="mt-2 text-sm text-[#d9cbe8]/80">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-xl border border-[#d23a2a]/40 bg-[#d23a2a]/10 p-5 font-serif text-xl text-[#f7f0de]">
        Theme: a measurement becomes violence when the people being measured cannot challenge what it excludes.
      </p>

      <h3 className="mb-3 mt-12 font-serif text-3xl text-[#f7f0de]">The impossible bargain</h3>
      <p className="max-w-3xl text-[#e4d9ef]/90">
        After a housing emergency the city invented <em>folding</em>: rooms could be compressed into building-scale storage so repairs and evacuations didn’t require demolition. The Department now uses it to meet contradictory targets — wider fire corridors, more rentable floor area, fewer officially displaced households. Folded residents disappear from the occupancy denominator. Show apartments demonstrate the policy’s success to investors. The moral failure isn’t measuring space; it’s treating the uncounted as non-existent and leaving a ‘temporary’ measure unreviewed.
      </p>
      <p className="mt-3 text-sm text-[#b9a2d8]">Scope: one building (Calder Court), three folded rooms, nine occupants, one surveyor, one dawn purge. It rescues those people and documents the practice; it does not reform the city in a morning.</p>

      <h3 className="mb-3 mt-12 font-serif text-3xl text-[#f7f0de]">Ten writer-facing rules</h3>
      <ol className="space-y-2">
        {RULES.map(([t, d], i) => (
          <li key={i} className="grid grid-cols-[34px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <span className="font-mono text-lg text-[#d23a2a]">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="font-semibold text-[#f7f0de]">{t}</div>
              <p className="text-sm text-[#d9cbe8]/80">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h3 className="mb-3 mt-12 font-serif text-3xl text-[#f7f0de]">Image & sound language</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {MOTIFS.map(([t, d]) => (
            <div key={t} className="rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
              <div className="font-semibold text-[#f7f0de]">{t}</div>
              <p className="text-sm text-[#d9cbe8]/80">{d}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {PALETTE.map(([n, c, d]) => (
              <div key={n} className="overflow-hidden rounded-lg border border-white/10">
                <div className="h-12" style={{ background: c }} />
                <div className="bg-white/[0.03] p-2">
                  <div className="text-xs font-semibold text-[#f7f0de]">{n}</div>
                  <div className="font-mono text-[10px] text-[#b9a2d8]">{c}</div>
                  <div className="text-[11px] text-[#d9cbe8]/70">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-[#d9cbe8]/85">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#ff8a7a]">Sound</div>
            Stamp-clicks become motor engagement; the three tugs are a dry fabric rasp; storage air pumps (1.2 s cycle) continue beneath apparently solid walls. The Rhodes-and-bell score is a corrupted municipal lullaby that warms by a major third in Episode 1’s last beat. The final silence of the motor is relief — but shutting it down does not silence the city.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-[#d9cbe8]/85">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#ff8a7a]">Performance</div>
            One mature masculine voice, conversational and unhurried. Avoid a permanent spooky whisper; clarity makes the horror worse.
          </div>
        </div>
      </div>

      <h3 className="mb-3 mt-12 font-serif text-3xl text-[#f7f0de]">Setup & payoff for the first two episodes</h3>
      <div className="overflow-hidden rounded-xl border border-white/10">
        {[
          ["81 → 78 on the occupancy board", "Three stored rooms discovered in Ep 2; three bays cleared; 81 restored in Ep 6. Room count ≠ nine occupants."],
          ["Cloth tape, missing first inch", "Orrin compensates in Ep 1 and Ep 6. It never becomes load-bearing gear."],
          ["Three tugs", "A living, trained sender in Ep 1; internal clearance in Ep 3–5. Never a sentence."],
          ["Original receiver designation", "Shown under the plate in Ep 2, so the climax never invents volume."],
          ["Orrin’s approval on Overlay Rev E", "Found in Ep 2; distributed in Ep 4; included in his own responsibility in Ep 6."],
          ["Hollow pears, painted books", "Satirical proof of a lifeless display home; the actual residents fill the reclaimed volume."],
          ["Mrs. Rill’s plan tube (Ep 1 cameo)", "Pays off in Ep 3 when she arrives with the old plans and a socket wrench."],
        ].map(([a, b], i) => (
          <div key={i} className="grid gap-2 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 md:grid-cols-[1fr_1.6fr]">
            <div className="font-semibold text-[#f7f0de]">{a}</div>
            <div className="text-sm text-[#d9cbe8]/80">{b}</div>
          </div>
        ))}
      </div>

      <h3 className="mb-3 mt-12 font-serif text-3xl text-[#f7f0de]">Plot-hole defences</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["Why not call emergency services?", "Orrin sends an inspection alert, but the authorised response is a scheduled morning review at 08:00 — two hours after the purge. The Attendant’s local exception is faster but abandons six people."],
          ["Why not smash through the wall?", "A seam is a compressed threshold, not plaster over a full room. Ep 1 shows it physically."],
          ["Why doesn’t the Attendant stop him?", "Their authority is procedural. They lock controls, record violations, request reset. They’re not an armed force."],
          ["Why not just stop the motor?", "The purge bypass is a separate circuit ‘designed separately, to prevent delays’. Ep 3–4."],
        ].map(([q, a]) => (
          <div key={q} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="font-semibold text-[#f7f0de]">{q}</div>
            <p className="mt-1 text-sm text-[#d9cbe8]/80">{a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
