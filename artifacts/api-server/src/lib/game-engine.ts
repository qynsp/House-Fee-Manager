import { eq, ne, or } from "drizzle-orm";
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
    startingAt: game.startingAt?.toISOString() ?? null,
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
  const [existing] = await db
    .select()
    .from(gamesTable)
    .where(ne(gamesTable.status, "finished"))
    .limit(1);
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
      const formatted = formatGame(updatedGame);
      // Emit only to players in this game's room; numberDrawn already carries
      // the full game object so gameUpdate is redundant here.
      io.to(`game:${gameId}`).emit("numberDrawn", { number: newNumber, game: formatted });
    }

    logger.info({ gameId, number: newNumber }, "Number drawn");
  }, intervalMs);
}

/** Called when a new player joins — transitions waiting→starting with a countdown. */
export async function checkAndStartGame(gameId: number) {
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game || game.status !== "waiting") return;

  const settings = await getSettings();
  if (game.playerCount < settings.minPlayers) return;

  // Enough players — enter "starting" countdown
  const countdownMs = (settings.countdownSecs ?? 30) * 1000;
  const startingAt = new Date(Date.now() + countdownMs);

  const [startingGame] = await db.update(gamesTable)
    .set({ status: "starting", startingAt })
    .where(eq(gamesTable.id, gameId))
    .returning();

  const io = getIo();
  if (io) {
    const formatted = formatGame(startingGame);
    io.to(`game:${startingGame.id}`).emit("gameStarting", { game: formatted, startsInMs: countdownMs });
    io.to(`game:${startingGame.id}`).emit("gameUpdate", { game: formatted });
  }

  logger.info({ gameId, startingAt, countdownMs }, "Game entering countdown");
}

/** Periodically fires any countdown that has expired. */
async function tickCountdowns() {
  const [startingGame] = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.status, "starting"))
    .limit(1);

  if (!startingGame || !startingGame.startingAt) return;
  if (new Date() < startingGame.startingAt) return;

  // Countdown expired — go active
  const [activeGame] = await db.update(gamesTable)
    .set({ status: "active", startedAt: new Date() })
    .where(eq(gamesTable.id, startingGame.id))
    .returning();

  const io = getIo();
  if (io) {
    const formatted = formatGame(activeGame);
    io.to(`game:${activeGame.id}`).emit("gameStarted", { game: formatted });
    io.to(`game:${activeGame.id}`).emit("gameUpdate", { game: formatted });
  }

  logger.info({ gameId: startingGame.id }, "Game started after countdown");
  await startDrawing(startingGame.id);
}

export async function startGameEngine() {
  logger.info("Game engine starting");

  const game = await ensureWaitingGame();

  // Check countdown expirations every 2 seconds (fast tick)
  setInterval(async () => {
    await tickCountdowns();
  }, 2000);

  // Safety net: every 30s check if a waiting game with enough players missed the transition
  setInterval(async () => {
    const [current] = await db
      .select()
      .from(gamesTable)
      .where(ne(gamesTable.status, "finished"))
      .limit(1);
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
