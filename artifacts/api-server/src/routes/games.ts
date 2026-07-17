import { Router, type IRouter } from "express";
import { eq, desc, count, and, ne } from "drizzle-orm";
import { db, gamesTable, ticketsTable, usersTable, houseSettingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  ListGamesQueryParams,
  GetGameParams,
  BuyTicketParams,
  ClaimBingoParams,
  ClaimBingoBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { generateCardForCartela, validateBingo, TOTAL_CARTELAS } from "../lib/bingo";
import { getIo } from "../lib/socket";

const router: IRouter = Router();

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

function formatTicket(ticket: typeof ticketsTable.$inferSelect) {
  return {
    id: ticket.id,
    gameId: ticket.gameId,
    userId: ticket.userId,
    cartelaNumber: ticket.cartelaNumber ?? 0,
    card: ticket.card as number[][],
    markedNumbers: (ticket.markedNumbers as number[]) ?? [],
    isWinner: ticket.isWinner,
    prizeAmount: ticket.prizeAmount ? parseFloat(String(ticket.prizeAmount)) : null,
    purchasedAt: ticket.purchasedAt.toISOString(),
  };
}

// List games
router.get("/games", async (req, res): Promise<void> => {
  const query = ListGamesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page = 1, limit = 10, status } = query.data;
  const offset = (page - 1) * limit;
  const where = status ? eq(gamesTable.status, status) : undefined;

  const [games, [{ total }]] = await Promise.all([
    db.select().from(gamesTable).where(where).orderBy(desc(gamesTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(gamesTable).where(where),
  ]);

  res.json({ data: games.map((g) => formatGame(g)), total: Number(total), page, limit });
});

// Get current game
router.get("/games/current", async (_req, res): Promise<void> => {
  const [game] = await db.select().from(gamesTable)
    .where(ne(gamesTable.status, "finished"))
    .orderBy(desc(gamesTable.createdAt))
    .limit(1);

  if (!game) {
    res.status(404).json({ error: "No active game" });
    return;
  }

  let winnerUsername: string | null = null;
  if (game.winnerId) {
    const [winner] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, game.winnerId));
    winnerUsername = winner?.username ?? null;
  }
  res.json(formatGame(game, winnerUsername));
});

// Get game by ID
router.get("/games/:id", async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  let winnerUsername: string | null = null;
  if (game.winnerId) {
    const [winner] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, game.winnerId));
    winnerUsername = winner?.username ?? null;
  }
  res.json(formatGame(game, winnerUsername));
});

const BuyTicketBodySchema = z.object({
  cartelaNumber: z.number().int().min(1).max(TOTAL_CARTELAS),
});

// Get cartela availability for a game
router.get("/games/:id/cartelas", async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tickets = await db
    .select({ cartelaNumber: ticketsTable.cartelaNumber })
    .from(ticketsTable)
    .where(eq(ticketsTable.gameId, params.data.id));

  res.json({
    takenCartelas: tickets.map((t) => t.cartelaNumber).filter(Boolean),
    total: TOTAL_CARTELAS,
  });
});

// Buy ticket
router.post("/games/:id/tickets", requireAuth, async (req, res): Promise<void> => {
  const params = BuyTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = BuyTicketBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "cartelaNumber (1-400) is required" });
    return;
  }
  const { cartelaNumber } = body.data;

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  if (game.status !== "waiting") {
    res.status(400).json({ error: "Game is not accepting tickets" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const ticketPrice = parseFloat(String(game.ticketPrice));
  const balance = parseFloat(String(user.balance));

  if (balance < ticketPrice) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Check user hasn't already bought 2 cartelas for this game
  const userTickets = await db.select().from(ticketsTable).where(
    and(eq(ticketsTable.gameId, params.data.id), eq(ticketsTable.userId, req.user!.userId))
  );
  if (userTickets.length >= 2) {
    res.status(400).json({ error: "Maximum 2 cartelas per game" });
    return;
  }

  // Check chosen cartela isn't already taken
  const [takenCartela] = await db.select().from(ticketsTable).where(
    and(eq(ticketsTable.gameId, params.data.id), eq(ticketsTable.cartelaNumber, cartelaNumber))
  );
  if (takenCartela) {
    res.status(400).json({ error: "This cartela is already taken" });
    return;
  }

  const card = generateCardForCartela(cartelaNumber);
  const houseFeePct = parseFloat(String(game.houseFee));
  const newTotalPot = parseFloat(String(game.totalPot)) + ticketPrice;
  const newHouseEarnings = newTotalPot * (houseFeePct / 100);
  const newPrizePool = newTotalPot - newHouseEarnings;

  // Only increment playerCount on the first cartela purchase
  const isFirstTicket = userTickets.length === 0;

  const [[ticket]] = await Promise.all([
    db.insert(ticketsTable).values({
      gameId: params.data.id,
      userId: req.user!.userId,
      cartelaNumber,
      card,
      markedNumbers: [],
      isWinner: false,
    }).returning(),
    db.update(usersTable).set({
      balance: String(balance - ticketPrice),
      ...(isFirstTicket ? { totalGames: user.totalGames + 1 } : {}),
    }).where(eq(usersTable.id, req.user!.userId)),
    db.update(gamesTable).set({
      totalPot: String(newTotalPot),
      prizePool: String(newPrizePool),
      houseEarnings: String(newHouseEarnings),
      ...(isFirstTicket ? { playerCount: game.playerCount + 1 } : {}),
    }).where(eq(gamesTable.id, params.data.id)),
  ]);

  // Emit events
  const io = getIo();
  if (io) {
    const [updatedGame] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
    if (isFirstTicket) io.emit("playerJoined", { playerCount: updatedGame.playerCount });
    io.emit("gameUpdate", { game: formatGame(updatedGame) });
  }

  res.status(201).json(formatTicket(ticket));
});

// Get user's tickets for a game
router.get("/games/:id/tickets", requireAuth, async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tickets = await db.select().from(ticketsTable).where(
    and(eq(ticketsTable.gameId, params.data.id), eq(ticketsTable.userId, req.user!.userId))
  );
  res.json(tickets.map(formatTicket));
});

