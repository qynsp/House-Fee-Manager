import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { initSocket } from "./lib/socket";
import { startGameEngine } from "./lib/game-engine";

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
initSocket(httpServer);

httpServer.listen(port, async () => {
  logger.info({ port }, "Server listening");
  try {
    await startGameEngine();
  } catch (err) {
    logger.error({ err }, "Failed to start game engine");
  }
});
