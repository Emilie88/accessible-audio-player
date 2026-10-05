import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import {
  getTracks,
  toggleFavorite,
  uploadTrack,
} from "../lib/api";
import { useAudioStore, type Track } from "../store/useAudioStore";

vi.mock("../lib/api", () => ({
  deleteTrack: vi.fn(),
  getTracks: vi.fn(),
  toggleFavorite: vi.fn(),
  uploadTrack: vi.fn(),
}));

const tracks: Track[] = [
  {
    id: "demo-accessibility",
    title: "Tech & Accessibility Podcast",
    artist: "Dev Talks",
    src: "https://example.com/audio.mp3",
    duration: 372,
    isFavorite: false,
    isUploaded: false,
  },
  {
    id: "demo-focus",
    title: "Focus & Code Session",
    artist: "Lo-Fi Beats",
    src: "https://example.com/audio-2.mp3",
    duration: 423,
    isFavorite: false,
    isUploaded: false,
  },
];

describe("AudioVerse", () => {
  beforeEach(() => {
    useAudioStore.setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      currentTrack: null,
    });
    vi.mocked(getTracks).mockResolvedValue(tracks);
    vi.mocked(toggleFavorite).mockReset();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  });

  it("renders the page title and a library loaded from the API", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /votre univers/i })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: /votre bibliothèque/i })).toBeTruthy();
    expect(screen.getAllByText(/Tech & Accessibility Podcast/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Lancer la lecture" })).toBeTruthy();
    expect(getTracks).toHaveBeenCalledOnce();
  });

  it("filters the library to favorited tracks", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Focus & Code Session");

    await user.click(screen.getByRole("button", { name: "Favoris" }));
    expect(screen.getByText("Aucun titre ne correspond à votre recherche.")).toBeTruthy();

    const favorite = {
      ...tracks[0],
      isFavorite: true,
    };
    vi.mocked(toggleFavorite).mockResolvedValue(favorite);
    await user.click(screen.getByRole("button", { name: "Favoris" }));
    await user.click(screen.getByRole("button", { name: /ajouter tech & accessibility podcast aux favoris/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /retirer tech & accessibility podcast des favoris/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "Favoris" }));
    expect(screen.getAllByText(/Tech & Accessibility Podcast/i)).toHaveLength(2);
    expect(screen.queryByText("Focus & Code Session")).toBeNull();
  });

  it("adds an audio file to the library through the API", async () => {
    const user = userEvent.setup();
    const uploadedTrack: Track = {
      ...tracks[0],
      id: "uploaded-track",
      title: "Mon nouvel épisode",
      artist: "Mon podcast",
      src: "/audio/uploaded-track.mp3",
      isUploaded: true,
    };
    vi.mocked(uploadTrack).mockResolvedValue(uploadedTrack);
    render(<App />);
    await screen.findByText("Focus & Code Session");

    await user.type(screen.getByLabelText("Titre"), uploadedTrack.title);
    await user.type(screen.getByLabelText("Artiste ou podcast"), uploadedTrack.artist);
    const file = new File(["audio"], "episode.mp3", { type: "audio/mpeg" });
    const fileInput = screen.getByLabelText(/fichier audio/i) as HTMLInputElement;
    await user.upload(fileInput, file);
    expect(fileInput.files).toHaveLength(1);
    const form = screen.getByLabelText("Titre").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => expect(uploadTrack).toHaveBeenCalledOnce());
    expect(await screen.findAllByText(uploadedTrack.title)).toHaveLength(2);
    expect(uploadTrack).toHaveBeenCalledWith(
      expect.objectContaining({ name: "episode.mp3" }),
      uploadedTrack.title,
      uploadedTrack.artist,
    );
  });
});
