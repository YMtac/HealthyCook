import { Router } from "express";
import { db, favoritesTable, recipesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AddFavoriteParams, RemoveFavoriteParams, GetFavoriteStatusParams } from "@workspace/api-zod";

const router = Router();

router.get("/favorites", async (_req, res) => {
  const favs = await db.select().from(favoritesTable).orderBy(favoritesTable.createdAt);
  if (favs.length === 0) {
    res.json([]);
    return;
  }
  const recipeIds = favs.map((f) => f.recipeId);
  const recipes = await db.select().from(recipesTable);
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const result = favs
    .map((f) => {
      const r = recipeMap.get(f.recipeId);
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        imageUrl: r.imageUrl ?? null,
        timeMinutes: r.timeMinutes,
        difficulty: r.difficulty,
        category: r.category,
        kcal: r.kcal,
        isFavorited: true,
      };
    })
    .filter(Boolean);

  res.json(result);
});

router.put("/favorites/:recipeId", async (req, res) => {
  const parsed = AddFavoriteParams.safeParse({ recipeId: Number(req.params.recipeId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // Upsert: delete existing then insert
  await db.delete(favoritesTable).where(eq(favoritesTable.recipeId, parsed.data.recipeId));
  await db.insert(favoritesTable).values({ recipeId: parsed.data.recipeId });
  res.status(201).json({ recipeId: parsed.data.recipeId, isFavorited: true });
});

router.delete("/favorites/:recipeId", async (req, res) => {
  const parsed = RemoveFavoriteParams.safeParse({ recipeId: Number(req.params.recipeId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(favoritesTable).where(eq(favoritesTable.recipeId, parsed.data.recipeId));
  res.status(204).send();
});

router.get("/favorites/:recipeId/status", async (req, res) => {
  const parsed = GetFavoriteStatusParams.safeParse({ recipeId: Number(req.params.recipeId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [fav] = await db
    .select()
    .from(favoritesTable)
    .where(eq(favoritesTable.recipeId, parsed.data.recipeId));
  res.json({ recipeId: parsed.data.recipeId, isFavorited: !!fav });
});

export default router;
