import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const query = GetLeaderboardQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const limit = query.data.limit ?? 20;

  const users = await db.select().from(usersTable)
    .where(undefined)
    .orderBy(desc(usersTable.totalWinnings))
    .limit(limit);

  const entries = users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl,
    totalWinnings: parseFloat(String(user.totalWinnings)),
    totalWins: user.totalWins,
  }));

  res.json(entries);
});

export default router;
