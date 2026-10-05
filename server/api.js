import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { seedTracks } from "./seed-data.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const audioTypes = new Map([
  ["audio/aac", "aac"],
  ["audio/mp3", "mp3"],
  ["audio/flac", "flac"],
  ["audio/mp4", "m4a"],
  ["audio/mpeg", "mp3"],
  ["audio/ogg", "ogg"],
  ["audio/vnd.wave", "wav"],
  ["audio/wav", "wav"],
  ["audio/webm", "webm"],
  ["audio/x-aac", "aac"],
  ["audio/x-flac", "flac"],
  ["audio/x-m4a", "m4a"],
  ["audio/x-wav", "wav"],
]);
const contentTypes = new Map([
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
  [".m4a", "audio/mp4"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".wav", "audio/wav"],
  [".webm", "audio/webm"],
]);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);
const projectDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function removeFile(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export function createApiServer({ dataDirectory = join(projectDirectory, "data") } = {}) {
  const uploadsDirectory = join(dataDirectory, "uploads");
  const tracksFile = join(dataDirectory, "tracks.json");
  let mutationQueue = Promise.resolve();

  async function ensureDataDirectory() {
    await mkdir(uploadsDirectory, { recursive: true });
    try {
      await readFile(tracksFile);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await writeTracks(seedTracks);
    }
  }

  async function readTracks() {
    await ensureDataDirectory();
    return JSON.parse(await readFile(tracksFile, "utf8"));
  }

  async function writeTracks(tracks) {
    await mkdir(dataDirectory, { recursive: true });
    const temporaryFile = `${tracksFile}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryFile, `${JSON.stringify(tracks, null, 2)}\n`, "utf8");
      await rename(temporaryFile, tracksFile);
    } catch (error) {
      await removeFile(temporaryFile);
      throw error;
    }
  }

  function mutateTracks(mutation) {
    const task = mutationQueue.then(async () => {
      const tracks = await readTracks();
      const result = await mutation(tracks);
      await writeTracks(tracks);
      return result;
    });
    mutationQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  function receiveAudio(request, destination) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(destination, { flags: "wx" });
      let size = 0;
      let failure;
      let settled = false;
      const rejectOnce = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      output.on("error", (error) => {
        failure ??= error;
        request.resume();
        rejectOnce(error);
      });
      output.on("finish", () => {
        if (settled) return;
        settled = true;
        resolve(size);
      });
      request.on("data", (chunk) => {
        if (failure) return;
        size += chunk.length;
        if (size > MAX_UPLOAD_BYTES) {
          failure = fail(413, "Le fichier dépasse la limite de 50 Mo.");
          output.destroy();
          return;
        }
        if (!output.write(chunk)) {
          request.pause();
          output.once("drain", () => request.resume());
        }
      });
      request.on("end", () => {
        if (failure) {
          rejectOnce(failure);
          return;
        }
        output.end();
      });
      request.on("error", (error) => {
        failure ??= error;
        output.destroy();
        rejectOnce(error);
      });
      request.on("aborted", () => {
        const error = fail(400, "Le transfert du fichier a été interrompu.");
        failure ??= error;
        output.destroy();
        rejectOnce(error);
      });
    });
  }

  async function sendAudio(request, response, filename) {
    if (!/^[\da-f-]{36}\.(aac|flac|m4a|mp3|ogg|wav|webm)$/i.test(filename)) {
      json(response, 404, { error: "Fichier audio introuvable." });
      return;
    }
    const audioPath = join(uploadsDirectory, filename);
    let audioStat;
    try {
      audioStat = await stat(audioPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        json(response, 404, { error: "Fichier audio introuvable." });
        return;
      }
      throw error;
    }

    const range = request.headers.range;
    let start = 0;
    let end = audioStat.size - 1;
    let status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        response.writeHead(416, { "Content-Range": `bytes */${audioStat.size}` });
        response.end();
        return;
      }
      if (match[1]) {
        start = Number(match[1]);
        if (match[2]) end = Number(match[2]);
      } else {
        start = Math.max(0, audioStat.size - Number(match[2]));
      }
      if (start > end || start >= audioStat.size) {
        response.writeHead(416, { "Content-Range": `bytes */${audioStat.size}` });
        response.end();
        return;
      }
      end = Math.min(end, audioStat.size - 1);
      status = 206;
    }

    response.writeHead(status, {
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": end - start + 1,
      "Content-Type": contentTypes.get(extname(filename)),
      ...(status === 206 ? { "Content-Range": `bytes ${start}-${end}/${audioStat.size}` } : {}),
    });
    createReadStream(audioPath, { start, end }).pipe(response);
  }

  async function handle(request, response) {
    const url = new URL(request.url, "http://localhost");
    const { pathname } = url;

    if (pathname === "/api/health" && request.method === "GET") {
      json(response, 200, { status: "ok" });
      return;
    }

    if (pathname === "/api/tracks" && request.method === "GET") {
      const search = (url.searchParams.get("q") ?? "").trim().toLocaleLowerCase("fr");
      const tracks = await readTracks();
      json(
        response,
        200,
        tracks.filter(
          (track) =>
            !search ||
            `${track.title} ${track.artist}`.toLocaleLowerCase("fr").includes(search),
        ),
      );
      return;
    }

    if (pathname === "/api/tracks" && request.method === "POST") {
      const title = (url.searchParams.get("title") ?? "").trim();
      const artist = (url.searchParams.get("artist") ?? "").trim();
      if (!title || title.length > 100 || !artist || artist.length > 100) {
        throw fail(400, "Le titre et l’artiste sont obligatoires (100 caractères maximum).");
      }
      const contentType = (request.headers["content-type"] ?? "").split(";")[0].toLowerCase();
      const extension = audioTypes.get(contentType);
      if (!extension) {
        throw fail(415, "Format audio non pris en charge.");
      }
      const declaredLength = Number(request.headers["content-length"] ?? 0);
      if (declaredLength > MAX_UPLOAD_BYTES) {
        throw fail(413, "Le fichier dépasse la limite de 50 Mo.");
      }

      await ensureDataDirectory();
      const id = randomUUID();
      const filename = `${id}.${extension}`;
      const temporaryAudio = join(uploadsDirectory, `${id}.tmp`);
      const audioPath = join(uploadsDirectory, filename);
      let audioCreated = false;
      try {
        const size = await receiveAudio(request, temporaryAudio);
        if (size === 0) throw fail(400, "Le fichier audio est vide.");
        await rename(temporaryAudio, audioPath);
        audioCreated = true;
        const track = {
          id,
          title,
          artist,
          src: `/audio/${filename}`,
          duration: 0,
          isFavorite: false,
          isUploaded: true,
        };
        await mutateTracks((tracks) => {
          tracks.push(track);
        });
        json(response, 201, track);
      } catch (error) {
        await removeFile(temporaryAudio);
        if (audioCreated) await removeFile(audioPath);
        throw error;
      }
      return;
    }

    const favoriteMatch = /^\/api\/tracks\/([^/]+)\/favorite$/.exec(pathname);
    if (favoriteMatch && request.method === "PATCH") {
      const track = await mutateTracks((tracks) => {
        const item = tracks.find((entry) => entry.id === favoriteMatch[1]);
        if (!item) throw fail(404, "Piste introuvable.");
        item.isFavorite = !item.isFavorite;
        return { ...item };
      });
      json(response, 200, track);
      return;
    }

    const audioMatch = /^\/audio\/([^/]+)$/.exec(pathname);
    if (audioMatch && request.method === "GET") {
      await sendAudio(request, response, audioMatch[1]);
      return;
    }

    const deleteMatch = /^\/api\/tracks\/([^/]+)$/.exec(pathname);
    if (deleteMatch && request.method === "DELETE") {
      const track = await mutateTracks((tracks) => {
        const index = tracks.findIndex((item) => item.id === deleteMatch[1]);
        if (index === -1) throw fail(404, "Piste introuvable.");
        return tracks.splice(index, 1)[0];
      });
      if (track.isUploaded) {
        await removeFile(join(uploadsDirectory, `${track.id}.${extname(track.src).slice(1)}`));
      }
      response.writeHead(204);
      response.end();
      return;
    }

    if (pathname.startsWith("/api/") || pathname.startsWith("/audio/")) {
      json(response, 404, { error: "Ressource introuvable." });
      return;
    }

    await serveFrontend(pathname, response);
  }

  async function serveFrontend(pathname, response) {
    const buildDirectory = join(projectDirectory, "dist");
    let assetPath;
    try {
      const decodedPath = decodeURIComponent(pathname);
      const requestedPath = resolve(buildDirectory, `.${decodedPath}`);
      if (requestedPath.startsWith(`${buildDirectory}${sep}`) || requestedPath === buildDirectory) {
        assetPath = requestedPath;
      }
    } catch {
      json(response, 400, { error: "Chemin de fichier invalide." });
      return;
    }
    if (assetPath) {
      try {
        const info = await stat(assetPath);
        if (info.isFile()) {
          response.writeHead(200, {
            "Content-Length": info.size,
            "Content-Type": mimeTypes.get(extname(assetPath)) ?? "application/octet-stream",
          });
          createReadStream(assetPath).pipe(response);
          return;
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    try {
      const indexHtml = await readFile(join(buildDirectory, "index.html"));
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(indexHtml);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      json(response, 503, { error: "L’interface n’est pas compilée. Lancez npm run build." });
    }
  }

  return createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      const status = error.status ?? 500;
      if (status === 500) console.error("Erreur API AudioVerse :", error);
      json(response, status, {
        error: status === 500 ? "Une erreur interne est survenue." : error.message,
      });
    });
  });
}
