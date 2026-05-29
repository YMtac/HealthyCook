import React, { useState, useEffect, useRef, useMemo } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChefHat, ShoppingCart, Compass, Search, Plus, ArrowLeft, Heart, Check, X, Clock, Flame, Loader2, Minus, CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  useListIngredients, useCreateIngredient, useDeleteIngredient, getListIngredientsQueryKey,
  useGenerateRecipe, 
  useListRecipes, useGetTrendingRecipes, useGetRecipe, getGetRecipeQueryKey, getListRecipesQueryKey,
  useListShoppingItems, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, getListShoppingItemsQueryKey,
  useListFavorites, useAddFavorite, useRemoveFavorite, useGetFavoriteStatus, getListFavoritesQueryKey, getGetFavoriteStatusQueryKey,
  useGetRecommendations,
  useCreateCookingLog, useListCookingLogs, useGetCookingStreak, useGetCookingStats, getGetCookingStreakQueryKey, getListCookingLogsQueryKey,
  ShoppingItem, Recipe, CookingLog
} from "@workspace/api-client-react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Link } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#8fa68f",
    colorForeground: "#2d2a26",
    colorMutedForeground: "#6b6560",
    colorDanger: "#c67d5a",
    colorBackground: "#f5f0e6",
    colorInput: "#f0ebe3",
    colorInputForeground: "#2d2a26",
    colorNeutral: "#d4c4a8",
    fontFamily: "'Karla', sans-serif",
    borderRadius: "16px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#f5f0e6] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#2d2a26] font-['Fraunces'] italic",
    headerSubtitle: "text-[#6b6560]",
    socialButtonsBlockButtonText: "text-[#2d2a26]",
    formFieldLabel: "text-[#6b6560]",
    footerActionLink: "text-[#8fa68f]",
    footerActionText: "text-[#6b6560]",
    dividerText: "text-[#6b6560]",
    identityPreviewEditButton: "text-[#8fa68f]",
    formFieldSuccessText: "text-[#8fa68f]",
    alertText: "text-[#2d2a26]",
    logoBox: "mb-4",
    logoImage: "h-10",
    socialButtonsBlockButton: "bg-[#f0ebe3] border border-[#d4c4a8]",
    formButtonPrimary: "bg-[#8fa68f] hover:bg-[#6b8a6b]",
    formFieldInput: "bg-[#f0ebe3] border-[#d4c4a8] text-[#2d2a26]",
    footerAction: "bg-[#f5f0e6]",
    dividerLine: "bg-[#d4c4a8]",
    alert: "bg-[#f0ebe3]",
    otpCodeFieldInput: "border-[#d4c4a8]",
    formFieldRow: "",
    main: "",
  },
};

type ScreenState = 
  | { name: 'tabs'; tab: 'cook' | 'shop' | 'explore' | 'calendar' }
  | { name: 'preferences' }
  | { name: 'recipe-output'; recipeId: number }
  | { name: 'recipe-detail'; recipeId: number; source?: 'cook' | 'explore' | 'favorites' }
  | { name: 'congrats'; recipeName: string; imageUrl?: string | null; kcal: number; protein: string; carbs: string; fat: string }
  | { name: 'add-item' }
  | { name: 'favorites' };

// ── Constants ──────────────────────────────────────────────────────────────

const MOTIVATIONAL_MESSAGES = [
  "Every meal you cook is a gift to yourself.",
  "You're building better habits, one dish at a time.",
  "Real food, real flavour, real you.",
  "Home cooking is an act of love.",
  "Another day, another delicious win.",
  "Your future self thanks you for this meal.",
  "Nourishment is not just fuel — it's joy.",
  "Look at you, actually cooking!",
  "Small habits, massive results.",
  "You made something from scratch. That's worth celebrating.",
  "Health is built in kitchens, not gyms.",
  "Consistency is the secret ingredient.",
  "You cooked today. That counts.",
  "Every bite of home cooking beats takeaway.",
  "The best table is the one you set yourself.",
  "Cooking is the most loving thing you can do.",
  "One more day, one more streak. Keep it going.",
  "The chef life chose you today.",
  "Well done — in every sense of the word.",
  "You are what you eat, and today you're amazing.",
  "Progress over perfection, always.",
  "This meal just powered your whole day.",
  "Fuelled by you. For you.",
  "Another level unlocked.",
  "Streak? More like a winning spree.",
];

const CUISINE_STYLES = [
  "Any", "Asian", "Japanese", "Chinese", "Korean", "Thai",
  "Turkish", "Mediterranean", "Italian", "French", "Mexican",
  "American", "Indian", "Middle Eastern", "Fusion",
];

const COOKING_METHODS = [
  "Any", "Pan / Stovetop", "Oven", "Air Fryer", "Microwave", "Grill", "Steamer",
];

const SUBSTITUTES: Record<string, string[]> = {
  butter: ["olive oil", "coconut oil", "margarine", "avocado"],
  egg: ["flax egg", "aquafaba", "chia egg", "banana (½)"],
  milk: ["oat milk", "almond milk", "soy milk", "coconut milk"],
  flour: ["almond flour", "rice flour", "oat flour", "cornstarch"],
  sugar: ["honey", "maple syrup", "stevia", "coconut sugar"],
  chili: ["paprika", "cayenne", "black pepper", "jalapeño"],
  garlic: ["garlic powder", "shallots", "ginger"],
  onion: ["shallots", "leek", "garlic powder"],
  cheese: ["nutritional yeast", "vegan cheese", "tofu crumbles"],
  cream: ["coconut cream", "evaporated milk", "cashew cream"],
  soy_sauce: ["tamari", "coconut aminos", "worcestershire"],
  chicken: ["tofu", "chickpeas", "tempeh", "jackfruit"],
  beef: ["lentils", "portobello mushroom", "tofu", "black beans"],
  pork: ["chicken", "turkey", "tempeh"],
  salmon: ["tuna", "trout", "tofu", "white fish"],
  shrimp: ["scallops", "tofu", "king oyster mushroom"],
  rice: ["quinoa", "cauliflower rice", "farro", "barley"],
  pasta: ["zucchini noodles", "rice noodles", "soba", "lentil pasta"],
  potato: ["sweet potato", "parsnip", "cauliflower", "turnip"],
  spinach: ["kale", "Swiss chard", "arugula", "bok choy"],
};

const INGREDIENT_SUGGESTIONS = [
  { name: "Tomato", emoji: "🍅" }, { name: "Eggs", emoji: "🥚" }, { name: "Rice", emoji: "🍚" },
  { name: "Garlic", emoji: "🧄" }, { name: "Butter", emoji: "🧈" }, { name: "Onion", emoji: "🧅" },
  { name: "Carrot", emoji: "🥕" }, { name: "Chicken", emoji: "🍗" }, { name: "Pasta", emoji: "🍝" },
  { name: "Milk", emoji: "🥛" }, { name: "Cheese", emoji: "🧀" }, { name: "Lemon", emoji: "🍋" },
  { name: "Spinach", emoji: "🥬" }, { name: "Potato", emoji: "🥔" }, { name: "Mushroom", emoji: "🍄" },
  { name: "Broccoli", emoji: "🥦" }, { name: "Bell Pepper", emoji: "🫑" }, { name: "Ginger", emoji: "🫚" },
  { name: "Olive Oil", emoji: "🫒" }, { name: "Salmon", emoji: "🐟" }, { name: "Beef", emoji: "🥩" },
  { name: "Avocado", emoji: "🥑" }, { name: "Cucumber", emoji: "🥒" }, { name: "Corn", emoji: "🌽" },
  { name: "Soy Sauce", emoji: "🫙" }, { name: "Tofu", emoji: "🫙" }, { name: "Noodles", emoji: "🍜" },
  { name: "Bread", emoji: "🍞" }, { name: "Sweet Potato", emoji: "🍠" }, { name: "Yogurt", emoji: "🥛" },
  { name: "Shrimp", emoji: "🦐" }, { name: "Pork", emoji: "🥩" }, { name: "Tuna", emoji: "🐟" },
  { name: "Peanuts", emoji: "🥜" }, { name: "Flour", emoji: "🌾" }, { name: "Coconut Milk", emoji: "🥥" },
  { name: "Scallions", emoji: "🌿" }, { name: "Chili", emoji: "🌶️" }, { name: "Sesame Oil", emoji: "🫙" },
  { name: "Sugar", emoji: "🍬" }, { name: "Almonds", emoji: "🌰" }, { name: "Peas", emoji: "🫛" },
];

// ── Clerk / Auth Helpers ──────────────────────────────────────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) qc.clear();
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function SignInPage() {
  return <div className="min-h-screen flex items-center justify-center p-6"><SignIn routing="path" path="/sign-in" /></div>;
}

function SignUpPage() {
  return <div className="min-h-screen flex items-center justify-center p-6"><SignUp routing="path" path="/sign-up" /></div>;
}

