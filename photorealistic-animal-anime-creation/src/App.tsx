import Player from "./components/Player";
import Bible from "./components/Bible";

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <a href="#watch" className="font-sans text-sm font-bold tracking-tight">
            GERALD <span className="font-serif font-normal italic text-hot">is</span> FINE
          </a>
          <nav className="flex items-center gap-4 font-mono text-[10px] tracking-[0.25em] text-white/50 sm:gap-7 sm:text-[11px]">
            <a href="#watch" className="hover:text-acid">WATCH</a>
            <a href="#pipeline" className="hover:text-acid">PIPELINE</a>
            <a href="#cast" className="hover:text-acid">CAST</a>
            <a href="#script" className="hover:text-acid">SCRIPT</a>
            <a href="#series" className="hidden hover:text-acid sm:inline">SERIES</a>
          </nav>
        </div>
      </header>
      <main>
        <section id="watch" className="scroll-mt-14 px-3 pt-4 sm:px-6 sm:pt-6">
          <Player />
        </section>
        <Bible />
      </main>
    </div>
  );
}
