import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedRecipe {
  name: string;
  emoji: string;
  timeMinutes: number;
  difficulty: string;
  category: string;
  diet: string | null;
  nutrition: { kcal: number; protein: string; carbs: string; fat: string };
  ingredients: Array<{ name: string; emoji: string; quantity: string }>;
  steps: Array<{ number: number; title: string; description: string; substitutes?: Record<string, string[]> }>;
  missingIngredients: string[];
}

const RECIPE_SCHEMA = `{
  "name": "Recipe Name",
  "emoji": "🍽️",
  "timeMinutes": 30,
  "difficulty": "Easy",
  "category": "Italian",
  "diet": "Vegetarian",
  "nutrition": { "kcal": 450, "protein": "20g", "carbs": "45g", "fat": "15g" },
  "ingredients": [{ "name": "ingredient", "emoji": "🥕", "quantity": "200g" }],
  "steps": [
    {
      "number": 1,
      "title": "Step title",
      "description": "Detailed step description mentioning specific ingredients.",
      "substitutes": { "ingredient_name": ["substitute1", "substitute2", "substitute3"] }
    }
  ],
  "missingIngredients": ["ingredient not in available list"]
}`;

export async function generateRecipeWithAI(params: {
  availableIngredients: string[];
  timePreference?: string;
  difficulty?: string;
  cookingMethod?: string;
  cuisineStyle?: string;
}): Promise<GeneratedRecipe> {
  const { availableIngredients, timePreference, difficulty, cookingMethod, cuisineStyle } = params;

  const prefLines = [
    availableIngredients.length > 0
      ? `Available ingredients: ${availableIngredients.join(", ")}`
      : "Available ingredients: common pantry staples",
    timePreference ? `Time preference: ${timePreference}` : null,
    difficulty && difficulty !== "Any" ? `Difficulty: ${difficulty}` : null,
    cookingMethod && cookingMethod !== "Any" ? `Cooking method: ${cookingMethod}` : null,
    cuisineStyle && cuisineStyle !== "Any" ? `Cuisine style: ${cuisineStyle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content:
          "You are a professional chef. Generate a complete, creative, and realistic recipe. Return ONLY valid JSON matching the exact schema provided. " +
          "difficulty must be one of: Easy, Medium, Hard. " +
          "category must be one of: Italian, Asian, American, Mexican, Mediterranean, Indian, Breakfast, Dessert, Soup, Salad. " +
          "diet must be one of: Vegetarian, Vegan, Gluten-Free, or null. " +
          "Each step must include a substitutes map with 2-3 alternatives for the main ingredient(s) used in that step. " +
          "missingIngredients should only list recipe ingredients not in the available list.",
      },
      {
        role: "user",
        content: `Generate a recipe with these preferences:\n${prefLines}\n\nReturn JSON matching this schema:\n${RECIPE_SCHEMA}\n\nGenerate 4-7 detailed cooking steps.`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content) as GeneratedRecipe;
}

export async function generateFoodImage(
  recipeName: string,
  category: string,
): Promise<string | null> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: `Professional food photography of ${recipeName}, ${category} cuisine, beautifully plated, appetizing, restaurant quality, soft natural lighting, close-up shot`,
      size: "512x512",
      response_format: "b64_json",
      n: 1,
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}
