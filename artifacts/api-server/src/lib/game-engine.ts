import { eq, ne } from "drizzle-orm";
import { db, gamesTable, houseSettingsTable } from "@workspace/db";
import { drawNextNumber } from "./bingo";
import { getIo } from "./socket";
import { logger } from "./logger";

let drawInterval: ReturnType<typeof setInterval> | null = null;
let currentGameId: number | null = null;

function formatGame(game: typeof gamesTable.$inferSelect, winnerUsername?: string | null) {
  return {
    id: game.id,
    status: game.status,
    ticketPrice: parseFloat(String(game.ticketPrice)),
    totalPot: parseFloat(String(game.totalPot)),
    houseFee: parseFloat(String(game.houseFee)),
    prizePool: parseFloat(String(game.prizePool)),
    houseEarnings: parseFloat(String(game.houseEarnings)),
    drawnNumbers: (game.drawnNumbers as number[]) ?? [],
    playerCount: game.playerCount,
    winnerId: game.winnerId,
    winnerUsername: winnerUsername ?? null,
    winPattern: game.winPattern,
    startedAt: game.startedAt?.toISOString() ?? null,
    endedAt: game.endedAt?.toISOString() ?? null,
    createdAt: game.createdAt.toISOString(),
  };
}

async function getSettings() {
  const [settings] = await db.select().from(houseSettingsTable).limit(1);
  if (settings) return settings;
  const [created] = await db.insert(houseSettingsTable).values({}).returning();
  return created;
}

async function ensureWaitingGame() {
  const [existing] = await db.select().from(gamesTable).where(ne(gamesTable.status, "finished")).limit(1);
  if (existing) return existing;

  const settings = await getSettings();
  const [newGame] = await db.insert(gamesTable).values({
    status: "waiting",
    ticketPrice: String(parseFloat(String(settings.ticketPrice))),
    houseFee: String(parseFloat(String(settings.houseFeePct))),
    totalPot: "0",
    prizePool: "0",
    houseEarnings: "0",
    drawnNumbers: [],
    playerCount: 0,
  }).returning();

  logger.info({ gameId: newGame.id }, "New waiting game created");
  return newGame;
}

async function startDrawing(gameId: number) {
  if (drawInterval) clearInterval(drawInterval);
  currentGameId = gameId;

  const settings = await getSettings();
  const intervalMs = settings.drawIntervalMs;

  drawInterval = setInterval(async () => {
    const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
    if (!game || game.status !== "active") {
      if (drawInterval) clearInterval(drawInterval);
      return;
    }

    const drawnNumbers = (game.drawnNumbers as number[]) ?? [];
    if (drawnNumbers.length >= 75) {
      if (drawInterval) clearInterval(drawInterval);
      return;
    }

    const newNumber = drawNextNumber(drawnNumbers);
    if (!newNumber) {
      if (drawInterval) clearInterval(drawInterval);
      return;
    }

    const updatedNumbers = [...drawnNumbers, newNumber];
    const [updatedGame] = await db.update(gamesTable)
      .set({ drawnNumbers: updatedNumbers })
      .where(eq(gamesTable.id, gameId))
      .returning();

    const io = getIo();
    if (io) {
      io.emit("numberDrawn", { number: newNumber, game: formatGame(updatedGame) });
      io.emit("gameUpdate", { game: formatGame(updatedGame) });
    }

    logger.info({ gameId, number: newNumber }, "Number drawn");
  }, intervalMs);
}

async function checkAndStartGame(gameId: number) {
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game || game.status !== "waiting") return;

  const settings = await getSettings();
  if (game.playerCount < settings.minPlayers) return;

  const [activeGame] = await db.update(gamesTable)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(gamesTable.id, gameId))
    .returning();

  const io = getIo();
  if (io) {
    io.emit("gameStarted", { game: formatGame(activeGame) });
    io.emit("gameUpdate", { game: formatGame(activeGame) });
  }

  logger.info({ gameId }, "Game started");
  await startDrawing(gameId);
}

export async function startGameEngine() {
  logger.info("Game engine starting");

  // Ensure there's always a waiting game
  const game = await ensureWaitingGame();

  // Check every 30 seconds if we should start a game
  setInterval(async () => {
    const [current] = await db.select().from(gamesTable).where(ne(gamesTable.status, "finished")).limit(1);
    if (!current) {
      await ensureWaitingGame();
      return;
    }
    if (current.status === "waiting" && current.playerCount > 0) {
      await checkAndStartGame(current.id);
    }
  }, 30000);

  logger.info({ gameId: game.id }, "Game engine ready");
}
