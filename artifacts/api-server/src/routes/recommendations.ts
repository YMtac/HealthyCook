import { Router } from "express";
import { db, favoritesTable, recipesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const router = Router();

interface RecommendedIngredient {
  name: string;
  emoji: string;
  reason: string;
  category: string;
  nutrient: string | null;
}

// Nutrient profiles per ingredient
const INGREDIENT_PROFILES: Record<string, { emoji: string; category: string; nutrients: string[] }> = {
  "Spinach": { emoji: "🥬", category: "Produce", nutrients: ["Iron", "Magnesium", "Folate"] },
  "Salmon": { emoji: "🐟", category: "Protein", nutrients: ["Omega-3", "Vitamin D", "Protein"] },
  "Lentils": { emoji: "🫘", category: "Pantry", nutrients: ["Protein", "Iron", "Fiber"] },
  "Sweet Potato": { emoji: "🍠", category: "Produce", nutrients: ["Vitamin A", "Fiber", "Potassium"] },
  "Greek Yogurt": { emoji: "🥛", category: "Dairy", nutrients: ["Calcium", "Protein", "Probiotics"] },
  "Blueberries": { emoji: "🫐", category: "Produce", nutrients: ["Antioxidants", "Vitamin C"] },
  "Almonds": { emoji: "🌰", category: "Pantry", nutrients: ["Vitamin E", "Healthy Fats", "Magnesium"] },
  "Broccoli": { emoji: "🥦", category: "Produce", nutrients: ["Vitamin C", "Vitamin K", "Fiber"] },
  "Chickpeas": { emoji: "🫘", category: "Pantry", nutrients: ["Protein", "Iron", "Zinc"] },
  "Avocado": { emoji: "🥑", category: "Produce", nutrients: ["Healthy Fats", "Potassium", "Fiber"] },
  "Quinoa": { emoji: "🌾", category: "Pantry", nutrients: ["Complete Protein", "Iron", "Magnesium"] },
  "Walnuts": { emoji: "🌰", category: "Pantry", nutrients: ["Omega-3", "Vitamin E"] },
  "Kale": { emoji: "🥬", category: "Produce", nutrients: ["Vitamin K", "Iron", "Antioxidants"] },
  "Eggs": { emoji: "🥚", category: "Protein", nutrients: ["Vitamin B12", "Choline", "Selenium"] },
  "Tofu": { emoji: "🫙", category: "Protein", nutrients: ["Calcium", "Protein", "Iron"] },
};

router.get("/recommendations", async (_req, res) => {
  // Get favorited recipes
  const favs = await db.select().from(favoritesTable);
  
  // Build set of nutrients already covered by favorites
  const coveredNutrients = new Set<string>();
  const coveredCategories = new Set<string>();
  
  if (favs.length > 0) {
    const favRecipeIds = favs.map((f) => f.recipeId);
    const favRecipes = await db
      .select()
      .from(recipesTable)
      .where(inArray(recipesTable.id, favRecipeIds));
    
    for (const recipe of favRecipes) {
      const ingrs = (recipe.ingredients as any[]) ?? [];
      for (const ingr of ingrs) {
        const name = ingr.name ?? "";
        const profile = INGREDIENT_PROFILES[name];
        if (profile) {
          profile.nutrients.forEach((n) => coveredNutrients.add(n));
        }
        if (recipe.category) coveredCategories.add(recipe.category);
      }
    }
  }

  // Determine missing nutrients
  const allNutrients = ["Iron", "Omega-3", "Vitamin D", "Calcium", "Protein", "Fiber", "Vitamin C", "Potassium", "Antioxidants", "Magnesium"];
  const missingNutrients = allNutrients.filter((n) => !coveredNutrients.has(n));

  // Build recommendations
  const recommendations: RecommendedIngredient[] = [];
  const used = new Set<string>();

  // First: recommend based on missing nutrients
  for (const [name, profile] of Object.entries(INGREDIENT_PROFILES)) {
    if (used.has(name)) continue;
    const missingMatch = profile.nutrients.find((n) => missingNutrients.includes(n));
    if (missingMatch && recommendations.length < 6) {
      recommendations.push({
        name,
        emoji: profile.emoji,
        reason: `Rich in ${missingMatch} — a nutrient your recent recipes are light on`,
        category: profile.category,
        nutrient: missingMatch,
      });
      used.add(name);
    }
  }

  // Then: fill up with variety suggestions
  const varietySuggestions: RecommendedIngredient[] = [
    { name: "Garlic", emoji: "🧄", reason: "Boosts immunity and adds depth to almost any dish", category: "Produce", nutrient: null },
    { name: "Ginger", emoji: "🫚", reason: "Anti-inflammatory and great for digestion", category: "Produce", nutrient: null },
    { name: "Lemon", emoji: "🍋", reason: "Brightens flavors and adds Vitamin C", category: "Produce", nutrient: "Vitamin C" },
    { name: "Olive Oil", emoji: "🫒", reason: "Heart-healthy monounsaturated fats for everyday cooking", category: "Pantry", nutrient: null },
  ];

  for (const s of varietySuggestions) {
    if (!used.has(s.name) && recommendations.length < 8) {
      recommendations.push(s);
      used.add(s.name);
    }
  }

  // Generate an insight
  let insight = "Based on your saved recipes, ";
  if (missingNutrients.length > 0) {
    insight += `you could benefit from more ${missingNutrients.slice(0, 2).join(" and ")} in your diet. Try adding these ingredients to your next cook.`;
  } else if (favs.length === 0) {
    insight = "Save some favourite recipes and we'll analyse your nutrition patterns to give you personalised suggestions.";
  } else {
    insight += "your diet looks well-rounded! Here are some ingredients to keep things interesting.";
  }

  res.json({ ingredients: recommendations, insight });
});

export default router;
