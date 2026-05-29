import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recipesTable } from "./recipes";

export const cookingLogsTable = pgTable("cooking_logs", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").references(() => recipesTable.id),
  recipeName: text("recipe_name").notNull(),
  imageUrl: text("image_url"),
  kcal: integer("kcal").notNull().default(0),
  protein: text("protein").notNull().default("0g"),
  carbs: text("carbs").notNull().default("0g"),
  fat: text("fat").notNull().default("0g"),
  cookedAt: timestamp("cooked_at").defaultNow().notNull(),
});

export const insertCookingLogSchema = createInsertSchema(cookingLogsTable).omit({ id: true, cookedAt: true });
export type InsertCookingLog = z.infer<typeof insertCookingLogSchema>;
export type CookingLogRow = typeof cookingLogsTable.$inferSelect;
