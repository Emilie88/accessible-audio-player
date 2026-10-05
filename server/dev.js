import { createServer as createViteServer } from "vite";
import { createApiServer } from "./api.js";

const apiPort = Number(process.env.API_PORT ?? 3000);
const vitePort = Number(process.env.VITE_PORT ?? 5173);
const apiServer = createApiServer();
let viteServer;
let isShuttingDown = false;

async function listen(server, port, host) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (viteServer) await viteServer.close();
    if (apiServer.listening) {
      await new Promise((resolve, reject) => {
        apiServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } catch (error) {
    console.error("Erreur à l’arrêt des serveurs AudioVerse :", error);
    process.exitCode = 1;
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    void shutdown();
  });
}

try {
  await listen(apiServer, apiPort, "127.0.0.1");
  process.env.API_PROXY_TARGET = `http://127.0.0.1:${apiPort}`;
  viteServer = await createViteServer({
    server: {
      host: "127.0.0.1",
      port: vitePort,
    },
  });
  await viteServer.listen();
  console.log(`AudioVerse API disponible sur http://127.0.0.1:${apiPort}`);
  console.log(`Interface AudioVerse disponible sur http://127.0.0.1:${vitePort}`);
  viteServer.printUrls();
} catch (error) {
  console.error("Impossible de démarrer AudioVerse :", error.message);
  await shutdown();
  process.exitCode = 1;
}
