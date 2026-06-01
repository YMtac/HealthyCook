import { Router } from "express";
import { db, exploreRecipesTable, recipesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateRecipeFromAI, fetchUnsplashImage } from "../services/openai.js";

const router = Router();

router.get("/explore/recipes", async (req, res) => {
  const cuisine = req.query.cuisine as string | undefined;
  const difficulty = req.query.difficulty as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 30), 100);

  const conditions = [];
  if (cuisine) conditions.push(eq(exploreRecipesTable.cuisine, cuisine));
  if (difficulty) conditions.push(eq(exploreRecipesTable.difficulty, difficulty));

  const rows = await db
    .select()
    .from(exploreRecipesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .orderBy(exploreRecipesTable.id);

  res.json(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      cuisine: r.cuisine,
      cuisineLabel: r.cuisineLabel,
      difficulty: r.difficulty,
      timeMinutes: r.timeMinutes,
      calories: r.calories,
      tags: r.tags,
      imageUrl: r.imageUrl,
      linkedRecipeId: r.linkedRecipeId,
    }))
  );
});

router.post("/explore/recipes/:id/generate", async (req, res) => {
  const exploreId = Number(req.params.id);
  if (isNaN(exploreId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [exploreRow] = await db
    .select()
    .from(exploreRecipesTable)
    .where(eq(exploreRecipesTable.id, exploreId))
    .limit(1);

  if (!exploreRow) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (exploreRow.linkedRecipeId) {
    const [existing] = await db
      .select()
      .from(recipesTable)
      .where(eq(recipesTable.id, exploreRow.linkedRecipeId))
      .limit(1);

    if (existing) {
      res.json(formatFull(existing));
      return;
    }
  }

  const generated = await generateRecipeFromAI({
    ingredients: [],
    time: exploreRow.timeMinutes ? `${exploreRow.timeMinutes} min` : undefined,
    difficulty: exploreRow.difficulty ?? undefined,
    cuisineStyle: exploreRow.cuisineLabel ?? exploreRow.cuisine ?? undefined,
    cookingMethod: "Any",
  });

  const imageUrl =
    exploreRow.imageUrl ?? (await fetchUnsplashImage(exploreRow.title));

  const cuisineCategory =
    exploreRow.cuisineLabel ??
    (exploreRow.cuisine
      ? exploreRow.cuisine.charAt(0).toUpperCase() + exploreRow.cuisine.slice(1)
      : "General");

  const dbIngredients = generated.ingredients.map((ing) => ({
    name: ing.name,
    emoji: ing.emoji ?? "🥬",
    quantity: ing.amount,
    substitutes: ing.substitutes,
  }));

  const dbSteps = generated.steps.map((s) => ({
    step: s.step,
    title: s.title,
    instruction: s.instruction,
    alternative: s.alternative,
  }));

  const [saved] = await db
    .insert(recipesTable)
    .values({
      name: exploreRow.title,
      emoji: "🍽️",
      imageUrl,
      timeMinutes: generated.time_minutes,
      difficulty:
        generated.difficulty.charAt(0).toUpperCase() +
        generated.difficulty.slice(1),
      category: cuisineCategory,
      kcal: generated.nutrition_per_serving.calories,
      protein: `${generated.nutrition_per_serving.protein_g}g`,
      carbs: `${generated.nutrition_per_serving.carbs_g}g`,
      fat: `${generated.nutrition_per_serving.fat_g}g`,
      ingredients: dbIngredients,
      steps: dbSteps,
      isTrending: false,
    })
    .returning();

  await db
    .update(exploreRecipesTable)
    .set({ linkedRecipeId: saved.id, imageUrl: imageUrl ?? exploreRow.imageUrl })
    .where(eq(exploreRecipesTable.id, exploreId));

  res.json(formatFull(saved));
});

function formatFull(r: typeof recipesTable.$inferSelect) {
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
    ingredients: (r.ingredients as unknown[]) ?? [],
    steps: (r.steps as unknown[]) ?? [],
    missingIngredients: [],
  };
}

export default router;
