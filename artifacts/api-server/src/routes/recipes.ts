import { Router } from "express";
import { db, recipesTable, ingredientsTable, favoritesTable } from "@workspace/db";
import { eq, ilike, and, lte, inArray } from "drizzle-orm";
import { GenerateRecipeBody, ListRecipesQueryParams, GetRecipeParams } from "@workspace/api-zod";
import { generateRecipeFromAI, fetchUnsplashImage, generateFoodImageForSeed } from "../services/openai.js";

const router = Router();

function formatRecipeSummary(r: typeof recipesTable.$inferSelect, isFavorited = false) {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    imageUrl: r.imageUrl ?? null,
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
    imageUrl: r.imageUrl ?? null,
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

router.post("/recipes/generate", async (req, res) => {
  const parsed = GenerateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { ingredientIds, timePreference, difficulty, cookingMethod, cuisineStyle } = parsed.data;

  let userIngredients: string[] = [];
  if (ingredientIds && ingredientIds.length > 0) {
    const rows = await db.select().from(ingredientsTable).where(inArray(ingredientsTable.id, ingredientIds));
    userIngredients = rows.map((r) => r.name);
  }

  req.log.info({ userIngredients, difficulty, cuisineStyle }, "Generating AI recipe");

  let generated;
  try {
    generated = await generateRecipeFromAI({
      ingredients: userIngredients,
      time: timePreference ?? undefined,
      difficulty: difficulty ?? undefined,
      cookingMethod: cookingMethod ?? undefined,
      cuisineStyle: cuisineStyle ?? undefined,
    });
  } catch (err) {
    req.log.error({ err }, "OpenAI recipe generation failed");
    res.status(500).json({ error: "Failed to generate recipe" });
    return;
  }

  // Fetch Unsplash image in parallel-ish — after OpenAI completes
  const imageUrl = await fetchUnsplashImage(generated.title);

  // Map new schema → DB columns
  // Steps stored as {number, title, description, substitutes} for compatibility with substitution sheet
  const dbSteps = generated.steps.map((s) => ({
    number: s.step,
    title: s.title,
    description: s.instruction,
    alternative: s.alternative,
    // Build substitutes map from ingredients mentioned in this step
    substitutes: Object.fromEntries(
      generated.ingredients
        .filter((ing) => s.instruction.toLowerCase().includes(ing.name.toLowerCase()))
        .map((ing) => [ing.name, ing.substitutes])
    ),
  }));

  // Ingredients stored as {name, emoji, quantity} for compatibility
  const dbIngredients = generated.ingredients.map((ing) => ({
    name: ing.name,
    emoji: ing.emoji ?? "🥬",
    quantity: ing.amount,
    substitutes: ing.substitutes,
  }));

  const kcal = generated.nutrition_per_serving.calories;
  const protein = `${generated.nutrition_per_serving.protein_g}g`;
  const carbs = `${generated.nutrition_per_serving.carbs_g}g`;
  const fat = `${generated.nutrition_per_serving.fat_g}g`;

  // Pick a representative emoji by cuisine
  const cuisineEmojiMap: Record<string, string> = {
    italian: "🍝", asian: "🥢", japanese: "🍜", chinese: "🥡", mexican: "🌮",
    indian: "🍛", mediterranean: "🫒", american: "🍔", french: "🥐",
    breakfast: "🍳", dessert: "🍰", soup: "🥣", salad: "🥗",
  };
  const emoji = cuisineEmojiMap[generated.cuisine.toLowerCase()] ?? "🍽️";

  const [saved] = await db
    .insert(recipesTable)
    .values({
      name: generated.title,
      emoji,
      imageUrl: imageUrl ?? null,
      timeMinutes: generated.time_minutes,
      difficulty: generated.difficulty.charAt(0).toUpperCase() + generated.difficulty.slice(1),
      category: generated.cuisine,
      diet: null,
      kcal,
      protein,
      carbs,
      fat,
      ingredients: dbIngredients,
      steps: dbSteps,
      isTrending: false,
    })
    .returning();

  req.log.info({ recipeId: saved.id, name: saved.name }, "AI recipe saved");
  res.json(formatRecipeFull(saved, []));
});

const SEED_CATEGORIES = [
  "Italian", "Asian", "American", "Mexican",
  "Mediterranean", "Indian", "Breakfast", "Dessert", "Soup", "Salad",
];
const SEED_DIFFICULTIES = ["Easy", "Medium", "Hard"];

router.post("/recipes/ai-seed", async (req, res) => {
  const count = Math.min(Number((req.body as any)?.count) || 6, 10);

  req.log.info({ count }, "Starting AI recipe seeding");

  // Generate all recipe texts in parallel
  const categories = SEED_CATEGORIES.slice(0, count);
  const textResults = await Promise.allSettled(
    categories.map((category, i) =>
      generateRecipeFromAI({
        ingredients: [],
        cuisineStyle: category,
        difficulty: SEED_DIFFICULTIES[i % 3],
      }),
    ),
  );

  // Fetch Unsplash images in parallel for successful text results
  const imageResults = await Promise.allSettled(
    textResults.map((r) =>
      r.status === "fulfilled"
        ? generateFoodImageForSeed(r.value.title)
        : Promise.resolve(null),
    ),
  );

  const recipes = [];
  for (let i = 0; i < textResults.length; i++) {
    const textResult = textResults[i];
    if (textResult.status === "rejected") {
      req.log.warn({ category: categories[i], err: textResult.reason }, "Recipe text generation failed");
      continue;
    }
    const generated = textResult.value;
    const imgResult = imageResults[i];
    const imageUrl = imgResult.status === "fulfilled" ? imgResult.value : null;

    const seedCuisineEmojiMap: Record<string, string> = {
      italian: "🍝", asian: "🥢", japanese: "🍜", chinese: "🥡", mexican: "🌮",
      indian: "🍛", mediterranean: "🫒", american: "🍔", french: "🥐",
      breakfast: "🍳", dessert: "🍰", soup: "🥣", salad: "🥗",
    };
    const seedEmoji = seedCuisineEmojiMap[generated.cuisine.toLowerCase()] ?? "🍽️";

    const seedSteps = generated.steps.map((s) => ({
      number: s.step,
      title: s.title,
      description: s.instruction,
      alternative: s.alternative,
      substitutes: Object.fromEntries(
        generated.ingredients
          .filter((ing) => s.instruction.toLowerCase().includes(ing.name.toLowerCase()))
          .map((ing) => [ing.name, ing.substitutes])
      ),
    }));

    const seedIngredients = generated.ingredients.map((ing) => ({
      name: ing.name,
      emoji: ing.emoji ?? "🥬",
      quantity: ing.amount,
      substitutes: ing.substitutes,
    }));

    try {
      const [saved] = await db
        .insert(recipesTable)
        .values({
          name: generated.title,
          emoji: seedEmoji,
          imageUrl: imageUrl ?? null,
          timeMinutes: generated.time_minutes,
          difficulty: generated.difficulty.charAt(0).toUpperCase() + generated.difficulty.slice(1),
          category: generated.cuisine,
          diet: null,
          kcal: generated.nutrition_per_serving.calories,
          protein: `${generated.nutrition_per_serving.protein_g}g`,
          carbs: `${generated.nutrition_per_serving.carbs_g}g`,
          fat: `${generated.nutrition_per_serving.fat_g}g`,
          ingredients: seedIngredients,
          steps: seedSteps,
          isTrending: i < 3,
        })
        .returning();
      recipes.push(formatRecipeSummary(saved));
      req.log.info({ recipeId: saved.id, name: saved.name }, "AI-seeded recipe saved");
    } catch (err) {
      req.log.error({ err, name: generated.title }, "Failed to save seeded recipe");
    }
  }

  res.json({ generated: recipes.length, recipes });
});

router.get("/recipes", async (req, res) => {
  const parsed = ListRecipesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }

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

  const favs = await db.select({ recipeId: favoritesTable.recipeId }).from(favoritesTable);
  const favSet = new Set(favs.map((f) => f.recipeId));

  res.json(rows.map((r) => formatRecipeSummary(r, favSet.has(r.id))));
});

router.get("/recipes/trending", async (req, res) => {
  const rows = await db.select().from(recipesTable).where(eq(recipesTable.isTrending, true)).limit(6);
  const favs = await db.select({ recipeId: favoritesTable.recipeId }).from(favoritesTable);
  const favSet = new Set(favs.map((f) => f.recipeId));
  res.json(rows.map((r) => formatRecipeSummary(r, favSet.has(r.id))));
});

router.get("/recipes/:id", async (req, res) => {
  const parsed = GetRecipeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(recipesTable).where(eq(recipesTable.id, parsed.data.id));
  if (!row) { res.status(404).json({ error: "Recipe not found" }); return; }

  res.json(formatRecipeFull(row));
});

router.delete("/recipes/:id", async (req, res) => {
  const parsed = GetRecipeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(recipesTable)
    .where(eq(recipesTable.id, parsed.data.id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Recipe not found" }); return; }

  req.log.info({ recipeId: deleted.id, name: deleted.name }, "Recipe deleted");
  res.status(204).send();
});

export default router;
