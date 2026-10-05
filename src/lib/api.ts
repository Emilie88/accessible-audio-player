import type { Track } from "../store/useAudioStore";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "La requête a échoué. Réessayez.");
  }
  return (await response.json()) as T;
}

export async function getTracks(signal?: AbortSignal): Promise<Track[]> {
  return parseResponse<Track[]>(await fetch("/api/tracks", { signal }));
}

export async function uploadTrack(
  file: File,
  title: string,
  artist: string,
): Promise<Track> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    webm: "audio/webm",
  };
  const contentType = mimeTypes[extension ?? ""] ??
    (file.type.startsWith("audio/") ? file.type : undefined);
  if (!contentType) {
    throw new Error("Choisissez un fichier audio MP3, WAV, OGG, FLAC, AAC, M4A ou WEBM.");
  }
  const query = new URLSearchParams({ title, artist });
  return parseResponse<Track>(
    await fetch(`/api/tracks?${query}`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: file,
    }),
  );
}

export async function toggleFavorite(trackId: string): Promise<Track> {
  return parseResponse<Track>(
    await fetch(`/api/tracks/${encodeURIComponent(trackId)}/favorite`, {
      method: "PATCH",
    }),
  );
}

export async function deleteTrack(trackId: string): Promise<void> {
  const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Impossible de supprimer cette piste.");
  }
}
