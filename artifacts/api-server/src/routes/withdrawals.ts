import { Router, type IRouter } from "express";
import { eq, desc, count, and } from "drizzle-orm";
import { db, withdrawalsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  ListWithdrawalsQueryParams,
  CreateWithdrawalBody,
  ApproveWithdrawalParams,
  CompleteWithdrawalParams,
  RejectWithdrawalParams,
  RejectWithdrawalBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function formatWithdrawal(withdrawal: typeof withdrawalsTable.$inferSelect) {
  const [user] = await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, withdrawal.userId));
  return {
    id: withdrawal.id,
    userId: withdrawal.userId,
    username: user?.username ?? null,
    amount: parseFloat(String(withdrawal.amount)),
    status: withdrawal.status,
    telebirrNumber: withdrawal.telebirrNumber,
    rejectionReason: withdrawal.rejectionReason,
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

// List withdrawals
router.get("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const query = ListWithdrawalsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page = 1, limit = 20, status } = query.data;
  const offset = (page - 1) * limit;
  const isAdmin = req.user?.role === "admin";

  const userFilter = !isAdmin ? eq(withdrawalsTable.userId, req.user!.userId) : undefined;
  const statusFilter = status ? eq(withdrawalsTable.status, status) : undefined;
  const where = userFilter && statusFilter ? and(userFilter, statusFilter) : (userFilter ?? statusFilter);

  const [withdrawals, [{ total }]] = await Promise.all([
    db.select().from(withdrawalsTable).where(where).orderBy(desc(withdrawalsTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(withdrawalsTable).where(where),
  ]);

  const formatted = await Promise.all(withdrawals.map(formatWithdrawal));
  res.json({ data: formatted, total: Number(total), page, limit });
});

// Create withdrawal
router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const body = CreateWithdrawalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const balance = parseFloat(String(user.balance));
  if (balance < body.data.amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Hold the funds
  const [[withdrawal]] = await Promise.all([
    db.insert(withdrawalsTable).values({
      userId: req.user!.userId,
      amount: String(body.data.amount),
      telebirrNumber: body.data.telebirrNumber,
      status: "pending",
    }).returning(),
    db.update(usersTable).set({ balance: String(balance - body.data.amount) }).where(eq(usersTable.id, req.user!.userId)),
  ]);

  res.status(201).json(await formatWithdrawal(withdrawal));
});

// Approve withdrawal
router.patch("/withdrawals/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const params = ApproveWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [updated] = await db.update(withdrawalsTable).set({ status: "approved" }).where(eq(withdrawalsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  res.json(await formatWithdrawal(updated));
});

// Complete withdrawal
router.patch("/withdrawals/:id/complete", requireAdmin, async (req, res): Promise<void> => {
  const params = CompleteWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [updated] = await db.update(withdrawalsTable).set({ status: "completed" }).where(eq(withdrawalsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }
  res.json(await formatWithdrawal(updated));
});

// Reject withdrawal
router.patch("/withdrawals/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const params = RejectWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RejectWithdrawalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, params.data.id));
  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  // Refund the amount
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, withdrawal.userId));
  const [[updated]] = await Promise.all([
    db.update(withdrawalsTable).set({ status: "rejected", rejectionReason: body.data.reason }).where(eq(withdrawalsTable.id, params.data.id)).returning(),
    db.update(usersTable).set({ balance: String(parseFloat(String(user.balance)) + parseFloat(String(withdrawal.amount))) }).where(eq(usersTable.id, withdrawal.userId)),
  ]);

  res.json(await formatWithdrawal(updated));
});

export default router;
