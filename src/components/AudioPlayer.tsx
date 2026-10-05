import { useEffect, useRef, useState } from "react";
import {
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAudioStore } from "../store/useAudioStore";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackError, setPlaybackError] = useState("");
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isPlaying) {
      audio.pause();
      return;
    }
    if (typeof audio.play !== "function") return;
    if (audio.ended) audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setIsPlaying(false);
        setPlaybackError("La lecture n’a pas pu démarrer. Vérifiez le fichier audio puis réessayez.");
      });
    }
  }, [currentTrack, isPlaying, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current && Number.isFinite(volume)) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("a, input, textarea, select, button, [contenteditable='true']") ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey)
      ) return;

      const audio = audioRef.current;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case "ArrowRight":
          if (audio) {
            event.preventDefault();
            audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 5);
          }
          break;
        case "ArrowLeft":
          if (audio) {
            event.preventDefault();
            audio.currentTime = Math.max(0, audio.currentTime - 5);
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          event.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, setVolume, volume]);

  function formatTime(time: number) {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(
        0,
        Math.min(audio.duration || Infinity, audio.currentTime + seconds),
      );
    }
  }

  if (!currentTrack) {
    return (
      <div className="panel player-empty">
        <span className="player-empty-icon"><Play size={22} aria-hidden="true" /></span>
        <span>Sélectionnez une piste pour lancer la lecture</span>
      </div>
    );
  }

  return (
    <section aria-label="Lecteur audio" className="panel player-panel">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="metadata"
        aria-label={`Audio : ${currentTrack.title}`}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          const audioDuration = audioRef.current?.duration;
          if (audioDuration !== undefined && Number.isFinite(audioDuration)) {
            setDuration(audioDuration);
          }
          setPlaybackError("");
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError("Ce fichier audio est indisponible. Essayez une autre piste.");
        }}
      />

      <div className="player-topline">
        <span className="player-status"><span className={isPlaying ? "live-dot is-playing" : "live-dot"} /> {isPlaying ? "EN COURS" : "À L’ÉCOUTE"}</span>
        <span className="player-format">{currentTrack.isUploaded ? "VOTRE AUDIO" : "PODCAST"}</span>
      </div>

      <div className={`player-art player-art-${currentTrack.id.length % 4}`} aria-hidden="true">
        <div className={`art-wave${isPlaying ? " is-playing" : ""}`}>
          {Array.from({ length: 27 }, (_, index) => (
            <span key={index} style={{ "--bar": `${22 + ((index * 37) % 72)}%` } as React.CSSProperties} />
          ))}
        </div>
        <span className="player-art-icon"><Music2 size={30} aria-hidden="true" /></span>
      </div>

      <div className="player-track-info">
        <h2>{currentTrack.title}</h2>
        <p>{currentTrack.artist}</p>
      </div>

      <div className="progress-block">
        <label htmlFor="seek-bar" className="sr-only">Progression de la lecture</label>
        <input
          id="seek-bar"
          type="range"
          min="0"
          max={duration || 1}
          value={Math.min(currentTime, duration || 1)}
          onChange={(event) => {
            const newTime = Number(event.target.value);
            setCurrentTime(newTime);
            if (audioRef.current) audioRef.current.currentTime = newTime;
          }}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(Math.min(currentTime, duration))}
          aria-valuetext={`${formatTime(currentTime)} sur ${formatTime(duration)}`}
        />
        <div className="time-labels">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="playback-controls">
        <button type="button" onClick={() => seekBy(-10)} className="skip-control" aria-label="Reculer de 10 secondes">
          <SkipBack size={19} aria-hidden="true" /><span>10</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaybackError("");
            setIsPlaying(!isPlaying);
          }}
          className="play-button"
          aria-label={isPlaying ? "Mettre en pause" : "Lancer la lecture"}
        >
          {isPlaying
            ? <Pause size={23} fill="currentColor" aria-hidden="true" />
            : <Play size={23} fill="currentColor" className="play-icon" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => seekBy(10)} className="skip-control" aria-label="Avancer de 10 secondes">
          <SkipForward size={19} aria-hidden="true" /><span>10</span>
        </button>
      </div>

      <div className="volume-controls">
        <button
          type="button"
          onClick={() => setVolume(volume === 0 ? 1 : 0)}
          className="volume-button"
          aria-label={volume === 0 ? "Activer le son" : "Couper le son"}
        >
          {volume === 0 ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
        <label htmlFor="volume-bar" className="sr-only">Niveau du volume</label>
        <input
          id="volume-bar"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          aria-valuetext={`${Math.round(volume * 100)} %`}
        />
        <span className="volume-percent">{Math.round(volume * 100)}%</span>
      </div>
      <p className="playback-error" role="status" aria-live="polite">{playbackError}</p>
    </section>
  );
}
