import { useEffect, useRef } from "react";
import { useAudioStore } from "../store/useAudioStore";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
} from "lucide-react";

export const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
  } = useAudioStore();

  // Synchronisation de l'élément HTML Audio avec Zustand
  // Synchronisation de l'élément HTML Audio avec Zustand
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      // Vérification de sécurité pour jsdom et anciens navigateurs
      if (playPromise !== undefined) {
        playPromise.catch(() => setIsPlaying(false));
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Raccourcis clavier accessibles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Éviter de déclencher si l'utilisateur tape dans une zone de texte
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
        return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (audioRef.current) audioRef.current.currentTime += 5;
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (audioRef.current) audioRef.current.currentTime -= 5;
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, volume, setIsPlaying, setVolume]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!currentTrack) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900 rounded-xl">
        Sélectionnez une piste pour lancer la lecture
      </div>
    );
  }

  return (
    <section
      aria-label="Lecteur audio"
      className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl max-w-lg mx-auto border border-slate-800"
    >
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onTimeUpdate={() =>
          audioRef.current && setCurrentTime(audioRef.current.currentTime)
        }
        onLoadedMetadata={() =>
          audioRef.current && setDuration(audioRef.current.duration)
        }
        onEnded={() => setIsPlaying(false)}
      />

      {/* Informations de la piste */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold tracking-wide">
          {currentTrack.title}
        </h2>
        <p className="text-slate-400 text-sm">{currentTrack.artist}</p>
      </div>

      {/* Barre de progression avec ARIA */}
      <div className="mb-4">
        <label htmlFor="seek-bar" className="sr-only">
          Progression de la lecture
        </label>
        <input
          id="seek-bar"
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => {
            const newTime = Number(e.target.value);
            setCurrentTime(newTime);
            if (audioRef.current) audioRef.current.currentTime = newTime;
          }}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} sur ${formatTime(duration)}`}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Contrôles de lecture */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <button
          onClick={() =>
            audioRef.current && (audioRef.current.currentTime -= 10)
          }
          className="p-2 text-slate-300 hover:text-white focus:ring-2 focus:ring-indigo-400 rounded-full outline-none"
          aria-label="Reculer de 10 secondes"
        >
          <SkipBack size={24} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-full transition text-white focus:ring-4 focus:ring-indigo-400 focus:outline-none shadow-lg"
          aria-label={isPlaying ? "Mettre en pause" : "Lancer la lecture"}
        >
          {isPlaying ? (
            <Pause size={28} />
          ) : (
            <Play size={28} className="ml-1" />
          )}
        </button>

        <button
          onClick={() =>
            audioRef.current && (audioRef.current.currentTime += 10)
          }
          className="p-2 text-slate-300 hover:text-white focus:ring-2 focus:ring-indigo-400 rounded-full outline-none"
          aria-label="Avancer de 10 secondes"
        >
          <SkipForward size={24} />
        </button>
      </div>

      {/* Contrôle du Volume */}
      <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
        <button
          onClick={() => setVolume(volume === 0 ? 1 : 0)}
          className="text-slate-300 hover:text-white focus:ring-2 focus:ring-indigo-400 rounded p-1 outline-none"
          aria-label={volume === 0 ? "Activer le son" : "Couper le son"}
        >
          {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <label htmlFor="volume-bar" className="sr-only">
          Niveau du volume
        </label>
        <input
          id="volume-bar"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Volume"
        />
      </div>
    </section>
  );
};
