import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  totalWinnings: numeric("total_winnings", { precision: 12, scale: 2 }).notNull().default("0"),
  totalGames: integer("total_games").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  role: text("role", { enum: ["player", "admin"] }).notNull().default("player"),
  isBanned: boolean("is_banned").notNull().default(false),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
