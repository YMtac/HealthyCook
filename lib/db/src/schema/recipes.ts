import { pgTable, serial, text, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🍽️"),
  imageUrl: text("image_url"),
  timeMinutes: integer("time_minutes").notNull().default(30),
  difficulty: text("difficulty").notNull().default("Easy"),
  category: text("category").notNull().default("General"),
  diet: text("diet"),
  kcal: integer("kcal").notNull().default(300),
  protein: text("protein").notNull().default("10g"),
  carbs: text("carbs").notNull().default("30g"),
  fat: text("fat").notNull().default("8g"),
  ingredients: jsonb("ingredients").notNull().default([]),
  steps: jsonb("steps").notNull().default([]),
  isTrending: boolean("is_trending").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({ id: true, createdAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeRow = typeof recipesTable.$inferSelect;