function UserAuthButton({ navigate }: { navigate: (path: string) => void }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [showMenu, setShowMenu] = useState(false);

  if (!isLoaded) return null;

  if (!user) return (
    <a href={`${basePath}/sign-in`} 
       style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
       className="text-xs px-3 py-1.5 bg-[#f0ebe3] border border-[#d4c4a8] text-[#6b6560] font-['Karla'] transition-all hover:bg-[#e8a889] hover:text-white"
       data-testid="button-sign-in">
      Sign In
    </a>
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%', width: 36, height: 36 }}
        className="bg-[#c67d5a] text-white flex items-center justify-center text-sm font-bold font-['Karla'] shadow-md"
        data-testid="button-user-menu">
        {user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ?? 'U'}
      </button>
      {showMenu && (
        <div style={{ borderRadius: '20px 40px 40px 20px' }} className="absolute right-0 top-12 bg-[#f5f0e6] border border-[#d4c4a8] shadow-lg p-4 min-w-[180px] z-50">
          <p className="text-[#2d2a26] font-['Fraunces'] italic mb-1">{user.firstName || 'Chef'}</p>
          <p className="text-[#6b6560] text-xs font-['Karla'] mb-4">{user.emailAddresses[0]?.emailAddress}</p>
          <button onClick={() => signOut({ redirectUrl: basePath || '/' })}
            className="text-[#c67d5a] text-sm font-['Karla'] hover:underline"
            data-testid="button-sign-out">
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Screen Wrapper ────────────────────────────────────────────────────────

function ScreenWrapper({ children, isActive }: { children: React.ReactNode, isActive: boolean }) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-transparent overflow-y-auto z-10 pb-24 md:pb-6"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Cook Tab ──────────────────────────────────────────────────────────────

function CookTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const { data: ingredients = [], isLoading } = useListIngredients();
  const { data: favorites = [] } = useListFavorites();
  const createIngredient = useCreateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ingredientQtys, setIngredientQtys] = useState<Record<number, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const existingNames = new Set(ingredients.map(i => i.name.toLowerCase()));
  const filtered = inputValue.trim().length > 0
    ? INGREDIENT_SUGGESTIONS.filter(s =>
        s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !existingNames.has(s.name.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAdd = (name: string, emoji: string) => {
    if (!name.trim() || existingNames.has(name.toLowerCase())) return;
    createIngredient.mutate({ data: { name, emoji } }, {
      onSuccess: () => {
        setInputValue("");
        setShowSuggestions(false);
        queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const match = INGREDIENT_SUGGESTIONS.find(s => s.name.toLowerCase() === inputValue.toLowerCase());
    handleAdd(inputValue.trim(), match?.emoji ?? "🥬");
  };

  const updateQty = (id: number, delta: number) => {
    setIngredientQtys(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + delta) }));
  };

  const topFavorites = favorites.slice(0, 6);

  return (
    <div className="flex flex-col h-full p-6 relative max-w-2xl mx-auto w-full">
      <header className="mb-8 pt-4 flex justify-between items-start">
        <div>
          <h1 className="text-[52px] font-['Fraunces'] italic text-[#2d2a26] leading-none mb-2">SmartCook</h1>
          <p className="font-['Karla'] text-[#6b6560]">What's in your fridge?</p>
        </div>
        <UserAuthButton navigate={(p) => window.location.href = p} />
      </header>

      <div className="flex-1">
        <div className="mb-6 relative">
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Type an ingredient..."
              className="w-full bg-transparent border-b-2 border-[#d4c4a8] pb-2 focus:outline-none focus:border-[#c67d5a] text-lg transition-colors text-[#2d2a26] placeholder:text-[#d4c4a8] font-['Karla']"
              data-testid="input-ingredient"
              autoComplete="off"
            />
          </form>
          <AnimatePresence>
            {showSuggestions && filtered.length > 0 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#f5f0e6] shadow-xl z-30 overflow-hidden border border-[#e8e0d4]"
                style={{ borderRadius: '16px 24px 24px 16px' }}
              >
                {filtered.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    onMouseDown={() => handleAdd(s.name, s.emoji)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#e8e0d4] transition-colors text-left font-['Karla'] text-[#2d2a26]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0ebe3' : 'none' }}
                  >
                    <span className="text-xl w-8 text-center">{s.emoji}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-auto text-[#c67d5a] text-xs opacity-60">+ Add</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mb-8 min-h-[80px]">
          {isLoading ? (
            <div className="flex gap-2"><div className="h-8 w-24 bg-[#e8a889]/30 animate-pulse rounded-full" /></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {ingredients.map(ing => {
                  const qty = ingredientQtys[ing.id] ?? 1;
                  return (
                    <motion.div
                      key={ing.id}
                      initial={{ opacity: 0, scale: 0.5, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -8 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 280 }}
                      layout
                    >
                      <div
                        className="inline-flex items-center gap-1.5 bg-[#b8ccb8] text-[#2d2a26] pl-3 pr-2 py-2 text-sm font-['Karla'] font-medium select-none"
                        style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}
                      >
                        <span className="text-base">{ing.emoji}</span>
                        <span>{ing.name}</span>
                        <div className="flex items-center gap-0.5 ml-1 bg-[#8fa68f]/20 px-1 py-0.5 rounded-full">
                          <button
                            onClick={() => updateQty(ing.id, -1)}
                            className="w-4 h-4 flex items-center justify-center hover:text-[#c67d5a] transition-colors"
                          ><Minus size={10} strokeWidth={3} /></button>
                          <span className="text-xs font-bold min-w-[12px] text-center text-[#2d2a26]">{qty}</span>
                          <button
                            onClick={() => updateQty(ing.id, 1)}
                            className="w-4 h-4 flex items-center justify-center hover:text-[#c67d5a] transition-colors"
                          ><Plus size={10} strokeWidth={3} /></button>
                        </div>
                        <button
                          onClick={() => deleteIngredient.mutate({ id: ing.id }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() })
                          })}
                          className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <h3 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Tomato", emoji: "🍅" }, { name: "Eggs", emoji: "🥚" },
              { name: "Rice", emoji: "🍚" }, { name: "Garlic", emoji: "🧄" },
              { name: "Butter", emoji: "🧈" }
            ].map(item => (
              <button
                key={item.name}
                onClick={() => handleAdd(item.name, item.emoji)}
                disabled={existingNames.has(item.name.toLowerCase())}
                className="bg-[#d4c4a8] text-[#2d2a26] px-4 py-2 text-sm transition-all hover:scale-105 font-['Karla'] font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
              >
                {item.emoji} {item.name}
              </button>
            ))}
          </div>
        </div>

        {topFavorites.length > 0 && (
          <div className="mt-12 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a]">Top Favourites</h3>
              <button
                onClick={() => navigate({ name: 'favorites' })}
                className="text-xs font-['Karla'] text-[#8fa68f] hover:text-[#c67d5a] transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
              {topFavorites.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id, source: 'favorites' })}
                  className="shrink-0 w-28 text-left group"
                >
                  <div className="w-28 h-28 bg-[#f5f0e6] relative overflow-hidden mb-2 group-hover:-translate-y-1 transition-transform duration-300"
                       style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}>
                    {recipe.imageUrl
                      ? <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-3xl">{recipe.emoji}</span>
                    }
                  </div>
                  <p className="text-xs font-['Karla'] font-semibold text-[#2d2a26] leading-tight line-clamp-2 group-hover:text-[#c67d5a] transition-colors">{recipe.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed md:absolute bottom-24 md:bottom-6 left-6 right-6 md:left-0 md:right-0 max-w-[382px] mx-auto z-20">
        <button
          onClick={() => navigate({ name: 'preferences' })}
          disabled={ingredients.length === 0}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all btn-primary"
          data-testid="button-generate-recipe"
        >
          Generate Recipe <span>→</span>
        </button>
      </div>
    </div>
  );
}

// ── Preferences Screen ────────────────────────────────────────────────────

function PreferencesScreen({ onBack, navigate }: { onBack: () => void, navigate: (screen: ScreenState) => void }) {
  const [time, setTime] = useState("30 min");
  const [difficulty, setDifficulty] = useState("Easy");
  const [cookingMethod, setCookingMethod] = useState("Any");
  const [cuisineStyle, setCuisineStyle] = useState("Any");

  const { data: ingredients = [] } = useListIngredients();
  const generateRecipe = useGenerateRecipe();

  const handleCookIt = () => {
    generateRecipe.mutate({
      data: {
        ingredientIds: ingredients.map(i => i.id),
        timePreference: time,
        difficulty,
        cookingMethod: cookingMethod !== "Any" ? cookingMethod : undefined,
        cuisineStyle: cuisineStyle !== "Any" ? cuisineStyle : undefined,
      }
    }, {
      onSuccess: (data) => {
        navigate({ name: 'recipe-output', recipeId: data.id });
      }
    });
  };

  const Pill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-['Karla'] font-medium transition-all ${
        active 
          ? "bg-[#8fa68f] text-white" 
          : "bg-transparent text-[#6b6560] border border-[#f5f0e6]"
      }`}
      style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full p-6 relative bg-[#faf8f5] max-w-2xl mx-auto w-full">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[#f0ebe3] text-[#c67d5a]" data-testid="button-back">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-['Fraunces'] italic text-[#2d2a26]">Preferences</h1>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto">
        <div>
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Time</h2>
          <div className="flex flex-wrap gap-3">
            {["< 15 min", "30 min", "60 min+"].map(t => (
              <Pill key={t} label={t} active={time === t} onClick={() => setTime(t)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Difficulty</h2>
          <div className="flex flex-wrap gap-3">
            {["Easy", "Medium", "Hard"].map(d => (
              <Pill key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Cooking Method</h2>
          <div className="flex flex-wrap gap-3">
            {COOKING_METHODS.map(m => (
              <Pill key={m} label={m} active={cookingMethod === m} onClick={() => setCookingMethod(m)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Cuisine Style</h2>
          <div className="flex flex-wrap gap-3">
            {CUISINE_STYLES.map(c => (
              <Pill key={c} label={c} active={cuisineStyle === c} onClick={() => setCuisineStyle(c)} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 mb-6">
        <button 
          onClick={handleCookIt}
          disabled={generateRecipe.isPending}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 transition-all btn-primary disabled:opacity-70"
          data-testid="button-cook-it"
        >
          {generateRecipe.isPending ? <Loader2 className="animate-spin" /> : "Cook It! →"}
        </button>
      </div>
    </div>
  );
}

// ── Ingredient Substitution Sheet ─────────────────────────────────────────

type SubstitutionState = Record<number, Record<string, string | null>>;
// stepIdx -> { ingredientName: 'excluded' | substituteString | null }

function getIngredientsInStep(stepDescription: string, recipeIngredients: Array<{ name: string; emoji: string; quantity: string }>): string[] {
  const desc = stepDescription.toLowerCase();
  return recipeIngredients
    .map(i => i.name)
    .filter(name => desc.includes(name.toLowerCase()));
}

function getSubstitutes(ingredientName: string): string[] {
  const key = ingredientName.toLowerCase().replace(/\s+/g, '_');
  const directKey = ingredientName.toLowerCase();
  return SUBSTITUTES[key] ?? SUBSTITUTES[directKey] ?? SUBSTITUTES[Object.keys(SUBSTITUTES).find(k => directKey.includes(k)) ?? ''] ?? [];
}

function applySubstitutions(description: string, subs: Record<string, string | null>): string {
  let result = description;
  Object.entries(subs).forEach(([ing, sub]) => {
    if (!sub) return;
    const regex = new RegExp(`\\b${ing}\\b`, 'gi');
    if (sub === 'excluded') {
      result = result.replace(regex, `~~${ing}~~`);
    } else {
      result = result.replace(regex, `${sub} (instead of ${ing})`);
    }
  });
  return result;
}

function IngredientSubstitutionSheet({
  step,
  stepIdx,
  recipeIngredients,
  substitutions,
  onChange,
  onClose,
}: {
  step: { number: number; title: string; description: string };
  stepIdx: number;
  recipeIngredients: Array<{ name: string; emoji: string; quantity: string }>;
  substitutions: SubstitutionState;
  onChange: (newSubs: SubstitutionState) => void;
  onClose: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const foundIngredients = getIngredientsInStep(step.description, recipeIngredients);
  const stepSubs = substitutions[stepIdx] ?? {};

  const setIngredientSub = (name: string, value: string | null) => {
    onChange({
      ...substitutions,
      [stepIdx]: { ...stepSubs, [name]: value },
    });
  };

  const modifiedDesc = applySubstitutions(step.description, stepSubs);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#2d2a26] z-40"
        onClick={onClose}
      />
      <motion.div
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 120) onClose();
          if (info.offset.y < -80) setIsExpanded(true);
        }}
        initial={{ y: '100%' }}
        animate={{ y: isExpanded ? '5%' : '35%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#f5f0e6] shadow-2xl max-w-2xl mx-auto overflow-y-auto"
        style={{ borderRadius: '36px 36px 0 0', maxHeight: '95dvh' }}
      >
        <div className="sticky top-0 bg-[#f5f0e6] pt-5 pb-3 px-6 z-10">
          <div className="w-12 h-1.5 bg-[#d4c4a8] rounded-full mx-auto mb-4 cursor-grab" />
          <div className="flex items-center justify-between">
            <h3 className="font-['Fraunces'] italic text-[#2d2a26] text-xl">
              Step {step.number}: {step.title}
            </h3>
            <button onClick={onClose} className="p-1 text-[#6b6560] hover:text-[#c67d5a]"><X size={20} /></button>
          </div>
          {!isExpanded && (
            <p className="text-xs text-[#8fa68f] font-['Karla'] mt-1 cursor-pointer" onClick={() => setIsExpanded(true)}>
              Swipe up to expand ↑
            </p>
          )}
        </div>

        <div className="px-6 pb-10">
          <div className="bg-[#f0ebe3] p-4 mb-6" style={{ borderRadius: '20px 40px 20px 40px' }}>
            <p className="text-sm font-['Karla'] text-[#6b6560] leading-relaxed">
              {modifiedDesc.split(/~~(\w[\w\s]*)~~/).map((part, i) =>
                i % 2 === 1
                  ? <span key={i} className="line-through text-[#c67d5a] opacity-60">{part}</span>
                  : part
              )}
            </p>
          </div>

          {foundIngredients.length === 0 ? (
            <p className="text-center text-[#6b6560] font-['Karla'] text-sm py-8">No specific ingredients found in this step to substitute.</p>
          ) : (
            <div className="space-y-5">
              <h4 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a]">Ingredients in this step</h4>
              {foundIngredients.map(ingName => {
                const currentSub = stepSubs[ingName];
                const subs = getSubstitutes(ingName);
                const recipe_ing = recipeIngredients.find(r => r.name.toLowerCase() === ingName.toLowerCase());
                return (
                  <div key={ingName} className="p-4 bg-white/60" style={{ borderRadius: '20px 30px 20px 30px' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{recipe_ing?.emoji ?? '🥬'}</span>
                        <span className="font-['Fraunces'] font-bold text-[#2d2a26]">{ingName}</span>
                        {recipe_ing && <span className="text-xs text-[#6b6560] font-['Karla']">{recipe_ing.quantity}</span>}
                      </div>
                      {currentSub && (
                        <button
                          onClick={() => setIngredientSub(ingName, null)}
                          className="text-xs text-[#8fa68f] font-['Karla'] hover:text-[#c67d5a]"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setIngredientSub(ingName, currentSub === 'excluded' ? null : 'excluded')}
                        className={`px-3 py-1.5 text-xs font-['Karla'] font-medium transition-all ${
                          currentSub === 'excluded'
                            ? 'bg-[#c67d5a] text-white'
                            : 'bg-[#f0ebe3] text-[#6b6560] hover:bg-[#e8a889] hover:text-white'
                        }`}
                        style={{ borderRadius: '20px 10px 20px 10px' }}
                      >
                        Exclude
                      </button>
                      {subs.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setIngredientSub(ingName, currentSub === sub ? null : sub)}
                          className={`px-3 py-1.5 text-xs font-['Karla'] font-medium transition-all ${
                            currentSub === sub
                              ? 'bg-[#8fa68f] text-white'
                              : 'bg-[#f0ebe3] text-[#6b6560] hover:bg-[#b8ccb8]'
                          }`}
                          style={{ borderRadius: '20px 10px 20px 10px' }}
                        >
                          Use {sub}
                        </button>
                      ))}
                      {subs.length === 0 && (
                        <span className="text-xs text-[#d4c4a8] font-['Karla'] italic">No common substitutes known</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-8 bg-[#8fa68f] text-white py-3 font-['Karla'] font-semibold btn-primary"
          >
            Apply Changes
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Recipe Output Screen ──────────────────────────────────────────────────

function RecipeOutputScreen({ recipeId, navigate, onBack }: { recipeId: number, navigate: (screen: ScreenState) => void, onBack: () => void }) {
  const { data: recipe, isLoading } = useGetRecipe(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetRecipeQueryKey(recipeId) }
  });
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showSubSheet, setShowSubSheet] = useState(false);
  const [substitutions, setSubstitutions] = useState<SubstitutionState>({});

  if (isLoading || !recipe) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center bg-[#faf8f5]">
        <Loader2 className="animate-spin text-[#8fa68f] w-12 h-12 mb-6" />
        <p className="font-['Fraunces'] italic text-2xl text-[#2d2a26] animate-pulse">Crafting your recipe...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 relative bg-[#faf8f5] max-w-2xl mx-auto w-full">
      <header className="flex justify-between items-start mb-8 pt-4">
        <div>
          <button onClick={onBack} className="p-2 -ml-2 mb-4 rounded-full hover:bg-[#f0ebe3] text-[#c67d5a]">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[40px] font-['Fraunces'] italic text-[#2d2a26] leading-tight mb-4">
            {recipe.emoji} {recipe.name}
          </h1>
          <div className="flex items-center gap-3 text-[#c67d5a] text-sm font-['Karla'] font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1"><Clock size={16} /> {recipe.timeMinutes} min</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Flame size={16} /> {recipe.difficulty}</span>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-6">Steps</h2>
        <div className="space-y-4 mb-32">
          {recipe.steps.map((step, idx) => {
            const stepSubs = substitutions[idx] ?? {};
            const hasMods = Object.keys(stepSubs).length > 0;
            return (
              <div 
                key={idx}
                onClick={() => { setActiveStep(idx); setShowSubSheet(true); }}
                className="p-5 bg-[#f5f0e6] transition-all cursor-pointer hover:-translate-y-1"
                style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
              >
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-[#8fa68f] text-white font-['Karla']">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-['Fraunces'] font-bold mb-2 text-[#2d2a26] text-lg">
                      {step.title} {hasMods && <span className="text-[10px] bg-[#d4c4a8] px-2 py-0.5 rounded-full ml-2 text-[#2d2a26] font-['Karla'] uppercase align-middle">Modified</span>}
                    </h3>
                    <p className="text-base text-[#6b6560] font-['Karla'] leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-24 md:bottom-6 left-6 right-6 max-w-[382px] mx-auto z-20 flex flex-col gap-3">
        <button 
          onClick={onBack}
          className="w-full text-[#c67d5a] py-3 font-['Karla'] font-medium text-base hover:bg-[#f0ebe3] transition-colors btn-secondary"
        >
          Regenerate
        </button>
        <button 
          onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id, source: 'cook' })}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 btn-primary"
        >
          View Full Recipe →
        </button>
      </div>

      <AnimatePresence>
        {showSubSheet && activeStep !== null && recipe?.steps[activeStep] && (
          <IngredientSubstitutionSheet
            step={recipe.steps[activeStep]}
            stepIdx={activeStep}
            recipeIngredients={recipe.ingredients}
            substitutions={substitutions}
            onChange={setSubstitutions}
            onClose={() => setShowSubSheet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Recipe Detail Screen ──────────────────────────────────────────────────

function RecipeDetailScreen({ recipeId, onBack, navigate, source }: {
  recipeId: number;
  onBack: () => void;
  navigate: (screen: ScreenState) => void;
  source?: 'cook' | 'explore' | 'favorites';
}) {
  const { data: recipe, isLoading } = useGetRecipe(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetRecipeQueryKey(recipeId) }
  });
  const { data: favStatus } = useGetFavoriteStatus(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetFavoriteStatusQueryKey(recipeId) }
  });

  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const createShoppingItem = useCreateShoppingItem();
  const createCookingLog = useCreateCookingLog();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showSubSheet, setShowSubSheet] = useState(false);
  const [substitutions, setSubstitutions] = useState<SubstitutionState>({});
  const [doneLoading, setDoneLoading] = useState(false);

  if (isLoading || !recipe) return <div className="p-6 text-center mt-20"><Loader2 className="animate-spin inline text-[#8fa68f]" /></div>;

  const isFav = favStatus?.isFavorited;

  const toggleFavorite = () => {
    if (isFav) {
      removeFavorite.mutate({ recipeId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFavoriteStatusQueryKey(recipeId) });
          queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
        }
      });
    } else {
      addFavorite.mutate({ recipeId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFavoriteStatusQueryKey(recipeId) });
          queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
        }
      });
    }
  };

  const handleDone = () => {
    setDoneLoading(true);
    createCookingLog.mutate({
      data: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        imageUrl: recipe.imageUrl ?? null,
        kcal: recipe.nutrition.kcal,
        protein: recipe.nutrition.protein,
        carbs: recipe.nutrition.carbs,
        fat: recipe.nutrition.fat,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCookingStreakQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListCookingLogsQueryKey() });
        navigate({
          name: 'congrats',
          recipeName: recipe.name,
          imageUrl: recipe.imageUrl,
          kcal: recipe.nutrition.kcal,
          protein: recipe.nutrition.protein,
          carbs: recipe.nutrition.carbs,
          fat: recipe.nutrition.fat,
        });
      },
      onError: () => setDoneLoading(false),
    });
  };

  const handleAddToShoppingList = () => {
    recipe.ingredients.forEach(ing => {
      createShoppingItem.mutate({
        data: { name: ing.name, emoji: ing.emoji, quantity: ing.quantity, category: "Produce", recipeId: recipe.id }
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
      });
    });
    if (!isFav) {
      addFavorite.mutate({ recipeId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFavoriteStatusQueryKey(recipeId) });
          queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
        }
      });
    }
    onBack();
  };

  const handleAddMissing = (itemName: string) => {
    createShoppingItem.mutate({
      data: { name: itemName, quantity: "1", category: "Pantry", recipeId: recipe.id }
    }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
  };

  const bottomButton = () => {
    if (source === 'cook') {
      return (
        <button 
          onClick={handleDone}
          disabled={doneLoading}
          className="w-full bg-[#c67d5a] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 btn-primary disabled:opacity-70"
          style={{ borderRadius: '16px' }}
        >
          {doneLoading ? <Loader2 className="animate-spin" size={22} /> : <>Done! <Sparkles size={20} /></>}
        </button>
      );
    }
    if (source === 'explore') {
      return (
        <button
          onClick={handleAddToShoppingList}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 btn-primary"
          style={{ borderRadius: '16px' }}
        >
          <ShoppingCart size={20} /> Add to Shopping List
        </button>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] relative overflow-y-auto w-full max-w-3xl mx-auto">
      <div className="sticky top-0 z-20 px-6 py-4 flex justify-between items-center pointer-events-none">
        <button onClick={onBack} className="p-3 bg-[#f5f0e6] shadow-md pointer-events-auto transition-transform hover:scale-105" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
          <ArrowLeft size={20} className="text-[#c67d5a]" />
        </button>
        <button onClick={toggleFavorite} className="p-3 bg-[#f5f0e6] shadow-md pointer-events-auto transition-transform hover:scale-105" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
          {isFav ? <Heart className="fill-[#c67d5a] text-[#c67d5a]" size={20} /> : <Heart size={20} className="text-[#c67d5a]" />}
        </button>
      </div>

      <div className="px-6 pb-32 -mt-16">
        <div className="mb-8 flex justify-center">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.name} className="w-full max-w-[400px] h-[300px] object-cover shadow-lg" style={{ animation: 'morphRadius 20s ease-in-out infinite' }} />
          ) : (
            <div className="w-full max-w-[300px] h-[300px] bg-[#f0ebe3] flex items-center justify-center text-[100px] shadow-lg" style={{ animation: 'morphRadius 20s ease-in-out infinite' }}>
              {recipe.emoji}
            </div>
          )}
        </div>

        <h1 className="text-[42px] font-['Fraunces'] italic text-[#2d2a26] leading-tight mb-4 text-center">
          {recipe.name}
        </h1>
        
        <div className="flex justify-center items-center gap-4 text-[#c67d5a] text-sm font-['Karla'] font-semibold uppercase tracking-widest mb-10">
          <span>{recipe.timeMinutes} min</span>
          <span>·</span>
          <span>{recipe.difficulty}</span>
          <span>·</span>
          <span>{recipe.category}</span>
        </div>

        <div className="bg-[#d4c4a8] p-5 flex justify-between mb-10" style={{ borderRadius: '20px 40px 20px 40px' }}>
          <div className="text-center flex-1">
            <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.nutrition.kcal}</div>
            <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Kcal</div>
          </div>
          <div className="w-px bg-[#6b6560]/20 mx-2"></div>
          <div className="text-center flex-1">
            <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.nutrition.protein}</div>
            <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Protein</div>
          </div>
          <div className="w-px bg-[#6b6560]/20 mx-2"></div>
          <div className="text-center flex-1">
            <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.nutrition.carbs}</div>
            <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Carbs</div>
          </div>
          <div className="w-px bg-[#6b6560]/20 mx-2"></div>
          <div className="text-center flex-1">
            <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.nutrition.fat}</div>
            <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Fat</div>
          </div>
        </div>

        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <div className="mb-10 p-5 bg-[#e8a889]/20" style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}>
            <h3 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Missing Ingredients</h3>
            <ul className="space-y-3">
              {recipe.missingIngredients.map((item, i) => (
                <li key={i} className="flex justify-between items-center text-sm text-[#2d2a26] font-['Karla'] font-medium">
                  <span>• {item}</span>
                  <button 
                    onClick={() => handleAddMissing(item)}
                    className="text-[11px] bg-[#f5f0e6] px-3 py-1.5 uppercase tracking-wider text-[#c67d5a] hover:bg-[#d4c4a8] transition-colors"
                    style={{ borderRadius: '20px 10px 20px 10px' }}
                  >
                    + Shop
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-12">
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-6">Ingredients</h2>
          <ul className="space-y-4">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between items-center pb-3 border-b border-[#f0ebe3] relative pl-4">
                <div className="absolute left-0 top-1 bottom-1 w-1 bg-[#c67d5a]" style={{ borderRadius: '4px 8px 4px 8px' }} />
                <span className="text-[#2d2a26] font-['Karla'] text-lg"><span className="mr-3">{ing.emoji}</span>{ing.name}</span>
                <span className="text-[#6b6560] font-['Karla'] font-semibold">{ing.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-6">Method</h2>
          <p className="text-[11px] font-['Karla'] text-[#8fa68f] mb-4">Tap any step to substitute or exclude ingredients</p>
          <div className="space-y-6">
            {recipe.steps.map((step, idx) => {
              const stepSubs = substitutions[idx] ?? {};
              const hasMods = Object.keys(stepSubs).length > 0;
              return (
                <div 
                  key={idx}
                  onClick={() => { setActiveStep(idx); setShowSubSheet(true); }}
                  className="p-5 bg-[#f5f0e6] transition-all cursor-pointer hover:-translate-y-1"
                  style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
                >
                  <div className="flex gap-4">
                    <div className="w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0 bg-[#8fa68f] text-white font-['Karla']" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                      {step.number}
                    </div>
                    <div>
                      <h3 className="font-['Fraunces'] font-bold mb-2 text-[#2d2a26] text-lg">
                        {step.title} {hasMods && <span className="text-[10px] bg-[#d4c4a8] px-2 py-0.5 rounded-full ml-2 text-[#2d2a26] font-['Karla'] uppercase align-middle">Modified</span>}
                      </h3>
                      <p className="text-base text-[#6b6560] font-['Karla'] leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {bottomButton() && (
        <div className="fixed bottom-24 md:bottom-6 left-6 right-6 max-w-[382px] mx-auto z-20">
          {bottomButton()}
        </div>
      )}

      <AnimatePresence>
        {showSubSheet && activeStep !== null && recipe?.steps[activeStep] && (
          <IngredientSubstitutionSheet
            step={recipe.steps[activeStep]}
            stepIdx={activeStep}
            recipeIngredients={recipe.ingredients}
            substitutions={substitutions}
            onChange={setSubstitutions}
            onClose={() => setShowSubSheet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Congratulations Screen ────────────────────────────────────────────────

function CongratulationsScreen({ recipe, navigate }: {
  recipe: { recipeName: string; imageUrl?: string | null; kcal: number; protein: string; carbs: string; fat: string };
  navigate: (screen: ScreenState) => void;
}) {
  const { data: streak } = useGetCookingStreak();
  const [msgIdx] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length));
  const message = MOTIVATIONAL_MESSAGES[msgIdx];

  return (
    <div className="flex flex-col items-center min-h-full bg-[#faf8f5] px-6 pb-12 pt-12 max-w-lg mx-auto w-full text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
        className="text-7xl mb-4"
      >
        🎉
      </motion.div>

      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-[44px] font-['Fraunces'] italic text-[#2d2a26] leading-tight mb-2"
      >
        Well done!
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-['Karla'] text-[#6b6560] text-lg mb-6"
      >
        You cooked <span className="font-semibold text-[#2d2a26]">{recipe.recipeName}</span>
      </motion.p>

      {recipe.imageUrl && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-48 h-48 mb-8 overflow-hidden shadow-lg"
          style={{ animation: 'morphRadius 15s ease-in-out infinite' }}
        >
          <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
        </motion.div>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full bg-[#d4c4a8] p-5 mb-6 flex justify-between"
        style={{ borderRadius: '20px 40px 20px 40px' }}
      >
        <div className="text-center flex-1">
          <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.kcal}</div>
          <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Kcal</div>
        </div>
        <div className="w-px bg-[#6b6560]/20 mx-2" />
        <div className="text-center flex-1">
          <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.protein}</div>
          <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Protein</div>
        </div>
        <div className="w-px bg-[#6b6560]/20 mx-2" />
        <div className="text-center flex-1">
          <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.carbs}</div>
          <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Carbs</div>
        </div>
        <div className="w-px bg-[#6b6560]/20 mx-2" />
        <div className="text-center flex-1">
          <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{recipe.fat}</div>
          <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Fat</div>
        </div>
      </motion.div>

      {streak && streak.currentStreak > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 14 }}
          className="flex items-center gap-3 bg-[#f5f0e6] px-8 py-4 mb-6 shadow-sm"
          style={{ borderRadius: '50px' }}
        >
          <span className="text-3xl">🔥</span>
          <div className="text-left">
            <div className="text-2xl font-['Fraunces'] font-bold text-[#c67d5a]">{streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}</div>
            <div className="text-xs font-['Karla'] text-[#6b6560] uppercase tracking-widest">Cooking streak</div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-[#b8ccb8]/30 px-6 py-4 mb-10 w-full"
        style={{ borderRadius: '20px 40px 20px 40px' }}
      >
        <p className="font-['Fraunces'] italic text-[#2d2a26] text-lg leading-snug">"{message}"</p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex gap-4 w-full"
      >
        <button
          onClick={() => navigate({ name: 'tabs', tab: 'calendar' })}
          className="flex-1 border-2 border-[#8fa68f] text-[#8fa68f] py-3 font-['Karla'] font-semibold"
          style={{ borderRadius: '16px' }}
        >
          View Calendar
        </button>
        <button
          onClick={() => navigate({ name: 'tabs', tab: 'cook' })}
          className="flex-1 bg-[#8fa68f] text-white py-3 font-['Karla'] font-semibold shadow-lg btn-primary"
          style={{ borderRadius: '16px' }}
        >
          Back to Cook
        </button>
      </motion.div>
    </div>
  );
}

// ── Shop Tab ──────────────────────────────────────────────────────────────

function QuantityEditor({ item }: { item: ShoppingItem }) {
  const [qty, setQty] = useState(item.quantity);
  const updateItem = useUpdateShoppingItem();
  const queryClient = useQueryClient();
  
  const update = (newQty: string) => {
    setQty(newQty);
    updateItem.mutate({ id: item.id, data: { quantity: newQty } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
  };

  const num = parseInt(qty);
  return (
    <div className="flex items-center gap-1 bg-[#f5f0e6] px-1 py-1" style={{ borderRadius: '20px' }}>
      {!isNaN(num) && (
        <button onClick={() => update(String(Math.max(1, num - 1)))} 
          className="w-6 h-6 rounded-full bg-[#f0ebe3] hover:bg-[#d4c4a8] text-[#6b6560] text-sm flex items-center justify-center transition-colors">−</button>
      )}
      <span className="text-sm text-[#2d2a26] font-semibold font-['Karla'] min-w-[2ch] text-center">{qty}</span>
      {!isNaN(num) && (
        <button onClick={() => update(String(num + 1))}
          className="w-6 h-6 rounded-full bg-[#f0ebe3] hover:bg-[#d4c4a8] text-[#6b6560] text-sm flex items-center justify-center transition-colors">+</button>
      )}
    </div>
  );
}

function ShopTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const { data: items = [], isLoading } = useListShoppingItems();
  const { data: recommendations } = useGetRecommendations();
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const createShoppingItem = useCreateShoppingItem();
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();

  const handleToggle = (id: number, checked: boolean) => {
    updateItem.mutate({ id, data: { checked: !checked } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
  };

  const toBuy = items.filter(i => !i.checked);
  const bought = items.filter(i => i.checked);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.transitionDelay = `${i * 100}ms`;
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0) scale(1)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    elements.forEach(el => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(40px) scale(0.95)';
      (el as HTMLElement).style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [recommendations]);

  return (
    <div className="flex flex-col h-full p-6 pb-32 bg-transparent overflow-y-auto relative w-full max-w-2xl mx-auto">
      <header className="mb-8 pt-4">
        <h1 className="text-[40px] font-['Fraunces'] italic text-[#2d2a26] mb-2">Shopping List</h1>
        {isLoaded && !user && (
          <p className="text-sm font-['Karla'] text-[#c67d5a]">Sign in to save your list across devices.</p>
        )}
      </header>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-[#f0ebe3] rounded-2xl"></div>
          <div className="h-16 bg-[#f0ebe3] rounded-2xl"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center text-[#6b6560] mt-12 mb-12">
          <div className="w-24 h-24 bg-[#f5f0e6] flex items-center justify-center mb-6" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
            <ShoppingCart size={40} className="opacity-30 text-[#8fa68f]" />
          </div>
          <p className="font-['Karla'] text-lg">Your list is empty.</p>
        </div>
      ) : (
        <div className="space-y-8 mb-12">
          {toBuy.length > 0 && (
            <div>
              <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Need to buy</h2>
              <div className="space-y-3">
                {toBuy.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#fcfbf9] shadow-sm" style={{ animation: 'organicFadeIn 0.4s ease-out forwards', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleToggle(item.id, item.checked)}
                        className="w-7 h-7 border-2 border-[#8fa68f] flex items-center justify-center transition-colors hover:bg-[#8fa68f]/10"
                        style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' }}
                      />
                      <span className="font-medium text-[#2d2a26] font-['Karla'] text-lg">{item.emoji} {item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <QuantityEditor item={item} />
                      <button onClick={() => deleteItem.mutate({id: item.id}, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })})} className="text-[#d4c4a8] hover:text-[#c67d5a] transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {bought.length > 0 && (
            <div>
              <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Already have</h2>
              <div className="space-y-3 opacity-60">
                {bought.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#f0ebe3]" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleToggle(item.id, item.checked)}
                        className="w-7 h-7 bg-[#8fa68f] flex items-center justify-center"
                        style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%', animation: 'blobPop 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                      >
                        <Check size={16} className="text-white" />
                      </button>
                      <span className="font-medium text-[#6b6560] line-through font-['Karla'] text-lg">{item.emoji} {item.name}</span>
                    </div>
                    <button onClick={() => deleteItem.mutate({id: item.id}, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })})} className="text-[#d4c4a8] hover:text-[#c67d5a]">
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {recommendations && recommendations.ingredients.length > 0 && (
        <div className="mt-8 mb-16">
          <h2 className="text-[28px] font-['Fraunces'] italic text-[#2d2a26] mb-2">Your Kitchen Needs</h2>
          <p className="text-sm font-['Karla'] text-[#6b6560] italic mb-6">{recommendations.insight}</p>
          <div className="space-y-3">
            {recommendations.ingredients.map((rec, i) => (
              <div key={i} className="reveal-card bg-[#f5f0e6] p-4 shadow-sm flex items-center gap-4" style={{ borderRadius: '20px 40px 20px 40px' }}>
                <div className="w-12 h-12 bg-[#faf8f5] flex items-center justify-center text-2xl shrink-0" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                  {rec.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-['Fraunces'] font-bold text-[#2d2a26] text-base leading-tight mb-0.5">{rec.name}</h3>
                  <p className="text-[#6b6560] text-xs font-['Karla'] leading-snug line-clamp-2">{rec.reason}</p>
                </div>
                <button 
                  onClick={() => createShoppingItem.mutate({ data: { name: rec.name, emoji: rec.emoji, quantity: "1", category: rec.category } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() }) })}
                  className="shrink-0 text-[11px] uppercase tracking-widest font-['Karla'] bg-[#8fa68f] text-white px-3 py-2"
                  style={{ borderRadius: '50px 20px 50px 20px' }}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed md:absolute bottom-24 md:bottom-6 right-6 z-20">
        <button 
          onClick={() => navigate({ name: 'add-item' })}
          className="w-16 h-16 bg-[#c67d5a] text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
          style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
        >
          <Plus size={28} />
        </button>
      </div>
    </div>
  );
}

// ── Add Item Screen ───────────────────────────────────────────────────────

function AddItemScreen({ navigate, onBack }: { navigate: (screen: ScreenState) => void, onBack: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Pantry");
  const createItem = useCreateShoppingItem();
  const queryClient = useQueryClient();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createItem.mutate({
      data: { name, quantity: "1", category }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() });
        onBack();
      }
    });
  };

  const categories = ["Produce", "Pantry", "Dairy", "Meat", "Spices", "Other"];

  return (
    <div className="flex flex-col h-full p-6 relative bg-[#faf8f5] max-w-2xl mx-auto w-full">
      <header className="flex items-center gap-4 mb-10 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[#f0ebe3] text-[#c67d5a]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-['Fraunces'] italic text-[#2d2a26]">Add Item</h1>
      </header>

      <form onSubmit={handleAdd} className="flex-1 space-y-10">
        <div>
          <label className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-2 block">Item Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Olive Oil" 
            className="w-full bg-transparent border-b-2 border-[#d4c4a8] pb-2 focus:outline-none focus:border-[#c67d5a] text-2xl font-['Fraunces'] transition-colors text-[#2d2a26] placeholder:text-[#d4c4a8]"
            autoFocus
          />
        </div>
        <div>
          <label className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4 block">Category</label>
          <div className="flex flex-wrap gap-3">
            {categories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-4 py-2 text-sm font-['Karla'] font-medium transition-all ${
                  category === c ? "bg-[#8fa68f] text-white" : "bg-[#f5f0e6] text-[#6b6560]"
                }`}
                style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4 mt-8">Pantry Staples</h3>
          <div className="flex flex-wrap gap-3">
            {["Milk", "Bread", "Eggs", "Onions", "Salt"].map(item => (
              <button 
                key={item}
                type="button"
                onClick={() => setName(item)}
                className="bg-transparent border border-[#d4c4a8] text-[#6b6560] px-4 py-2 text-sm transition-colors hover:border-[#c67d5a] font-['Karla']"
                style={{ borderRadius: '20px 40px 20px 40px' }}
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div className="mb-6 mt-8">
        <button 
          onClick={handleAdd}
          disabled={!name.trim() || createItem.isPending}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 transition-all btn-primary disabled:opacity-50"
        >
          Add to List
        </button>
      </div>
    </div>
  );
}

// ── Explore Tab ───────────────────────────────────────────────────────────

function ExploreTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  
  const { data: recipes = [], isLoading } = useListRecipes({ search, category: category !== "All" ? category : undefined });

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.transitionDelay = `${i * 120}ms`;
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0) scale(1)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    elements.forEach(el => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(40px) scale(0.95)';
      (el as HTMLElement).style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [recipes]);

  const categories = ["All", "Asian", "Breakfast", "Italian", "Vegan", "General"];

  return (
    <div className="flex flex-col h-full p-6 pb-32 bg-transparent overflow-y-auto relative w-full max-w-5xl mx-auto">
      <header className="mb-8 pt-4 flex justify-between items-start">
        <h1 className="text-[40px] font-['Fraunces'] italic text-[#2d2a26]">Explore</h1>
        <UserAuthButton navigate={(p) => window.location.href = p} />
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c67d5a]" size={20} />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes..." 
          className="w-full bg-[#f5f0e6] pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#8fa68f] text-[#2d2a26] placeholder:text-[#d4c4a8] font-['Karla'] text-lg"
          style={{ borderRadius: '40px 20px 40px 20px' }}
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 hide-scrollbar -mx-6 px-6">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap px-5 py-2 text-sm font-['Karla'] font-medium transition-all ${
              category === c 
                ? "bg-[#c67d5a] text-white" 
                : "bg-[#f0ebe3] text-[#6b6560] hover:bg-[#d4c4a8]"
            }`}
            style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-[#f0ebe3] animate-pulse" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}></div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4 opacity-50">🔍</div>
          <p className="text-[#6b6560] font-['Karla'] text-lg">No recipes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recipes.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id, source: 'explore' })}
              className="reveal-card group cursor-pointer"
            >
              <div className="aspect-[4/5] bg-[#f5f0e6] mb-4 relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-xl flex flex-col items-center justify-center p-4"
                   style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}>
                {recipe.isFavorited && (
                  <div className="absolute top-3 right-3 bg-[#faf8f5] p-2 z-10" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                    <Heart size={16} className="fill-[#c67d5a] text-[#c67d5a]" />
                  </div>
                )}
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-500">{recipe.emoji}</span>
                )}
              </div>
              <h3 className="font-['Fraunces'] font-bold text-[#2d2a26] text-lg leading-tight mb-1 group-hover:text-[#c67d5a] transition-colors">{recipe.name}</h3>
              <div className="flex items-center justify-between text-xs font-['Karla']">
                <span className="text-[#6b6560]">{recipe.timeMinutes}m · {recipe.difficulty}</span>
                <span className="text-[#c67d5a] font-bold">{recipe.kcal} kcal</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────

type CalendarView = 'week' | 'month' | 'year';

function CalendarTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const [view, setView] = useState<CalendarView>('month');
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: streak } = useGetCookingStreak();
  const { data: logs = [] } = useListCookingLogs();
  const { data: statsWeek } = useGetCookingStats({ period: 'week' });
  const { data: statsMonth } = useGetCookingStats({ period: 'month' });
  const { data: statsYear } = useGetCookingStats({ period: 'year' });

  const stats = view === 'week' ? statsWeek : view === 'month' ? statsMonth : statsYear;

  // Index logs by date: 'YYYY-MM-DD' -> CookingLog[]
  const logsByDate = useMemo(() => {
    const map: Record<string, CookingLog[]> = {};
    logs.forEach(log => {
      const d = new Date(log.cookedAt).toISOString().split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(log);
    });
    return map;
  }, [logs]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Selected date logs
  const selectedLogs = selectedDate ? (logsByDate[selectedDate] ?? []) : [];

  // Month helpers
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS_SHORT = ['M','T','W','T','F','S','S'];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
  };

  // ── Week View ─────────────────────────────────────────────────────────────

  function WeekView() {
    const weekDays: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      weekDays.push(d.toISOString().split('T')[0]);
    }
    const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((dateStr, i) => {
            const d = new Date(dateStr);
            const dayLogs = logsByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasLog = dayLogs.length > 0;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-wider">{DAY_LABELS[(d.getDay() + 6) % 7]}</span>
                <div className={`w-10 h-10 flex items-center justify-center text-sm font-['Fraunces'] font-bold transition-all relative ${
                  isSelected ? 'bg-[#c67d5a] text-white shadow-lg' :
                  isToday ? 'bg-[#8fa68f] text-white shadow-md' :
                  hasLog ? 'bg-[#b8ccb8] text-[#2d2a26]' :
                  'bg-[#f5f0e6] text-[#6b6560]'
                }`} style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                  {d.getDate()}
                  {hasLog && !isSelected && !isToday && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#c67d5a] rounded-full" />
                  )}
                </div>
                {dayLogs[0]?.imageUrl ? (
                  <div className="w-8 h-8 overflow-hidden" style={{ borderRadius: '50%' }}>
                    <img src={dayLogs[0].imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : hasLog ? (
                  <div className="w-2 h-2 bg-[#c67d5a] rounded-full" />
                ) : <div className="w-2 h-2" />}
              </button>
            );
          })}
        </div>

        {selectedDate && selectedLogs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
            <h4 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a]">
              {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            {selectedLogs.map(log => (
              <div key={log.id} className="flex items-center gap-4 p-4 bg-[#f5f0e6]" style={{ borderRadius: '20px 40px 20px 40px' }}>
                {log.imageUrl && (
                  <div className="w-14 h-14 overflow-hidden shrink-0" style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}>
                    <img src={log.imageUrl} alt={log.recipeName} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-['Fraunces'] font-bold text-[#2d2a26]">{log.recipeName}</p>
                  <p className="text-xs font-['Karla'] text-[#6b6560]">{log.kcal} kcal · {log.protein} protein</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  // ── Month View ────────────────────────────────────────────────────────────

  function MonthView() {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Pad to complete grid
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setMonthOffset(o => o - 1)} className="p-2 hover:bg-[#f0ebe3] rounded-full text-[#c67d5a] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-sm font-['Karla'] text-[#6b6560]">{year}</div>
            <div className="text-2xl font-['Fraunces'] italic text-[#2d2a26]">{MONTHS[month]}</div>
          </div>
          <button onClick={() => setMonthOffset(o => o + 1)} className="p-2 hover:bg-[#f0ebe3] rounded-full text-[#c67d5a] transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_SHORT.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-['Karla'] text-[#6b6560] uppercase py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayLogs = logsByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasLog = dayLogs.length > 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="aspect-square flex flex-col items-center justify-center relative transition-transform hover:scale-105"
                style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
              >
                {hasLog && dayLogs[0].imageUrl ? (
                  <div className={`absolute inset-0 overflow-hidden ${isSelected ? 'ring-2 ring-[#c67d5a]' : ''}`} style={{ borderRadius: 'inherit' }}>
                    <img src={dayLogs[0].imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-[#2d2a26]/30" />
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-['Fraunces'] font-bold">{day}</span>
                  </div>
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-sm font-['Fraunces'] ${
                    isSelected ? 'bg-[#c67d5a] text-white' :
                    isToday ? 'bg-[#8fa68f] text-white' :
                    hasLog ? 'bg-[#b8ccb8] text-[#2d2a26]' :
                    'bg-[#f5f0e6] text-[#6b6560]'
                  }`} style={{ borderRadius: 'inherit' }}>
                    {day}
                    {hasLog && !isSelected && !isToday && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#c67d5a] rounded-full" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <h4 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-3">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            {selectedLogs.length === 0 ? (
              <p className="text-[#6b6560] font-['Karla'] text-sm text-center py-4">Nothing cooked this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-4 p-4 bg-[#f5f0e6]" style={{ borderRadius: '20px 40px 20px 40px' }}>
                    {log.imageUrl && (
                      <div className="w-14 h-14 overflow-hidden shrink-0" style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}>
                        <img src={log.imageUrl} alt={log.recipeName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-['Fraunces'] font-bold text-[#2d2a26]">{log.recipeName}</p>
                      <p className="text-xs font-['Karla'] text-[#6b6560]">{log.kcal} kcal · {log.protein} protein · {log.carbs} carbs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // ── Year View ─────────────────────────────────────────────────────────────

  function YearView() {
    const currentYear = today.getFullYear();

    return (
      <div>
        <div className="text-center mb-6">
          <div className="text-sm font-['Karla'] text-[#6b6560] uppercase tracking-widest">In Review</div>
          <div className="text-5xl font-['Fraunces'] italic text-[#2d2a26]">{currentYear}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {MONTHS.map((monthName, mIdx) => {
            const daysInM = getDaysInMonth(currentYear, mIdx);
            const firstDay = getFirstDayOfMonth(currentYear, mIdx);
            const cells: (number | null)[] = [
              ...Array(firstDay).fill(null),
              ...Array.from({ length: daysInM }, (_, i) => i + 1),
            ];
            while (cells.length % 7 !== 0) cells.push(null);

            const hasCookInMonth = Array.from({ length: daysInM }, (_, i) => {
              const d = `${currentYear}-${String(mIdx+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
              return !!logsByDate[d];
            });
            const totalCooks = hasCookInMonth.filter(Boolean).length;

            return (
              <div key={mIdx} className="bg-[#f5f0e6] p-3" style={{ borderRadius: '20px 30px 20px 30px' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-['Karla'] font-bold text-[#6b6560] uppercase tracking-wider">{monthName.slice(0,3)}</span>
                  {totalCooks > 0 && <span className="text-[10px] font-['Karla'] text-[#c67d5a]">{totalCooks}</span>}
                </div>
                <div className="grid grid-cols-7 gap-[2px]">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={idx} className="aspect-square" />;
                    const dateStr = `${currentYear}-${String(mIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const hasLog = !!logsByDate[dateStr];
                    const isTodayCell = dateStr === todayStr;
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-sm transition-colors ${
                          isTodayCell ? 'bg-[#8fa68f]' :
                          hasLog ? 'bg-[#c67d5a]/80' :
                          'bg-[#d4c4a8]/50'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 pb-32 bg-transparent overflow-y-auto w-full max-w-2xl mx-auto">
      <header className="pt-4 mb-6">
        <h1 className="text-[40px] font-['Fraunces'] italic text-[#2d2a26] mb-4">Calendar</h1>

        {streak && (
          <div className="flex items-center gap-4 bg-[#f5f0e6] p-4 mb-6" style={{ borderRadius: '20px 40px 20px 40px' }}>
            <div className="text-4xl">🔥</div>
            <div>
              <div className="text-3xl font-['Fraunces'] font-bold text-[#c67d5a] leading-none">{streak.currentStreak}</div>
              <div className="text-[11px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-0.5">
                {streak.currentStreak === 1 ? 'Day streak' : 'Days streak'} · {streak.totalCooked} total meals
              </div>
            </div>
            {streak.longestStreak > 0 && (
              <div className="ml-auto text-right">
                <div className="text-xl font-['Fraunces'] font-bold text-[#8fa68f]">{streak.longestStreak}</div>
                <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-wider">Best</div>
              </div>
            )}
          </div>
        )}

        <div className="flex bg-[#f5f0e6] p-1" style={{ borderRadius: '50px' }}>
          {(['week','month','year'] as CalendarView[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setSelectedDate(null); }}
              className={`flex-1 py-2 text-sm font-['Karla'] font-semibold capitalize transition-all ${
                view === v
                  ? 'bg-[#2d2a26] text-white shadow-md'
                  : 'text-[#6b6560] hover:text-[#2d2a26]'
              }`}
              style={{ borderRadius: '40px' }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1">
        {view === 'week' && <WeekView />}
        {view === 'month' && <MonthView />}
        {view === 'year' && <YearView />}
      </div>

      {stats && (
        <div className="mt-8">
          <h3 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">
            This {view === 'week' ? 'Week' : view === 'month' ? 'Month' : 'Year'}'s Nutrition
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f5f0e6] p-4 text-center" style={{ borderRadius: '20px 40px 20px 40px' }}>
              <div className="text-2xl font-['Fraunces'] font-bold text-[#c67d5a]">{stats.meals}</div>
              <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Meals</div>
            </div>
            <div className="bg-[#f5f0e6] p-4 text-center" style={{ borderRadius: '20px 40px 20px 40px' }}>
              <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{stats.totalKcal}</div>
              <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Total Kcal</div>
            </div>
            <div className="bg-[#f5f0e6] p-4 text-center" style={{ borderRadius: '20px 40px 20px 40px' }}>
              <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{stats.avgProtein}</div>
              <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Avg Protein</div>
            </div>
            <div className="bg-[#f5f0e6] p-4 text-center" style={{ borderRadius: '20px 40px 20px 40px' }}>
              <div className="text-2xl font-['Fraunces'] font-bold text-[#8fa68f]">{stats.avgCarbs}</div>
              <div className="text-[10px] font-['Karla'] text-[#6b6560] uppercase tracking-widest mt-1">Avg Carbs</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Favorites Screen ──────────────────────────────────────────────────────

function FavoritesScreen({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const { data: recipes = [], isLoading } = useListFavorites();

  useEffect(() => {
    if (isLoading) return;
    const elements = document.querySelectorAll('.reveal-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.transitionDelay = `${i * 100}ms`;
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0) scale(1)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    elements.forEach(el => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(40px) scale(0.95)';
      (el as HTMLElement).style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [recipes, isLoading]);

  return (
    <div className="flex flex-col h-full p-6 pb-32 bg-transparent overflow-y-auto relative w-full max-w-5xl mx-auto">
      <header className="mb-8 pt-4 flex items-center gap-4">
        <button onClick={() => navigate({ name: 'tabs', tab: 'cook' })} className="p-2 -ml-2 rounded-full hover:bg-[#f0ebe3] text-[#c67d5a]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[40px] font-['Fraunces'] italic text-[#2d2a26]">Favourites</h1>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-64 bg-[#f0ebe3] animate-pulse" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}></div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center h-full">
          <div className="w-48 h-48 bg-[#f5f0e6] mb-8 relative flex items-center justify-center" style={{ animation: 'blob-morph 15s ease-in-out infinite' }}>
            <Heart className="w-16 h-16 text-[#e8a889]" style={{ animation: 'float 4s ease-in-out infinite' }} />
          </div>
          <h2 className="text-2xl font-['Fraunces'] italic text-[#2d2a26] mb-2">No favourites yet</h2>
          <p className="text-[#6b6560] font-['Karla'] max-w-[250px]">Save recipes you love to find them easily later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recipes.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id, source: 'favorites' })}
              className="reveal-card group cursor-pointer"
            >
              <div className="aspect-[4/5] bg-[#f5f0e6] mb-4 relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-xl flex flex-col items-center justify-center p-4"
                   style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}>
                <div className="absolute top-3 right-3 bg-[#faf8f5] p-2 z-10" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                  <Heart size={16} className="fill-[#c67d5a] text-[#c67d5a]" />
                </div>
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-500">{recipe.emoji}</span>
                )}
              </div>
              <h3 className="font-['Fraunces'] font-bold text-[#2d2a26] text-lg leading-tight mb-1 group-hover:text-[#c67d5a] transition-colors">{recipe.name}</h3>
              <div className="flex items-center justify-between text-xs font-['Karla']">
                <span className="text-[#6b6560]">{recipe.timeMinutes}m · {recipe.difficulty}</span>
                <span className="text-[#c67d5a] font-bold">{recipe.kcal} kcal</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────

function MainLayout() {
  const [screen, setScreen] = useState<ScreenState>({ name: 'tabs', tab: 'cook' });

  const navigate = (newState: ScreenState) => setScreen(newState);

  const activeTab = screen.name === 'tabs' ? screen.tab : null;

  const NavBtn = ({
    tab, icon, label,
  }: { tab: 'cook' | 'shop' | 'explore' | 'calendar'; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => navigate({ name: 'tabs', tab })}
      className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab ? 'text-[#8fa68f]' : 'text-[#6b6560]'}`}
    >
      <div className={`p-2 transition-all ${activeTab === tab ? 'bg-[#b8ccb8]/30' : ''}`} style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' }}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
    </button>
  );

  const SideNavBtn = ({
    tab, icon, label,
  }: { tab: 'cook' | 'shop' | 'explore' | 'calendar'; icon: React.ReactNode; label: string }) => (
    <li>
      <button
        onClick={() => navigate({ name: 'tabs', tab })}
        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-['Karla'] font-medium text-lg ${
          activeTab === tab ? 'bg-[#8fa68f] text-white shadow-md' : 'text-[#6b6560] hover:bg-[#f0ebe3]'
        }`}
      >
        {icon} {label}
      </button>
    </li>
  );

  return (
    <div className="min-h-[100dvh] bg-[#faf8f5] text-[#2d2a26] font-['Karla'] overflow-hidden flex flex-col md:flex-row relative">
      <div className="blob-bg">
        <div className="blob blob-1"/>
        <div className="blob blob-2"/>
        <div className="blob blob-3"/>
      </div>

      <nav className="hidden md:flex flex-col w-64 bg-[#f5f0e6]/80 backdrop-blur border-r border-[#d4c4a8] z-30 shrink-0 h-[100dvh] p-6 justify-between">
        <div>
          <h1 className="text-3xl font-['Fraunces'] italic text-[#2d2a26] mb-12 px-2 tracking-tight">SmartCook</h1>
          <ul className="space-y-4">
            <SideNavBtn tab="cook" icon={<ChefHat size={24} />} label="Cook" />
            <SideNavBtn tab="shop" icon={<ShoppingCart size={24} />} label="Shop" />
            <SideNavBtn tab="explore" icon={<Compass size={24} />} label="Explore" />
            <SideNavBtn tab="calendar" icon={<CalendarDays size={24} />} label="Calendar" />
          </ul>
        </div>
        <div className="pt-8 border-t border-[#d4c4a8]">
          <UserAuthButton navigate={(p) => window.location.href = p} />
        </div>
      </nav>

      <div className="flex-1 relative h-[100dvh] overflow-hidden z-10">
        <ScreenWrapper isActive={screen.name === 'tabs' && screen.tab === 'cook'}>
          <CookTab navigate={navigate} />
        </ScreenWrapper>
        <ScreenWrapper isActive={screen.name === 'tabs' && screen.tab === 'shop'}>
          <ShopTab navigate={navigate} />
        </ScreenWrapper>
        <ScreenWrapper isActive={screen.name === 'tabs' && screen.tab === 'explore'}>
          <ExploreTab navigate={navigate} />
        </ScreenWrapper>
        <ScreenWrapper isActive={screen.name === 'tabs' && screen.tab === 'calendar'}>
          <CalendarTab navigate={navigate} />
        </ScreenWrapper>

        <ScreenWrapper isActive={screen.name === 'preferences'}>
          <PreferencesScreen navigate={navigate} onBack={() => navigate({ name: 'tabs', tab: 'cook' })} />
        </ScreenWrapper>

        <ScreenWrapper isActive={screen.name === 'recipe-output'}>
          {screen.name === 'recipe-output' && (
            <RecipeOutputScreen 
              recipeId={screen.recipeId} 
              navigate={navigate} 
              onBack={() => navigate({ name: 'preferences' })} 
            />
          )}
        </ScreenWrapper>

        <ScreenWrapper isActive={screen.name === 'recipe-detail'}>
          {screen.name === 'recipe-detail' && (
            <RecipeDetailScreen 
              recipeId={screen.recipeId}
              source={screen.source}
              navigate={navigate}
              onBack={() => {
                if (screen.source === 'favorites') navigate({ name: 'favorites' });
                else if (screen.source === 'explore') navigate({ name: 'tabs', tab: 'explore' });
                else navigate({ name: 'tabs', tab: 'cook' });
              }}
            />
          )}
        </ScreenWrapper>

        <ScreenWrapper isActive={screen.name === 'congrats'}>
          {screen.name === 'congrats' && (
            <CongratulationsScreen recipe={screen} navigate={navigate} />
          )}
        </ScreenWrapper>

        <ScreenWrapper isActive={screen.name === 'add-item'}>
          <AddItemScreen navigate={navigate} onBack={() => navigate({ name: 'tabs', tab: 'shop' })} />
        </ScreenWrapper>

        <ScreenWrapper isActive={screen.name === 'favorites'}>
          <FavoritesScreen navigate={navigate} />
        </ScreenWrapper>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe">
        <div className="bg-[#f5f0e6]/90 backdrop-blur border-t border-[#d4c4a8] px-6 py-4 flex justify-between items-center" style={{ borderRadius: '20px 20px 0 0' }}>
          <NavBtn tab="cook" icon={<ChefHat size={24} />} label="Cook" />
          <NavBtn tab="shop" icon={<ShoppingCart size={24} />} label="Shop" />
          <NavBtn tab="explore" icon={<Compass size={24} />} label="Explore" />
          <NavBtn tab="calendar" icon={<CalendarDays size={24} />} label="Calendar" />
        </div>
      </nav>
    </div>
  );
}

// ── Clerk Provider ────────────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{ signIn: { start: { title: "Welcome back", subtitle: "Sign in to SmartCook" } }, signUp: { start: { title: "Start cooking smarter", subtitle: "Join SmartCook today" } } }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={MainLayout} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
