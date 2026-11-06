import { useState } from "react";
import Screening from "./components/Screening";
import Cast from "./components/Cast";
import Bible from "./components/Bible";
import Episodes from "./components/Episodes";

const TABS = [
  { id: "watch", label: "Screening Room" },
  { id: "cast", label: "Cast" },
  { id: "episodes", label: "Scripts" },
  { id: "bible", label: "Series Bible" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<Tab>("watch");
  return (
    <div className="min-h-screen bg-[#120a1c] text-[#f1e9d6] selection:bg-[#d23a2a]/50" style={{ backgroundImage: "radial-gradient(1200px 600px at 50% -10%, rgba(120,70,190,0.25), transparent 60%)" }}>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#120a1c]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0">
              <div className="absolute inset-0 rounded-sm bg-[#efe5cd]" />
              <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-[#d23a2a]" />
              <div className="absolute inset-x-1 top-[55%] h-[2px] bg-[#f3c22f]" />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg tracking-wide text-[#f7f0de]">The Department of Missing Rooms</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff8a7a]">Season 1 · Episodes 1–2</div>
            </div>
          </div>
          <nav className="ml-auto flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0 });
                }}
                className={`rounded-full px-4 py-1.5 text-sm transition ${tab === t.id ? "bg-[#efe5cd] font-semibold text-[#1a1024]" : "text-[#cdbfe0] hover:bg-white/10"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <div className={tab === "watch" ? "" : "hidden"}>
          <div className="mx-auto max-w-6xl px-4 pt-8">
            <p className="font-serif text-2xl italic text-[#f3c22f]">You have not been evicted. Your home has been corrected.</p>
          </div>
          <Screening />
        </div>
        {tab === "cast" && <Cast />}
        {tab === "episodes" && <Episodes />}
        {tab === "bible" && <Bible />}
      </main>
      <footer className="border-t border-white/10 py-8 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-[#8f80a8]">
        Development build · picture and sound generated live in the browser · only Orrin Voss is heard
      </footer>
    </div>
  );
}
