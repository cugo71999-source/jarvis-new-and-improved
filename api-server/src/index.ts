import { createRequire } from "module";
const _require = createRequire(import.meta.url);
try { _require("dotenv").config(); } catch { /* dotenv optional */ }

import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { JarvisEngine } from "./engine/jarvisEngine";
import { handleWsClient } from "./engine/wsHandler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

const engine = new JarvisEngine();
engine.attachWss(wss);
engine.startMetrics();

wss.on("connection", (ws) => {
  handleWsClient(ws, engine);
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
