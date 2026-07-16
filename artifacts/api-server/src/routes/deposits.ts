import { Router, type IRouter } from "express";
import { eq, desc, count, and } from "drizzle-orm";
import { db, depositsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  ListDepositsQueryParams,
  CreateDepositBody,
  ApproveDepositParams,
  RejectDepositParams,
  RejectDepositBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function formatDeposit(deposit: typeof depositsTable.$inferSelect) {
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, deposit.userId));
  return {
    id: deposit.id,
    userId: deposit.userId,
    username: user?.username ?? null,
    amount: parseFloat(String(deposit.amount)),
    status: deposit.status,
    telebirrNumber: deposit.telebirrNumber,
    transactionId: deposit.transactionId,
    screenshotUrl: deposit.screenshotUrl,
    rejectionReason: deposit.rejectionReason,
    createdAt: deposit.createdAt.toISOString(),
  };
}

// List deposits (admin gets all, user gets own)
router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const query = ListDepositsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page = 1, limit = 20, status } = query.data;
  const offset = (page - 1) * limit;
  const isAdmin = req.user?.role === "admin";

  const userFilter = !isAdmin ? eq(depositsTable.userId, req.user!.userId) : undefined;
  const statusFilter = status ? eq(depositsTable.status, status) : undefined;
  const where = userFilter && statusFilter ? and(userFilter, statusFilter) : (userFilter ?? statusFilter);

  const [deposits, [{ total }]] = await Promise.all([
    db.select().from(depositsTable).where(where).orderBy(desc(depositsTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(depositsTable).where(where),
  ]);

  const formatted = await Promise.all(deposits.map(formatDeposit));
  res.json({ data: formatted, total: Number(total), page, limit });
});

// Create deposit
router.post("/deposits", requireAuth, async (req, res): Promise<void> => {
  const body = CreateDepositBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [deposit] = await db.insert(depositsTable).values({
    userId: req.user!.userId,
    amount: String(body.data.amount),
    telebirrNumber: body.data.telebirrNumber,
    transactionId: body.data.transactionId,
    screenshotUrl: body.data.screenshotUrl ?? null,
    status: "pending",
  }).returning();

  res.status(201).json(await formatDeposit(deposit));
});

// Approve deposit
router.patch("/deposits/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const params = ApproveDepositParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, params.data.id));
  if (!deposit) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  if (deposit.status !== "pending") {
    res.status(400).json({ error: "Deposit is not pending" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, deposit.userId));
  const newBalance = parseFloat(String(user.balance)) + parseFloat(String(deposit.amount));

  const [[updated]] = await Promise.all([
    db.update(depositsTable).set({ status: "approved" }).where(eq(depositsTable.id, params.data.id)).returning(),
    db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, deposit.userId)),
  ]);

  res.json(await formatDeposit(updated));
});

// Reject deposit
router.patch("/deposits/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const params = RejectDepositParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RejectDepositBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db.update(depositsTable).set({ status: "rejected", rejectionReason: body.data.reason }).where(eq(depositsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Deposit not found" });
    return;
  }
  res.json(await formatDeposit(updated));
});

export default router;
