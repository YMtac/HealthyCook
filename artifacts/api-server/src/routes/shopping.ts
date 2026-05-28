import { Router } from "express";
import { db, shoppingItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateShoppingItemBody,
  UpdateShoppingItemParams,
  UpdateShoppingItemBody,
  DeleteShoppingItemParams,
} from "@workspace/api-zod";

const router = Router();

function formatItem(r: typeof shoppingItemsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    quantity: r.quantity,
    category: r.category,
    checked: r.checked,
    recipeId: r.recipeId,
    recipeName: r.recipeName,
  };
}

router.get("/shopping", async (_req, res) => {
  const rows = await db
    .select()
    .from(shoppingItemsTable)
    .orderBy(shoppingItemsTable.createdAt);
  res.json(rows.map(formatItem));
});

router.post("/shopping", async (req, res) => {
  const parsed = CreateShoppingItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db
    .insert(shoppingItemsTable)
    .values({
      name: parsed.data.name,
      emoji: parsed.data.emoji ?? null,
      quantity: parsed.data.quantity,
      category: parsed.data.category,
      recipeId: parsed.data.recipeId ?? null,
    })
    .returning();
  res.status(201).json(formatItem(row));
});

router.patch("/shopping/:id", async (req, res) => {
  const paramsParsed = UpdateShoppingItemParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = UpdateShoppingItemBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Partial<typeof shoppingItemsTable.$inferInsert> = {};
  if (bodyParsed.data.checked !== undefined) updates.checked = bodyParsed.data.checked;
  if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.quantity !== undefined) updates.quantity = bodyParsed.data.quantity;
  if (bodyParsed.data.category !== undefined) updates.category = bodyParsed.data.category;

  const [row] = await db
    .update(shoppingItemsTable)
    .set(updates)
    .where(eq(shoppingItemsTable.id, paramsParsed.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatItem(row));
});

router.delete("/shopping/:id", async (req, res) => {
  const parsed = DeleteShoppingItemParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(shoppingItemsTable).where(eq(shoppingItemsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
