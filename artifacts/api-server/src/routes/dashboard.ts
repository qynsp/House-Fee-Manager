import { Router, type IRouter } from "express";
import { eq, count, sum, ne } from "drizzle-orm";
import { db, usersTable, gamesTable, ticketsTable, depositsTable, withdrawalsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsersResult,
    activeGamesResult,
    pendingDepositsResult,
    pendingWithdrawalsResult,
    totalTicketsResult,
    finishedGames,
    allGames,
  ] = await Promise.all([
    db.select({ total: count() }).from(usersTable),
    db.select({ total: count() }).from(gamesTable).where(ne(gamesTable.status, "finished")),
    db.select({ total: count() }).from(depositsTable).where(eq(depositsTable.status, "pending")),
    db.select({ total: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending")),
    db.select({ total: count() }).from(ticketsTable),
    db.select({
      houseEarnings: sum(gamesTable.houseEarnings),
      totalPot: sum(gamesTable.totalPot),
      prizePool: sum(gamesTable.prizePool),
      playerCount: sum(gamesTable.playerCount),
      gameCount: count(),
    }).from(gamesTable).where(eq(gamesTable.status, "finished")),
    db.select({
      houseEarnings: gamesTable.houseEarnings,
      createdAt: gamesTable.createdAt,
    }).from(gamesTable).where(eq(gamesTable.status, "finished")),
  ]);

  const totalRevenue = parseFloat(String(finishedGames[0]?.totalPot ?? 0));
  const houseEarnings = parseFloat(String(finishedGames[0]?.houseEarnings ?? 0));
  const prizePoolTotal = parseFloat(String(finishedGames[0]?.prizePool ?? 0));
  const totalTicketsSold = Number(totalTicketsResult[0]?.total ?? 0);
  const gameCount = Number(finishedGames[0]?.gameCount ?? 0);
  const totalPlayerCount = Number(finishedGames[0]?.playerCount ?? 0);
  const avgPlayersPerGame = gameCount > 0 ? Math.round((totalPlayerCount / gameCount) * 100) / 100 : 0;

  // Calculate time-based profits from all finished games
  const dailyProfit = allGames
    .filter((g) => g.createdAt >= dayAgo)
    .reduce((sum, g) => sum + parseFloat(String(g.houseEarnings ?? 0)), 0);
  const weeklyProfit = allGames
    .filter((g) => g.createdAt >= weekAgo)
    .reduce((sum, g) => sum + parseFloat(String(g.houseEarnings ?? 0)), 0);
  const monthlyProfit = allGames
    .filter((g) => g.createdAt >= monthAgo)
    .reduce((sum, g) => sum + parseFloat(String(g.houseEarnings ?? 0)), 0);

  res.json({
    totalRevenue,
    houseEarnings,
    prizePoolTotal,
    dailyProfit,
    weeklyProfit,
    monthlyProfit,
    totalTicketsSold,
    avgPlayersPerGame,
    totalUsers: Number(totalUsersResult[0]?.total ?? 0),
    activeGames: Number(activeGamesResult[0]?.total ?? 0),
    pendingDeposits: Number(pendingDepositsResult[0]?.total ?? 0),
    pendingWithdrawals: Number(pendingWithdrawalsResult[0]?.total ?? 0),
  });
});

export default router;
