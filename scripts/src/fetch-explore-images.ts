import { db, exploreRecipesTable } from "@workspace/db";
import { isNull, eq } from "drizzle-orm";

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!UNSPLASH_KEY) {
  console.error("❌ UNSPLASH_ACCESS_KEY is not set");
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchImageUrl(title: string): Promise<string | null> {
  const query = encodeURIComponent(`${title} food`);
  const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { results: { urls: { regular: string } }[] };
  return data.results[0]?.urls?.regular ?? null;
}

async function main() {
  const rows = await db
    .select()
    .from(exploreRecipesTable)
    .where(isNull(exploreRecipesTable.imageUrl));

  console.log(`Found ${rows.length} recipes without images`);

  let successCount = 0;

  for (const row of rows) {
    try {
      const imageUrl = await fetchImageUrl(row.title);
      if (imageUrl) {
        await db
          .update(exploreRecipesTable)
          .set({ imageUrl })
          .where(eq(exploreRecipesTable.id, row.id));
        console.log(`✓ ${row.title}`);
        successCount++;
      } else {
        console.log(`⚠ No image found for: ${row.title}`);
      }
    } catch (err) {
      console.error(`✗ Failed for "${row.title}":`, (err as Error).message);
    }
    await sleep(300);
  }

  console.log(`✅ Images fetched for ${successCount} recipes`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
