import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createApiServer } from "./api.js";

describe("AudioVerse API", () => {
  let dataDirectory;
  let server;
  let baseUrl;

  beforeEach(async () => {
    dataDirectory = await mkdtemp(join(tmpdir(), "audioverse-test-"));
    server = createApiServer({ dataDirectory });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it("serves the seeded catalogue and filters it by search", async () => {
    const response = await fetch(`${baseUrl}/api/tracks`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).length, 3);

    const search = await fetch(`${baseUrl}/api/tracks?q=accessibility`);
    assert.equal((await search.json()).length, 1);
  });

  it("stores uploaded audio, serves byte ranges, and persists favorites", async () => {
    const upload = await fetch(
      `${baseUrl}/api/tracks?title=Mon%20podcast&artist=Moi`,
      {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: Buffer.from("test-audio-data"),
      },
    );
    assert.equal(upload.status, 201);
    const track = await upload.json();
    assert.equal(track.isUploaded, true);

    const audio = await fetch(`${baseUrl}${track.src}`, {
      headers: { Range: "bytes=0-3" },
    });
    assert.equal(audio.status, 206);
    assert.equal(audio.headers.get("content-range"), "bytes 0-3/15");
    assert.equal(await audio.text(), "test");

    const favorite = await fetch(`${baseUrl}/api/tracks/${track.id}/favorite`, {
      method: "PATCH",
    });
    assert.equal((await favorite.json()).isFavorite, true);
    const catalogue = await fetch(`${baseUrl}/api/tracks`);
    const savedTrack = (await catalogue.json()).find((item) => item.id === track.id);
    assert.equal(savedTrack.isFavorite, true);
  });

  it("keeps simultaneous favorite updates from overwriting each other", async () => {
    const requests = await Promise.all([
      fetch(`${baseUrl}/api/tracks/demo-focus/favorite`, { method: "PATCH" }),
      fetch(`${baseUrl}/api/tracks/demo-focus/favorite`, { method: "PATCH" }),
    ]);
    assert.equal(requests[0].status, 200);
    assert.equal(requests[1].status, 200);

    const catalogue = await fetch(`${baseUrl}/api/tracks`);
    const track = (await catalogue.json()).find((item) => item.id === "demo-focus");
    assert.equal(track.isFavorite, false);
  });

  it("rejects missing metadata and unsupported audio formats", async () => {
    const missingTitle = await fetch(`${baseUrl}/api/tracks?artist=Moi`, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: "audio",
    });
    assert.equal(missingTitle.status, 400);

    const unsupported = await fetch(
      `${baseUrl}/api/tracks?title=Titre&artist=Moi`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: "audio",
      },
    );
    assert.equal(unsupported.status, 415);
  });

  it("deletes an uploaded track and its audio file", async () => {
    const upload = await fetch(
      `${baseUrl}/api/tracks?title=Mon%20podcast&artist=Moi`,
      {
        method: "POST",
        headers: { "Content-Type": "audio/mpeg" },
        body: Buffer.from("test-audio"),
      },
    );
    const track = await upload.json();
    const deletion = await fetch(`${baseUrl}/api/tracks/${track.id}`, {
      method: "DELETE",
    });
    assert.equal(deletion.status, 204);

    const audio = await fetch(`${baseUrl}${track.src}`);
    assert.equal(audio.status, 404);
  });
});
