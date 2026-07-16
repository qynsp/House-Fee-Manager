import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { CreateAnnouncementBody, DeleteAnnouncementParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatAnnouncement(a: typeof announcementsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/announcements", async (_req, res): Promise<void> => {
  const announcements = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(announcements.map(formatAnnouncement));
});

router.post("/announcements", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateAnnouncementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [announcement] = await db.insert(announcementsTable).values(body.data).returning();
  res.status(201).json(formatAnnouncement(announcement));
});

router.delete("/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
