import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { db, usersTable } from "@workspace/db";
import { TelegramAuthBody, AdminLoginBody } from "@workspace/api-zod";
import { signToken } from "../middlewares/auth";
import { generateReferralCode } from "../lib/referral";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "bingo_admin_2024";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const IS_DEV = process.env.NODE_ENV !== "production";

// Validate Telegram initData HMAC signature
function validateTelegramInitData(initData: string): boolean {
  if (!BOT_TOKEN) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");

    // Build data_check_string: sorted key=value pairs joined by \n
    const entries = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    // Secret key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expectedHash = createHmac("sha256", secretKey).update(entries).digest("hex");

    return expectedHash === hash;
  } catch {
    return false;
  }
}

// Telegram authentication
router.post("/auth/telegram", async (req, res): Promise<void> => {
  const parsed = TelegramAuthBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const initData = parsed.data.initData;
  let telegramUser: { id: number; username?: string; first_name: string; last_name?: string; photo_url?: string } | null = null;

  // Try to parse as Telegram initData (URL-encoded from WebApp)
  const params = new URLSearchParams(initData);
  const userStr = params.get("user");

  if (userStr) {
    // Validate HMAC in production
    if (!IS_DEV && !validateTelegramInitData(initData)) {
      logger.warn({ initData }, "Invalid Telegram HMAC signature");
      res.status(401).json({ error: "Invalid Telegram signature" });
      return;
    }
    try {
      telegramUser = JSON.parse(userStr);
    } catch {
      res.status(401).json({ error: "Malformed user in initData" });
      return;
    }
  } else {
    // Dev/test mode: accept raw JSON
    if (!IS_DEV) {
      res.status(401).json({ error: "Invalid initData format" });
      return;
    }
    try {
      telegramUser = JSON.parse(initData);
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
