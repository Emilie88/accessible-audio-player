import { useEffect } from "react";
import { AudioPlayer } from "./components/AudioPlayer";
import { useAudioStore } from "./store/useAudioStore";
import { MOCK_TRACKS } from "./data/tracks";
import { Music } from "lucide-react";

export function App() {
  const { currentTrack, setCurrentTrack, isPlaying } = useAudioStore();

  useEffect(() => {
    if (!currentTrack && MOCK_TRACKS.length > 0) {
      setCurrentTrack(MOCK_TRACKS[0]);
    }
  }, [currentTrack, setCurrentTrack]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold flex items-center justify-center gap-3 text-indigo-400">
          <Music size={36} /> AudioVerse
        </h1>
        <p className="text-slate-400 mt-2">
          Lecteur audio accessible (a11y) & naviguable au clavier
        </p>
      </header>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-start">
        {/* Playlist */}
        <section
          aria-label="Liste des pistes"
          className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl"
        >
          <h2 className="text-lg font-semibold mb-4 text-slate-200">
            Playlist
          </h2>
          <ul className="space-y-3">
            {MOCK_TRACKS.map((track) => {
              const isSelected = currentTrack?.id === track.id;
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentTrack(track)}
                    className={`w-full text-left p-4 rounded-xl transition flex items-center justify-between border ${
                      isSelected
                        ? "bg-indigo-950/60 border-indigo-500/50 text-white"
                        : "bg-slate-800/40 border-transparent hover:bg-slate-800 text-slate-300"
                    } focus:outline-none focus:ring-2 focus:ring-indigo-400`}
                    aria-current={isSelected ? "true" : undefined}
                  >
                    <div>
                      <p className="font-medium">{track.title}</p>
                      <p className="text-xs text-slate-400">{track.artist}</p>
                    </div>
                    {isSelected && isPlaying && (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Player */}
        <AudioPlayer />
      </div>
    </main>
  );
}

export default App;
