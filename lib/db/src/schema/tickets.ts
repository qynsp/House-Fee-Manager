import { pgTable, serial, timestamp, numeric, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  userId: integer("user_id").notNull(),
  card: jsonb("card").notNull().$type<number[][]>(),
  markedNumbers: jsonb("marked_numbers").notNull().$type<number[]>().default([]),
  isWinner: boolean("is_winner").notNull().default(false),
  prizeAmount: numeric("prize_amount", { precision: 12, scale: 2 }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, purchasedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
