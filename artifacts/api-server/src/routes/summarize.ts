import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/summarize", async (req, res) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== "string" || text.trim().length < 50) {
    res.status(400).json({ error: "Please provide at least 50 characters of article text." });
    return;
  }

  if (text.length > 50000) {
    res.status(400).json({ error: "Article text exceeds the 50,000 character limit." });
    return;
  }

  const wordCount = text.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert summarizer. Given an article, return a JSON object with:
- "title": a concise, descriptive title for the article (if not obvious from the text, infer one)
- "summary": a clear 2-4 sentence summary capturing the main argument and key takeaways
- "keyPoints": an array of 3-5 bullet points (strings) highlighting the most important facts or ideas
- "sentiment": one of "positive", "neutral", "negative"
- "topics": an array of 2-4 topic tags (strings, e.g. "Technology", "Climate", "Business")

Respond ONLY with the raw JSON object, no markdown, no code fences.`,
      },
      {
        role: "user",
        content: text.slice(0, 15000),
      },
    ],
    temperature: 0.3,
    max_tokens: 600,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response." });
    return;
  }

  res.json({
    title: parsed.title ?? "Article Summary",
    summary: parsed.summary ?? "",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    sentiment: parsed.sentiment ?? "neutral",
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    wordCount,
    readTime,
  });
});

export default router;
