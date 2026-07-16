import { pgTable, serial, timestamp, numeric, integer, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  status: text("status", { enum: ["waiting", "active", "finished"] }).notNull().default("waiting"),
  ticketPrice: numeric("ticket_price", { precision: 12, scale: 2 }).notNull(),
  totalPot: numeric("total_pot", { precision: 12, scale: 2 }).notNull().default("0"),
  houseFee: numeric("house_fee", { precision: 5, scale: 2 }).notNull().default("30"),
  prizePool: numeric("prize_pool", { precision: 12, scale: 2 }).notNull().default("0"),
  houseEarnings: numeric("house_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  drawnNumbers: jsonb("drawn_numbers").notNull().$type<number[]>().default([]),
  playerCount: integer("player_count").notNull().default(0),
  winnerId: integer("winner_id"),
  winPattern: text("win_pattern"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true, createdAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