// Claim bingo
router.post("/games/:id/claim", requireAuth, async (req, res): Promise<void> => {
  const params = ClaimBingoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ClaimBingoBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game || game.status !== "active") {
    res.status(400).json({ error: "Game is not active" });
    return;
  }
  if (game.winnerId) {
    res.status(400).json({ error: "Game already has a winner" });
    return;
  }

  const [ticket] = await db.select().from(ticketsTable).where(
    and(eq(ticketsTable.id, body.data.ticketId), eq(ticketsTable.userId, req.user!.userId))
  );
  if (!ticket || ticket.gameId !== params.data.id) {
    res.status(400).json({ error: "Ticket not found" });
    return;
  }

  const drawnNumbers = (game.drawnNumbers as number[]) ?? [];
  const card = ticket.card as number[][];
  const result = validateBingo(card, drawnNumbers);

  if (!result.valid) {
    res.json({ valid: false, message: "Not a valid bingo yet", prizeAmount: null, pattern: null });
    return;
  }

  const prizeAmount = parseFloat(String(game.prizePool));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  await Promise.all([
    db.update(ticketsTable).set({ isWinner: true, prizeAmount: String(prizeAmount) }).where(eq(ticketsTable.id, ticket.id)),
    db.update(gamesTable).set({ status: "finished", winnerId: req.user!.userId, winPattern: result.pattern, endedAt: new Date() }).where(eq(gamesTable.id, params.data.id)),
    db.update(usersTable).set({
      balance: String(parseFloat(String(user.balance)) + prizeAmount),
      totalWinnings: String(parseFloat(String(user.totalWinnings)) + prizeAmount),
      totalWins: user.totalWins + 1,
    }).where(eq(usersTable.id, req.user!.userId)),
  ]);

  // Emit winner event
  const io = getIo();
  if (io) {
    const [finishedGame] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
    io.emit("bingoWinner", {
      winner: { username: user.username, prizeAmount, pattern: result.pattern },
    });
    io.emit("gameFinished", { game: formatGame(finishedGame, user.username) });
  }

  // Create next game after a short delay
  setTimeout(async () => {
    const [settings] = await db.select().from(houseSettingsTable).limit(1);
    const ticketPrice = settings ? parseFloat(String(settings.ticketPrice)) : 10;
    const houseFeePct = settings ? parseFloat(String(settings.houseFeePct)) : 30;
    const [newGame] = await db.insert(gamesTable).values({
      status: "waiting",
      ticketPrice: String(ticketPrice),
      houseFee: String(houseFeePct),
      totalPot: "0",
      prizePool: "0",
      houseEarnings: "0",
      drawnNumbers: [],
      playerCount: 0,
    }).returning();
    const io2 = getIo();
    if (io2) {
      io2.emit("gameUpdate", { game: formatGame(newGame) });
    }
  }, 10000);

  res.json({ valid: true, message: "BINGO! You won!", prizeAmount, pattern: result.pattern });
});

// ─── ADMIN GAME CONTROLS ─────────────────────────────────────────────────────

// Get all tickets for a game (admin)
router.get("/games/:id/all-tickets", requireAdmin, async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const tickets = await db
    .select({
      id: ticketsTable.id,
      gameId: ticketsTable.gameId,
      userId: ticketsTable.userId,
      cartelaNumber: ticketsTable.cartelaNumber,
      card: ticketsTable.card,
      markedNumbers: ticketsTable.markedNumbers,
      isWinner: ticketsTable.isWinner,
      prizeAmount: ticketsTable.prizeAmount,
      purchasedAt: ticketsTable.purchasedAt,
      username: usersTable.username,
    })
    .from(ticketsTable)
    .leftJoin(usersTable, eq(ticketsTable.userId, usersTable.id))
    .where(eq(ticketsTable.gameId, params.data.id));

  res.json(tickets.map(t => ({
    ...formatTicket(t as typeof ticketsTable.$inferSelect),
    username: t.username ?? null,
  })));
});

