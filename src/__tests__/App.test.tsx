import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App Component", () => {
  it("renders the main title", () => {
    // 1. Rendre le composant
    render(<App />);

    // 2. Trouver l'élément titre
    const titleElement = screen.getByText(/AudioVerse/i);

    // 3. Affirmer qu'il est présent dans le document
    expect(titleElement).toBeTruthy();
  });

  it("renders the playlist section with tracks", () => {
    render(<App />);

    // Vérifie que le titre de la section Playlist est là
    expect(screen.getByRole("heading", { name: /Playlist/i })).toBeTruthy();

    // Vérifie qu'au moins une des pistes est affichée par son titre
    expect(screen.getAllByText(/Tech & Accessibility Podcast/i)).toBeTruthy();
  });
});
