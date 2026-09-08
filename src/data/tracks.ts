import type { Track } from "../store/useAudioStore";

export const MOCK_TRACKS: Track[] = [
  {
    id: "1",
    title: "Tech & Accessibility Podcast",
    artist: "Dev Talks",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
  },
  {
    id: "2",
    title: "Focus & Code Session",
    artist: "Lo-Fi Beats",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
  },
  {
    id: "3",
    title: "UI/UX Innovations 2026",
    artist: "Design Trends",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 340,
  },
];
