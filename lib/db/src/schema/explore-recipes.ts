import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const exploreRecipesTable = pgTable("explore_recipes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  cuisine: text("cuisine"),
  cuisineLabel: text("cuisine_label"),
  difficulty: text("difficulty"),
  timeMinutes: integer("time_minutes"),
  calories: integer("calories"),
  tags: text("tags"),
  imageUrl: text("image_url"),
  recipeJson: text("recipe_json"),
  linkedRecipeId: integer("linked_recipe_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExploreRecipeRow = typeof exploreRecipesTable.$inferSelect;
