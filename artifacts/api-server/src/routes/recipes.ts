import { Router } from "express";
import { db, recipesTable, ingredientsTable, favoritesTable } from "@workspace/db";
import { eq, ilike, and, lte, inArray } from "drizzle-orm";
import { GenerateRecipeBody, ListRecipesQueryParams, GetRecipeParams } from "@workspace/api-zod";

const router = Router();

function formatRecipeSummary(r: typeof recipesTable.$inferSelect, isFavorited = false) {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    timeMinutes: r.timeMinutes,
    difficulty: r.difficulty,
    category: r.category,
    kcal: r.kcal,
    isFavorited,
  };
}

function formatRecipeFull(r: typeof recipesTable.$inferSelect, missingIngredients: string[] = []) {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    timeMinutes: r.timeMinutes,
    difficulty: r.difficulty,
    category: r.category,
    diet: r.diet,
    nutrition: {
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
    },
    ingredients: (r.ingredients as any[]) ?? [],
    steps: (r.steps as any[]) ?? [],
    missingIngredients,
  };
}

// Generate a recipe based on ingredients + preferences
router.post("/recipes/generate", async (req, res) => {
  const parsed = GenerateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { ingredientIds, difficulty, diet } = parsed.data;

  // Fetch user's ingredients
  let userIngredients: string[] = [];
  if (ingredientIds && ingredientIds.length > 0) {
    const rows = await db
      .select()
      .from(ingredientsTable)
      .where(inArray(ingredientsTable.id, ingredientIds));
    userIngredients = rows.map((r) => r.name.toLowerCase());
  }

  // Build query filters
  const conditions: any[] = [];
  if (difficulty && difficulty !== "Any") {
    conditions.push(eq(recipesTable.difficulty, difficulty));
  }
  if (diet && diet !== "Any") {
    conditions.push(eq(recipesTable.diet, diet));
  }

  const recipes = conditions.length > 0
    ? await db.select().from(recipesTable).where(and(...conditions))
    : await db.select().from(recipesTable);

  if (recipes.length === 0) {
    const any = await db.select().from(recipesTable).limit(1);
    if (any.length === 0) {
      res.status(404).json({ error: "No recipes found" });
      return;
    }
    const r = any[0];
    res.json(formatRecipeFull(r));
    return;
  }

  // Score recipes by how many user ingredients they use
  const scored = recipes.map((r) => {
    const recipeIngrs = ((r.ingredients as any[]) ?? []).map((i: any) =>
      i.name?.toLowerCase() ?? ""
    );
    const matches = recipeIngrs.filter((name) =>
      userIngredients.some((u) => name.includes(u) || u.includes(name))
    );
    const missing = recipeIngrs.filter(
      (name) => !userIngredients.some((u) => name.includes(u) || u.includes(name))
    );
    return { recipe: r, score: matches.length, missing };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  res.json(formatRecipeFull(best.recipe, best.missing));
});

// Browse / search recipes
router.get("/recipes", async (req, res) => {
  const parsed = ListRecipesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  const { search, category, maxTime, difficulty, diet } = parsed.data;
  const conditions: any[] = [];

  if (search) conditions.push(ilike(recipesTable.name, `%${search}%`));
  if (category && category !== "All") conditions.push(eq(recipesTable.category, category));
  if (maxTime) conditions.push(lte(recipesTable.timeMinutes, maxTime));
  if (difficulty && difficulty !== "Any") conditions.push(eq(recipesTable.difficulty, difficulty));
  if (diet && diet !== "Any") conditions.push(eq(recipesTable.diet, diet));

  const rows = conditions.length > 0
    ? await db.select().from(recipesTable).where(and(...conditions)).limit(20)
    : await db.select().from(recipesTable).limit(20);

  // Get favorites for status
  const favs = await db.select({ recipeId: favoritesTable.recipeId }).from(favoritesTable);
  const favSet = new Set(favs.map((f) => f.recipeId));

  res.json(rows.map((r) => formatRecipeSummary(r, favSet.has(r.id))));
});

// Trending recipes
router.get("/recipes/trending", async (req, res) => {
  const rows = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.isTrending, true))
    .limit(6);

  const favs = await db.select({ recipeId: favoritesTable.recipeId }).from(favoritesTable);
  const favSet = new Set(favs.map((f) => f.recipeId));

  res.json(rows.map((r) => formatRecipeSummary(r, favSet.has(r.id))));
});

// Get a single recipe
router.get("/recipes/:id", async (req, res) => {
  const parsed = GetRecipeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.id, parsed.data.id));

  if (!row) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }

  res.json(formatRecipeFull(row));
});

export default router;
