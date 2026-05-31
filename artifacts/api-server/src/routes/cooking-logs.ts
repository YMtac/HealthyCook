import { Router } from "express";
import { db, cookingLogsTable, insertCookingLogSchema } from "@workspace/db";
import { gte, lte, and, desc, eq } from "drizzle-orm";
const router = Router();

router.get("/cooking-logs/streak", async (_req, res) => {
  const logs = await db
    .select({ cookedAt: cookingLogsTable.cookedAt })
    .from(cookingLogsTable)
    .orderBy(desc(cookingLogsTable.cookedAt));

  if (logs.length === 0) {
    res.json({ currentStreak: 0, longestStreak: 0, totalCooked: logs.length });
    return;
  }

  // Unique cooked dates (YYYY-MM-DD)
  const dateSets = new Set<string>();
  logs.forEach(l => dateSets.add(l.cookedAt.toISOString().split("T")[0]));
  const sortedDates = Array.from(dateSets).sort().reverse();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const startDate = sortedDates[0];
  if (startDate !== today && startDate !== yesterday) {
    currentStreak = 0;
  } else {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, sortedDates.length === 1 ? 1 : 0, currentStreak);

  res.json({ currentStreak, longestStreak, totalCooked: logs.length });
});

router.get("/cooking-logs/stats", async (req, res) => {
  const period = (req.query.period as string) || "week";
  const now = new Date();
  let from: Date;

  if (period === "week") {
    from = new Date(now.getTime() - 7 * 86400000);
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    from = new Date(now.getFullYear(), 0, 1);
  }

  const logs = await db
    .select()
    .from(cookingLogsTable)
    .where(gte(cookingLogsTable.cookedAt, from))
    .orderBy(desc(cookingLogsTable.cookedAt));

  const meals = logs.length;
  const totalKcal = logs.reduce((s, l) => s + l.kcal, 0);

  const parseGrams = (g: string) => parseFloat(g.replace(/[^\d.]/g, "")) || 0;
  const totalProtein = logs.reduce((s, l) => s + parseGrams(l.protein), 0);
  const totalCarbs = logs.reduce((s, l) => s + parseGrams(l.carbs), 0);
  const totalFat = logs.reduce((s, l) => s + parseGrams(l.fat), 0);

  res.json({
    period,
    totalKcal,
    avgProtein: meals > 0 ? `${Math.round(totalProtein / meals)}g` : "0g",
    avgCarbs: meals > 0 ? `${Math.round(totalCarbs / meals)}g` : "0g",
    avgFat: meals > 0 ? `${Math.round(totalFat / meals)}g` : "0g",
    meals,
  });
});

router.get("/cooking-logs", async (req, res) => {
  const conditions: any[] = [];
  if (req.query.from) conditions.push(gte(cookingLogsTable.cookedAt, new Date(req.query.from as string)));
  if (req.query.to) conditions.push(lte(cookingLogsTable.cookedAt, new Date(req.query.to as string)));

  const logs = conditions.length > 0
    ? await db.select().from(cookingLogsTable).where(and(...conditions)).orderBy(desc(cookingLogsTable.cookedAt))
    : await db.select().from(cookingLogsTable).orderBy(desc(cookingLogsTable.cookedAt));

  res.json(logs.map(l => ({
    id: l.id,
    recipeId: l.recipeId ?? 0,
    recipeName: l.recipeName,
    imageUrl: l.imageUrl ?? null,
    kcal: l.kcal,
    protein: l.protein,
    carbs: l.carbs,
    fat: l.fat,
    cookedAt: l.cookedAt.toISOString(),
  })));
});

router.post("/cooking-logs", async (req, res) => {
  const parsed = insertCookingLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db.insert(cookingLogsTable).values(parsed.data).returning();
  res.status(201).json({
    id: row.id,
    recipeId: row.recipeId ?? 0,
    recipeName: row.recipeName,
    imageUrl: row.imageUrl ?? null,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    cookedAt: row.cookedAt.toISOString(),
  });
});

router.delete("/cooking-logs/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(cookingLogsTable).where(eq(cookingLogsTable.id, id));
  res.status(204).end();
});

router.patch("/cooking-logs/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { recipeName, cookedAt } = req.body as { recipeName?: string; cookedAt?: string };

  const updates: Partial<typeof cookingLogsTable.$inferInsert> = {};
  if (typeof recipeName === "string" && recipeName.trim()) updates.recipeName = recipeName.trim();
  if (typeof cookedAt === "string" && cookedAt.trim()) updates.cookedAt = new Date(cookedAt);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" }); return;
  }

  const [row] = await db.update(cookingLogsTable).set(updates).where(eq(cookingLogsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    id: row.id,
    recipeId: row.recipeId ?? 0,
    recipeName: row.recipeName,
    imageUrl: row.imageUrl ?? null,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    cookedAt: row.cookedAt.toISOString(),
  });
});

export default router;
