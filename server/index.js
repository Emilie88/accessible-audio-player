import { createApiServer } from "./api.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const server = createApiServer();

server.listen(port, host, () => {
  console.log(`AudioVerse est disponible sur http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close((error) => {
      if (error) {
        console.error("Impossible d’arrêter le serveur proprement :", error);
        process.exitCode = 1;
      }
    });
  });
}
