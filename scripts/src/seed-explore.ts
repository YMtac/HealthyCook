import { db, exploreRecipesTable } from "@workspace/db";

const SEED = [
  { id: 1,  title: "Spaghetti Carbonara",   cuisine: "western", cuisineLabel: "西餐·意式", difficulty: "easy",   timeMinutes: 25,  calories: 520, tags: '["pasta","classic"]'   },
  { id: 2,  title: "Chicken Teriyaki Bowl", cuisine: "asian",   cuisineLabel: "亚洲·日式", difficulty: "easy",   timeMinutes: 20,  calories: 480, tags: '["chicken","rice"]'    },
  { id: 3,  title: "Avocado Toast Deluxe",  cuisine: "healthy", cuisineLabel: "健康轻食",  difficulty: "easy",   timeMinutes: 10,  calories: 310, tags: '["vegan","breakfast"]' },
  { id: 4,  title: "Korean Bibimbap",       cuisine: "asian",   cuisineLabel: "亚洲·韩式", difficulty: "medium", timeMinutes: 35,  calories: 550, tags: '["rice","veggies"]'    },
  { id: 5,  title: "French Onion Soup",     cuisine: "western", cuisineLabel: "西餐·法式", difficulty: "medium", timeMinutes: 50,  calories: 340, tags: '["soup","comfort"]'    },
  { id: 6,  title: "Pad Thai",              cuisine: "asian",   cuisineLabel: "亚洲·泰式", difficulty: "medium", timeMinutes: 30,  calories: 490, tags: '["noodles","shrimp"]'  },
  { id: 7,  title: "Beef Wellington",       cuisine: "western", cuisineLabel: "西餐·英式", difficulty: "hard",   timeMinutes: 90,  calories: 680, tags: '["beef","special"]'    },
  { id: 8,  title: "Dim Sum Basket",        cuisine: "asian",   cuisineLabel: "亚洲·粤式", difficulty: "hard",   timeMinutes: 75,  calories: 420, tags: '["steamed","pork"]'    },
  { id: 9,  title: "Greek Salad Bowl",      cuisine: "healthy", cuisineLabel: "健康轻食",  difficulty: "easy",   timeMinutes: 10,  calories: 260, tags: '["salad","vegan"]'     },
  { id: 10, title: "Miso Ramen",            cuisine: "asian",   cuisineLabel: "亚洲·日式", difficulty: "hard",   timeMinutes: 80,  calories: 610, tags: '["noodles","broth"]'   },
  { id: 11, title: "Margherita Pizza",      cuisine: "western", cuisineLabel: "西餐·意式", difficulty: "medium", timeMinutes: 40,  calories: 560, tags: '["pizza","vegetarian"]' },
  { id: 12, title: "Salmon Poke Bowl",      cuisine: "healthy", cuisineLabel: "健康轻食",  difficulty: "easy",   timeMinutes: 15,  calories: 430, tags: '["fish","rice"]'       },
  { id: 13, title: "Mapo Tofu",             cuisine: "asian",   cuisineLabel: "亚洲·川式", difficulty: "medium", timeMinutes: 25,  calories: 370, tags: '["tofu","spicy"]'      },
  { id: 14, title: "Beef Bourguignon",      cuisine: "western", cuisineLabel: "西餐·法式", difficulty: "hard",   timeMinutes: 120, calories: 650, tags: '["beef","stew"]'       },
  { id: 15, title: "Quinoa Power Bowl",     cuisine: "healthy", cuisineLabel: "健康轻食",  difficulty: "easy",   timeMinutes: 20,  calories: 390, tags: '["vegan","protein"]'   },
  { id: 16, title: "Vietnamese Pho",        cuisine: "asian",   cuisineLabel: "亚洲·越式", difficulty: "hard",   timeMinutes: 100, calories: 510, tags: '["soup","beef"]'       },
  { id: 17, title: "Eggs Benedict",         cuisine: "western", cuisineLabel: "西餐·美式", difficulty: "hard",   timeMinutes: 35,  calories: 580, tags: '["brunch","egg"]'      },
  { id: 18, title: "Thai Green Curry",      cuisine: "asian",   cuisineLabel: "亚洲·泰式", difficulty: "medium", timeMinutes: 30,  calories: 520, tags: '["curry","coconut"]'   },
  { id: 19, title: "Nicoise Salad",         cuisine: "healthy", cuisineLabel: "健康轻食",  difficulty: "medium", timeMinutes: 25,  calories: 340, tags: '["salad","fish"]'      },
  { id: 20, title: "Korean Fried Chicken",  cuisine: "asian",   cuisineLabel: "亚洲·韩式", difficulty: "hard",   timeMinutes: 50,  calories: 640, tags: '["chicken","crispy"]'  },
  { id: 21, title: "Mushroom Risotto",      cuisine: "western", cuisineLabel: "西餐·意式", difficulty: "medium", timeMinutes: 40,  calories: 490, tags: '["vegetarian","rice"]'  },
  { id: 22, title: "Peking Duck Wrap",      cuisine: "fusion",  cuisineLabel: "混合创意",  difficulty: "hard",   timeMinutes: 90,  calories: 590, tags: '["duck","fusion"]'     },
  { id: 23, title: "Tacos al Pastor",       cuisine: "western", cuisineLabel: "西餐·墨式", difficulty: "medium", timeMinutes: 45,  calories: 530, tags: '["pork","tacos"]'      },
  { id: 24, title: "Kung Pao Shrimp",       cuisine: "asian",   cuisineLabel: "亚洲·川式", difficulty: "easy",   timeMinutes: 20,  calories: 360, tags: '["shrimp","spicy"]'    },
  { id: 25, title: "Crème Brûlée",          cuisine: "western", cuisineLabel: "西餐·法式", difficulty: "hard",   timeMinutes: 60,  calories: 420, tags: '["dessert","sweet"]'   },
  { id: 26, title: "Mango Sticky Rice",     cuisine: "fusion",  cuisineLabel: "混合创意",  difficulty: "easy",   timeMinutes: 30,  calories: 450, tags: '["dessert","sweet"]'   },
  { id: 27, title: "Kimchi Quesadilla",     cuisine: "fusion",  cuisineLabel: "混合创意",  difficulty: "easy",   timeMinutes: 15,  calories: 410, tags: '["fusion","cheese"]'   },
  { id: 28, title: "Ramen Burger",          cuisine: "fusion",  cuisineLabel: "混合创意",  difficulty: "medium", timeMinutes: 40,  calories: 620, tags: '["fusion","beef"]'     },
  { id: 29, title: "Truffle Pasta",         cuisine: "western", cuisineLabel: "西餐·意式", difficulty: "easy",   timeMinutes: 20,  calories: 540, tags: '["pasta","luxury"]'    },
  { id: 30, title: "Dragon Roll Salad",     cuisine: "fusion",  cuisineLabel: "混合创意",  difficulty: "medium", timeMinutes: 35,  calories: 380, tags: '["fusion","fish"]'     },
];

async function main() {
  await db.delete(exploreRecipesTable);
  await db.insert(exploreRecipesTable).values(
    SEED.map(({ id: _id, ...rest }) => rest)
  );
  console.log("✅ Seeded 30 explore recipes");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
