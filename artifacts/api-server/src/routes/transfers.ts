import { Router, type IRouter } from "express";
import { eq, or, desc, count } from "drizzle-orm";
import { db, transfersTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod/v4";

const router: IRouter = Router();

const CreateTransferBody = z.object({
  recipientUsername: z.string().min(1),
  amount: z.coerce.number().positive().min(1),
  note: z.string().max(200).optional(),
});

const ListTransfersQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

async function formatTransfer(
  transfer: typeof transfersTable.$inferSelect,
  currentUserId: number
) {
  const [fromUser, toUser] = await Promise.all([
    db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, transfer.fromUserId)),
    db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, transfer.toUserId)),
  ]);

  return {
    id: transfer.id,
    fromUserId: transfer.fromUserId,
    fromUsername: fromUser[0]?.username ?? null,
    toUserId: transfer.toUserId,
    toUsername: toUser[0]?.username ?? null,
    amount: parseFloat(String(transfer.amount)),
    note: transfer.note ?? null,
    direction: transfer.fromUserId === currentUserId ? "sent" : "received",
    createdAt: transfer.createdAt.toISOString(),
  };
}

// List transfers for current user (sent + received)
router.get("/transfers", requireAuth, async (req, res): Promise<void> => {
  const query = ListTransfersQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { page, limit } = query.data;
  const offset = (page - 1) * limit;
  const userId = req.user!.userId;

  const where = or(eq(transfersTable.fromUserId, userId), eq(transfersTable.toUserId, userId));

  const [transfers, [{ total }]] = await Promise.all([
    db.select().from(transfersTable).where(where).orderBy(desc(transfersTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(transfersTable).where(where),
  ]);

  const formatted = await Promise.all(transfers.map(t => formatTransfer(t, userId)));
  res.json({ data: formatted, total: Number(total), page, limit });
});

// Create a transfer
router.post("/transfers", requireAuth, async (req, res): Promise<void> => {
  const body = CreateTransferBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const senderId = req.user!.userId;
  const { recipientUsername, amount, note } = body.data;

  // Find recipient
  const [recipient] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, recipientUsername));

  if (!recipient) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (recipient.id === senderId) {
    res.status(400).json({ error: "Cannot transfer to yourself" });
    return;
  }

  // Check sender balance
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, senderId));
  const senderBalance = parseFloat(String(sender.balance));

  if (senderBalance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const recipientBalance = parseFloat(String(recipient.balance));

  // Atomic: deduct from sender, credit recipient, insert transfer record
  const [[transfer]] = await Promise.all([
    db.insert(transfersTable).values({
      fromUserId: senderId,
      toUserId: recipient.id,
      amount: String(amount),
      note: note ?? null,
    }).returning(),
    db.update(usersTable)
      .set({ balance: String(senderBalance - amount) })
      .where(eq(usersTable.id, senderId)),
    db.update(usersTable)
      .set({ balance: String(recipientBalance + amount) })
      .where(eq(usersTable.id, recipient.id)),
  ]);

  res.status(201).json(await formatTransfer(transfer, senderId));
});

export default router;
