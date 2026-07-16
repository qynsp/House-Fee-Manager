import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, houseSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatSettings(s: typeof houseSettingsTable.$inferSelect) {
  return {
    id: s.id,
    houseFeePct: parseFloat(String(s.houseFeePct)),
    ticketPrice: parseFloat(String(s.ticketPrice)),
    drawIntervalMs: s.drawIntervalMs,
    countdownSecs: s.countdownSecs,
    minPlayers: s.minPlayers,
    maxPlayers: s.maxPlayers,
    adminTelebirrNumber: s.adminTelebirrNumber,
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function getOrCreateSettings() {
  const [settings] = await db.select().from(houseSettingsTable).limit(1);
  if (settings) return settings;
  const [created] = await db.insert(houseSettingsTable).values({}).returning();
  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const settings = await getOrCreateSettings();
  const update: Record<string, string | number | undefined> = {};

  if (body.data.houseFeePct !== undefined) update.houseFeePct = String(body.data.houseFeePct);
  if (body.data.ticketPrice !== undefined) update.ticketPrice = String(body.data.ticketPrice);
  if (body.data.drawIntervalMs !== undefined) update.drawIntervalMs = body.data.drawIntervalMs;
  if (body.data.countdownSecs !== undefined) update.countdownSecs = body.data.countdownSecs;
  if (body.data.minPlayers !== undefined) update.minPlayers = body.data.minPlayers;
  if (body.data.maxPlayers !== undefined) update.maxPlayers = body.data.maxPlayers;
  if (body.data.adminTelebirrNumber !== undefined) update.adminTelebirrNumber = body.data.adminTelebirrNumber;

  const [updated] = await db.update(houseSettingsTable).set(update).where(eq(houseSettingsTable.id, settings.id)).returning();
  res.json(formatSettings(updated ?? settings));
});

export default router;
