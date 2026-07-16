import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, ticketsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { ListMyTicketsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatTicket(ticket: typeof ticketsTable.$inferSelect) {
  return {
    id: ticket.id,
    gameId: ticket.gameId,
    userId: ticket.userId,
    card: ticket.card as number[][],
    markedNumbers: (ticket.markedNumbers as number[]) ?? [],
    isWinner: ticket.isWinner,
    prizeAmount: ticket.prizeAmount ? parseFloat(String(ticket.prizeAmount)) : null,
    purchasedAt: ticket.purchasedAt.toISOString(),
  };
}

router.get("/tickets", requireAuth, async (req, res): Promise<void> => {
  const query = ListMyTicketsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page = 1, limit = 20 } = query.data;
  const offset = (page - 1) * limit;

  const [tickets, [{ total }]] = await Promise.all([
    db.select().from(ticketsTable).where(eq(ticketsTable.userId, req.user!.userId)).orderBy(desc(ticketsTable.purchasedAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(ticketsTable).where(eq(ticketsTable.userId, req.user!.userId)),
  ]);

  res.json({ data: tickets.map(formatTicket), total: Number(total), page, limit });
});

export default router;