// Stop a game (admin) — marks finished with no winner, creates next game
router.post("/games/:id/stop", requireAdmin, async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  if (game.status === "finished") { res.status(400).json({ error: "Game already finished" }); return; }

  const [stoppedGame] = await db
    .update(gamesTable)
    .set({ status: "finished", endedAt: new Date() })
    .where(eq(gamesTable.id, params.data.id))
    .returning();

  const io = getIo();
  if (io) {
    io.emit("gameFinished", { game: formatGame(stoppedGame) });
  }

  // Create next waiting game
  setTimeout(async () => {
    const [settings] = await db.select().from(houseSettingsTable).limit(1);
    const ticketPrice = settings ? parseFloat(String(settings.ticketPrice)) : 10;
    const houseFeePct = settings ? parseFloat(String(settings.houseFeePct)) : 30;
    const [newGame] = await db.insert(gamesTable).values({
      status: "waiting",
      ticketPrice: String(ticketPrice),
      houseFee: String(houseFeePct),
      totalPot: "0",
      prizePool: "0",
      houseEarnings: "0",
      drawnNumbers: [],
      playerCount: 0,
    }).returning();
    const io2 = getIo();
    if (io2) io2.emit("gameUpdate", { game: formatGame(newGame) });
  }, 3000);

  res.json({ message: "Game stopped", game: formatGame(stoppedGame) });
});

// Restart a game (admin) — resets drawn numbers and status to waiting
router.post("/games/:id/restart", requireAdmin, async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }

  const [restarted] = await db
    .update(gamesTable)
    .set({
      status: "waiting",
      drawnNumbers: [],
      winnerId: null,
      winPattern: null,
      startedAt: null,
      endedAt: null,
    })
    .where(eq(gamesTable.id, params.data.id))
    .returning();

  const io = getIo();
  if (io) io.emit("gameUpdate", { game: formatGame(restarted) });

  res.json({ message: "Game restarted", game: formatGame(restarted) });
});

// Force a winner (admin) — picks a ticket as the winner
const ForceWinnerBodySchema = z.object({ ticketId: z.number().int().positive() });

router.post("/games/:id/force-winner", requireAdmin, async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = ForceWinnerBodySchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "ticketId is required" }); return; }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) { res.status(404).json({ error: "Game not found" }); return; }
  if (game.status === "finished") { res.status(400).json({ error: "Game already finished" }); return; }

  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(and(eq(ticketsTable.id, body.data.ticketId), eq(ticketsTable.gameId, params.data.id)));
  if (!ticket) { res.status(404).json({ error: "Ticket not found in this game" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId));
  const prizeAmount = parseFloat(String(game.prizePool));

  await Promise.all([
    db.update(ticketsTable)
      .set({ isWinner: true, prizeAmount: String(prizeAmount) })
      .where(eq(ticketsTable.id, ticket.id)),
    db.update(gamesTable)
      .set({ status: "finished", winnerId: ticket.userId, winPattern: "force_win", endedAt: new Date() })
      .where(eq(gamesTable.id, params.data.id)),
    db.update(usersTable)
      .set({
        balance: String(parseFloat(String(user.balance)) + prizeAmount),
        totalWinnings: String(parseFloat(String(user.totalWinnings)) + prizeAmount),
        totalWins: user.totalWins + 1,
      })
      .where(eq(usersTable.id, ticket.userId)),
  ]);

  const io = getIo();
  if (io) {
    const [finishedGame] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
    io.emit("bingoWinner", { winner: { username: user.username, prizeAmount, pattern: "force_win" } });
    io.emit("gameFinished", { game: formatGame(finishedGame, user.username) });
  }

  // Create next game
  setTimeout(async () => {
    const [settings] = await db.select().from(houseSettingsTable).limit(1);
    const ticketPrice = settings ? parseFloat(String(settings.ticketPrice)) : 10;
    const houseFeePct = settings ? parseFloat(String(settings.houseFeePct)) : 30;
    const [newGame] = await db.insert(gamesTable).values({
      status: "waiting",
      ticketPrice: String(ticketPrice),
      houseFee: String(houseFeePct),
      totalPot: "0",
      prizePool: "0",
      houseEarnings: "0",
      drawnNumbers: [],
      playerCount: 0,
    }).returning();
    const io2 = getIo();
    if (io2) io2.emit("gameUpdate", { game: formatGame(newGame) });
  }, 5000);

  res.json({ message: "Winner forced", ticketId: ticket.id, userId: ticket.userId, prizeAmount });
});

export default router;
