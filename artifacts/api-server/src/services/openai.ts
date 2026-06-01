import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RecipeIngredient {
  name: string;
  amount: string;
  substitutes: string[];
}

export interface RecipeStep {
  step: number;
  title: string;
  instruction: string;
  alternative: string;
}

export interface GeneratedRecipeData {
  title: string;
  time_minutes: number;
  difficulty: string;
  cuisine: string;
  nutrition_per_serving: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

const EXAMPLE_JSON = `{
  "title": "Quick Tomato Basil Risotto",
  "time_minutes": 30,
  "difficulty": "easy",
  "cuisine": "Italian",
  "nutrition_per_serving": { "calories": 450, "protein_g": 20, "carbs_g": 45, "fat_g": 15 },
  "ingredients": [
    { "name": "Arborio rice", "amount": "200g", "substitutes": ["jasmine rice", "short-grain rice"] }
  ],
  "steps": [
    { "step": 1, "title": "Prepare", "instruction": "Finely chop the onion and garlic.", "alternative": "Use pre-cut frozen vegetables to save time." }
  ]
}`;

export async function generateRecipeFromAI(params: {
  ingredients: string[];
  time?: string;
  difficulty?: string;
  cookingMethod?: string;
  cuisineStyle?: string;
}): Promise<GeneratedRecipeData> {
  const { ingredients, time, difficulty, cookingMethod, cuisineStyle } = params;

  const prefLines = [
    `Ingredients available: ${ingredients.length > 0 ? ingredients.join(", ") : "common pantry staples"}`,
    time && time !== "any" ? `Time limit: ${time}` : null,
    difficulty && difficulty !== "any" ? `Difficulty: ${difficulty}` : null,
    cookingMethod && cookingMethod !== "any" ? `Cooking method: ${cookingMethod}` : null,
    cuisineStyle && cuisineStyle !== "any" ? `Cuisine style: ${cuisineStyle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1500,
    response_format: { type: "json_object" },
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content:
          "You are a professional chef. Return ONLY valid JSON with no markdown, " +
          "no explanation, no extra text. Generate a recipe based on the user's " +
          "ingredients and preferences. " +
          "difficulty must be one of: easy, medium, hard. " +
          "Each ingredient must have a substitutes array with 2-3 alternatives. " +
          "Each step must have a practical alternative tip in the 'alternative' field. " +
          `Return JSON matching this exact schema:\n${EXAMPLE_JSON}`,
      },
      {
        role: "user",
        content: `Generate a recipe with these preferences:\n${prefLines}\n\nReturn valid JSON only.`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content) as GeneratedRecipeData;
}

export async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const resp = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { results: Array<{ urls: { regular: string } }> };
    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

export async function generateFoodImageForSeed(recipeName: string): Promise<string | null> {
  return fetchUnsplashImage(recipeName);
}
