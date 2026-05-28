import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shoppingItemsTable = pgTable("shopping_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  quantity: text("quantity").notNull().default("1"),
  category: text("category").notNull().default("Pantry"),
  checked: boolean("checked").notNull().default(false),
  recipeId: integer("recipe_id"),
  recipeName: text("recipe_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShoppingItemSchema = createInsertSchema(shoppingItemsTable).omit({ id: true, createdAt: true, checked: true });
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingItemsTable.$inferSelect;
