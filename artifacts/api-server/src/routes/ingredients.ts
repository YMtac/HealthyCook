import { Router } from "express";
import { db, ingredientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateIngredientBody, DeleteIngredientParams } from "@workspace/api-zod";

const router = Router();

router.get("/ingredients", async (req, res) => {
  const rows = await db.select().from(ingredientsTable).orderBy(ingredientsTable.createdAt);
  res.json(rows.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji })));
});

router.post("/ingredients", async (req, res) => {
  const parsed = CreateIngredientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db
    .insert(ingredientsTable)
    .values({ name: parsed.data.name, emoji: parsed.data.emoji })
    .returning();
  res.status(201).json({ id: row.id, name: row.name, emoji: row.emoji });
});

router.delete("/ingredients/:id", async (req, res) => {
  const parsed = DeleteIngredientParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(ingredientsTable).where(eq(ingredientsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
