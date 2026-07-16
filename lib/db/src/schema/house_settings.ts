import { pgTable, serial, timestamp, numeric, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const houseSettingsTable = pgTable("house_settings", {
  id: serial("id").primaryKey(),
  houseFeePct: numeric("house_fee_pct", { precision: 5, scale: 2 }).notNull().default("30"),
  ticketPrice: numeric("ticket_price", { precision: 12, scale: 2 }).notNull().default("10"),
  drawIntervalMs: integer("draw_interval_ms").notNull().default(5000),
  countdownSecs: integer("countdown_secs").notNull().default(60),
  minPlayers: integer("min_players").notNull().default(2),
  maxPlayers: integer("max_players").notNull().default(100),
  adminTelebirrNumber: text("admin_telebirr_number").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHouseSettingsSchema = createInsertSchema(houseSettingsTable).omit({ id: true, updatedAt: true });
export type InsertHouseSettings = z.infer<typeof insertHouseSettingsSchema>;
export type HouseSettings = typeof houseSettingsTable.$inferSelect;
