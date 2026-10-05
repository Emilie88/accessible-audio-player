import { useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  Headphones,
  Heart,
  LoaderCircle,
  Music2,
  Search,
  Upload,
  X,
} from "lucide-react";
import "./App.css";
import { AudioPlayer } from "./components/AudioPlayer";
import {
  deleteTrack,
  getTracks,
  toggleFavorite,
  uploadTrack,
} from "./lib/api";
import { useAudioStore, type Track } from "./store/useAudioStore";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function isFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

export function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { currentTrack, setCurrentTrack } = useAudioStore();

  useEffect(() => {
    const controller = new AbortController();
    getTracks(controller.signal)
      .then((loadedTracks) => {
        setTracks(loadedTracks);
        if (!useAudioStore.getState().currentTrack && loadedTracks.length > 0) {
          setCurrentTrack(loadedTracks[0], false);
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Impossible de charger la bibliothèque.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [setCurrentTrack]);

  const visibleTracks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return tracks.filter((track) => {
      const matchesQuery = `${track.title} ${track.artist}`
        .toLocaleLowerCase("fr")
        .includes(normalizedQuery);
      return matchesQuery && (!favoritesOnly || track.isFavorite);
    });
  }, [favoritesOnly, query, tracks]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setNotice("");
    const form = new FormData(formElement);
    const fileInput = formElement.elements.namedItem("audio");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
    if (!isFile(file) || file.size === 0) {
      setError("Choisissez un fichier audio avant de l’ajouter.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Le fichier dépasse la limite de 50 Mo.");
      return;
    }

    setIsUploading(true);
    try {
      const track = await uploadTrack(
        file,
        String(form.get("title") ?? "").trim(),
        String(form.get("artist") ?? "").trim(),
      );
      setTracks((existingTracks) => [...existingTracks, track]);
      setCurrentTrack(track);
      setNotice(`« ${track.title} » a été ajoutée à votre bibliothèque.`);
      formElement.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’ajout de la piste a échoué.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFavorite(track: Track) {
    setError("");
    try {
      const updatedTrack = await toggleFavorite(track.id);
      setTracks((existingTracks) =>
        existingTracks.map((item) => (item.id === track.id ? updatedTrack : item)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La mise à jour du favori a échoué.");
    }
  }

  async function handleDelete(track: Track) {
    if (!window.confirm(`Supprimer « ${track.title} » de votre bibliothèque ?`)) return;
    setError("");
    try {
      await deleteTrack(track.id);
      const remainingTracks = tracks.filter((item) => item.id !== track.id);
      setTracks(remainingTracks);
      if (currentTrack?.id === track.id) {
        setCurrentTrack(remainingTracks[0] ?? null, false);
      }
      setNotice(`« ${track.title} » a été supprimée.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La suppression de la piste a échoué.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AudioVerse, accueil">
          <span className="brand-mark"><AudioLines size={22} aria-hidden="true" /></span>
          <span>audio<span className="brand-light">verse</span></span>
        </a>
        <span className="topbar-label"><span className="live-dot" /> Votre espace d’écoute</span>
        <span className="avatar" aria-label="Bibliothèque personnelle">A</span>
      </header>

      <section className="welcome" aria-labelledby="page-title">
        <div>
          <p className="eyebrow"><Headphones size={15} aria-hidden="true" /> LE PLAISIR D’ÉCOUTER</p>
          <h1 id="page-title">Votre univers, <span>votre musique.</span></h1>
          <p className="welcome-copy">Retrouvez vos podcasts préférés et prenez le temps d’écouter.</p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="art-disc"><Music2 size={35} /></span>
          <span className="art-spark spark-one" />
          <span className="art-spark spark-two" />
        </div>
      </section>

      <div className="content-grid">
        <div className="library-column">
          <section className="panel library-panel" aria-labelledby="library-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">À VOUS DE CHOISIR</p>
                <h2 id="library-title">Votre bibliothèque</h2>
              </div>
              <span className="track-count">{tracks.length} titres</span>
            </div>

            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Rechercher un titre ou un artiste</span>
              <input
                type="search"
                placeholder="Rechercher un titre ou un artiste…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="clear-search"
                  aria-label="Effacer la recherche"
                  onClick={() => setQuery("")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>

            <div className="library-toolbar">
              <span className="toolbar-label">VOTRE COLLECTION</span>
              <button
                type="button"
                className={`filter-button${favoritesOnly ? " is-active" : ""}`}
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((value) => !value)}
              >
                <Heart size={14} aria-hidden="true" />
                Favoris
              </button>
            </div>

            {isLoading ? (
              <p className="empty-state"><LoaderCircle className="spin" size={20} /> Chargement de la bibliothèque…</p>
            ) : visibleTracks.length > 0 ? (
              <ul className="track-list">
                {visibleTracks.map((track, index) => {
                  const isSelected = currentTrack?.id === track.id;
                  return (
                    <li className={`track-row${isSelected ? " is-selected" : ""}`} key={track.id}>
                      <button
                        type="button"
                        className="track-select"
                        onClick={() => setCurrentTrack(track)}
                        aria-current={isSelected ? "true" : undefined}
                      >
                        <span className={`track-art track-art-${index % 4}`}>
                          {isSelected ? <AudioLines size={19} aria-hidden="true" /> : <Music2 size={18} aria-hidden="true" />}
                        </span>
                        <span className="track-copy">
                          <span className="track-title">{track.title}</span>
                          <span className="track-artist">{track.artist}{track.isUploaded && <span className="uploaded-label">AJOUTÉ</span>}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`icon-button favorite-button${track.isFavorite ? " is-favorite" : ""}`}
                        aria-label={track.isFavorite ? `Retirer ${track.title} des favoris` : `Ajouter ${track.title} aux favoris`}
                        aria-pressed={track.isFavorite}
                        onClick={() => void handleFavorite(track)}
                      >
                        <Heart size={17} fill={track.isFavorite ? "currentColor" : "none"} aria-hidden="true" />
                      </button>
                      {track.isUploaded && (
                        <button
                          type="button"
                          className="icon-button delete-button"
                          aria-label={`Supprimer ${track.title}`}
                          onClick={() => void handleDelete(track)}
                        >
                          <X size={17} aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-state">
                <Music2 size={22} aria-hidden="true" />
                <span>{tracks.length === 0 ? "Votre bibliothèque est vide. Ajoutez votre premier audio." : "Aucun titre ne correspond à votre recherche."}</span>
              </div>
            )}
          </section>

          <section className="panel upload-panel" aria-labelledby="upload-title">
            <div className="section-heading upload-heading">
              <div>
                <p className="eyebrow">VOTRE MUSIQUE, CHEZ VOUS</p>
                <h2 id="upload-title">Ajouter un audio</h2>
              </div>
              <span className="upload-icon"><Upload size={18} aria-hidden="true" /></span>
            </div>
            <form className="upload-form" onSubmit={(event) => void handleUpload(event)}>
              <label>
                <span>Titre</span>
                <input name="title" type="text" maxLength={100} placeholder="Le nom de l’épisode" required />
              </label>
              <label>
                <span>Artiste ou podcast</span>
                <input name="artist" type="text" maxLength={100} placeholder="Qui l’a créé ?" required />
              </label>
              <label className="file-field">
                <span>Fichier audio <span className="field-hint">MP3, WAV, OGG, FLAC… · 50 Mo max.</span></span>
                <input name="audio" type="file" accept="audio/*" required />
              </label>
              <button className="primary-button" type="submit" disabled={isUploading}>
                {isUploading ? <><LoaderCircle size={17} className="spin" /> Ajout en cours…</> : <><Upload size={16} /> Ajouter à ma bibliothèque</>}
              </button>
            </form>
          </section>
        </div>

        <aside className="player-column" aria-label="Zone de lecture">
          <AudioPlayer />
          <section className="keyboard-hint" aria-labelledby="shortcuts-title">
            <div className="hint-icon"><Headphones size={18} aria-hidden="true" /></div>
            <div>
              <h2 id="shortcuts-title">Écoutez à votre rythme</h2>
              <p>Les commandes du lecteur fonctionnent aussi au clavier.</p>
              <div className="shortcut-list">
                <span><kbd>Espace</kbd> lecture / pause</span>
                <span><kbd>←</kbd><kbd>→</kbd> reculer / avancer</span>
                <span><kbd>↑</kbd><kbd>↓</kbd> régler le volume</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer className="app-footer">
        <span><AudioLines size={14} aria-hidden="true" /> AudioVerse</span>
        <span>Votre écoute, pensée pour tout le monde.</span>
      </footer>

      <div className="sr-only" role="status" aria-live="polite">{notice}</div>
      {error && (
        <div className="toast-error" role="alert">
          <span>{error}</span>
          <button type="button" aria-label="Fermer le message" onClick={() => setError("")}><X size={18} /></button>
        </div>
      )}
    </main>
  );
}

export default App;
