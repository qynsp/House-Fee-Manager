import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const query = GetLeaderboardQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const limit = query.data.limit ?? 20;
  const includeHidden = req.query.includeHidden === "true";

  const users = await db.select().from(usersTable)
    .orderBy(desc(usersTable.totalWinnings))
    .limit(includeHidden ? 200 : limit);

  const filtered = includeHidden ? users : users.filter(u => !u.leaderboardHidden);

  const entries = filtered.slice(0, limit).map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    totalWinnings: parseFloat(String(user.totalWinnings)),
    totalWins: user.totalWins,
    leaderboardHidden: user.leaderboardHidden,
  }));

  res.json(entries);
});

router.patch("/leaderboard/:userId/hide", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  await db.update(usersTable).set({ leaderboardHidden: true }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.patch("/leaderboard/:userId/restore", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  await db.update(usersTable).set({ leaderboardHidden: false }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

export default router;
