import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { TelegramAuthBody, AdminLoginBody } from "@workspace/api-zod";
import { signToken } from "../middlewares/auth";
import { generateReferralCode } from "../lib/referral";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "bingo_admin_2024";

// Telegram authentication
router.post("/auth/telegram", async (req, res): Promise<void> => {
  const parsed = TelegramAuthBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Parse Telegram initData (in production, validate HMAC signature)
  let telegramUser: { id: number; username?: string; first_name: string; last_name?: string; photo_url?: string } | null = null;
  try {
    const params = new URLSearchParams(parsed.data.initData);
    const userStr = params.get("user");
    if (userStr) {
      telegramUser = JSON.parse(decodeURIComponent(userStr));
    }
  } catch {
    // In dev/test mode, accept a JSON body directly
    try {
      telegramUser = JSON.parse(parsed.data.initData);
    } catch {
      res.status(401).json({ error: "Invalid Telegram init data" });
      return;
    }
  }

  if (!telegramUser) {
    res.status(401).json({ error: "Could not extract user from initData" });
    return;
  }

  const telegramId = String(telegramUser.id);
  const username = telegramUser.username ?? `user_${telegramUser.id}`;

  // Upsert user
  let [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId));
  if (!user) {
    const referralCode = generateReferralCode(telegramId);
    [user] = await db.insert(usersTable).values({
      telegramId,
      username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      avatarUrl: telegramUser.photo_url ?? null,
      referralCode,
    }).returning();
  } else {
    // Update profile info
    [user] = await db.update(usersTable).set({
      username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      avatarUrl: telegramUser.photo_url ?? null,
    }).where(eq(usersTable.id, user.id)).returning();
  }

  if (user.isBanned) {
    res.status(401).json({ error: "Account is banned" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role as "player" | "admin", telegramId });
  res.json({ token, user: formatUser(user) });
});

// Admin login
router.post("/auth/admin", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Find or create admin user
  let [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  if (!admin) {
    [admin] = await db.insert(usersTable).values({
      telegramId: "admin_0",
      username: "admin",
      firstName: "Admin",
      referralCode: "ADMIN00000",
      role: "admin",
    }).returning();
  }

  const token = signToken({ userId: admin.id, role: "admin", telegramId: admin.telegramId });
  res.json({ token, user: formatUser(admin) });
});

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

export default router;
