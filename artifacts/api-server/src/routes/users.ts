import { Router, type IRouter } from "express";
import { eq, ilike, count, desc, or } from "drizzle-orm";
import { db, usersTable, ticketsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  GetUserParams,
  ListUsersQueryParams,
  AdjustBalanceParams,
  AdjustBalanceBody,
  BanUserParams,
  BanUserBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    balance: parseFloat(String(user.balance)),
    totalWinnings: parseFloat(String(user.totalWinnings)),
    totalGames: user.totalGames,
    totalWins: user.totalWins,
    role: user.role,
    isBanned: user.isBanned,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    createdAt: user.createdAt.toISOString(),
  };
}

// Get current user
router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// List all users (admin)
router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page = 1, limit = 20, search } = query.data;
  const offset = (page - 1) * limit;

  const where = search
    ? or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.firstName, `%${search}%`))
    : undefined;

  const [users, [{ total }]] = await Promise.all([
    db.select().from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(usersTable).where(where),
  ]);

  res.json({ data: users.map(formatUser), total: Number(total), page, limit });
});

// Get user by ID (admin)
router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// Adjust balance (admin)
router.patch("/users/:id/balance", requireAdmin, async (req, res): Promise<void> => {
  const params = AdjustBalanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = AdjustBalanceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = parseFloat(String(user.balance)) + body.data.amount;
  const [updated] = await db.update(usersTable).set({ balance: String(Math.max(0, newBalance)) }).where(eq(usersTable.id, params.data.id)).returning();
  res.json(formatUser(updated));
});

// Ban/unban user (admin)
router.patch("/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const params = BanUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = BanUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db.update(usersTable).set({ isBanned: body.data.banned }).where(eq(usersTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(updated));
});

// Get current user stats
router.get("/stats/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Calculate total spent from tickets
  const userTickets = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, req.user!.userId));
  const totalSpent = userTickets.reduce((sum, _) => sum, 0); // Will be computed from game ticket prices

  const winRate = user.totalGames > 0 ? (user.totalWins / user.totalGames) * 100 : 0;
  res.json({
    totalGames: user.totalGames,
    totalWins: user.totalWins,
    totalWinnings: parseFloat(String(user.totalWinnings)),
    totalSpent,
    winRate: Math.round(winRate * 100) / 100,
  });
});

export default router;
