import { create } from "zustand";

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  duration: number;
  isFavorite: boolean;
  isUploaded: boolean;
}

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: Track | null;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setCurrentTrack: (track: Track | null, autoplay?: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  currentTrack: null,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setCurrentTrack: (currentTrack, autoplay = currentTrack !== null) =>
    set({ currentTrack, currentTime: 0, duration: 0, isPlaying: autoplay }),
}));
