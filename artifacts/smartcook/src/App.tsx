import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChefHat, ShoppingCart, Compass, Search, Plus, ArrowLeft, Heart, Check, X, Clock, Flame, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  useListIngredients, useCreateIngredient, useDeleteIngredient, getListIngredientsQueryKey,
  useGenerateRecipe, 
  useListRecipes, useGetTrendingRecipes, useGetRecipe, getGetRecipeQueryKey, getListRecipesQueryKey,
  useListShoppingItems, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, getListShoppingItemsQueryKey,
  useListFavorites, useAddFavorite, useRemoveFavorite, useGetFavoriteStatus, getListFavoritesQueryKey, getGetFavoriteStatusQueryKey,
  useGetRecommendations, getGetRecommendationsQueryKey,
  ShoppingItem, Recipe
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
  | { name: 'tabs'; tab: 'cook' | 'shop' | 'explore' }
  | { name: 'preferences' }
  | { name: 'recipe-output'; recipeId: number }
  | { name: 'recipe-detail'; recipeId: number }
  | { name: 'add-item' }
  | { name: 'favorites' };

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

function getAlternativeMethods(description: string): Array<{ label: string; newDescription: string }> {
  const d = description.toLowerCase();
  const alternatives: Array<{ label: string; newDescription: string }> = [];
  
  if (d.includes('pan') || d.includes('skillet') || d.includes('fry') || d.includes('stove')) {
    alternatives.push({ label: 'Microwave', newDescription: description.replace(/pan|skillet|fry|stove/gi, 'microwave-safe bowl').replace(/medium heat|high heat|heat/gi, 'high power') + ' (microwave on high for 2 min)' });
    alternatives.push({ label: 'Air Fryer', newDescription: description.replace(/pan|skillet/gi, 'air fryer basket') + ' (air fry at 180°C for 5 min)' });
    alternatives.push({ label: 'Oven', newDescription: description.replace(/pan|skillet/gi, 'baking dish') + ' (bake at 200°C for 10 min)' });
  }
  if (d.includes('boil') || d.includes('water')) {
    alternatives.push({ label: 'Microwave', newDescription: description + ' (use microwave-safe container, microwave 3–4 min)' });
    alternatives.push({ label: 'Steamer', newDescription: description.replace(/boil/gi, 'steam') + ' (steam for 8–10 min)' });
  }
  if (d.includes('mix') || d.includes('combine') || d.includes('stir')) {
    alternatives.push({ label: 'Food Processor', newDescription: description + ' (pulse 3–4 times in food processor)' });
    alternatives.push({ label: 'Blender', newDescription: description + ' (blend briefly until combined)' });
  }
  alternatives.unshift({ label: 'Keep Original', newDescription: description });
  return alternatives.slice(0, 4);
}

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

function CookTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const { data: ingredients = [], isLoading } = useListIngredients();
  const createIngredient = useCreateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    createIngredient.mutate({ data: { name: inputValue, emoji: "🥬" } }, {
      onSuccess: () => {
        setInputValue("");
        queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
      }
    });
  };

  const handleQuickAdd = (name: string, emoji: string) => {
    createIngredient.mutate({ data: { name, emoji } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() })
    });
  };

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
        <form onSubmit={handleAdd} className="mb-6">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type an ingredient..." 
            className="w-full bg-transparent border-b-2 border-[#d4c4a8] pb-2 focus:outline-none focus:border-[#c67d5a] text-lg transition-colors text-[#2d2a26] placeholder:text-[#d4c4a8] font-['Karla']"
            data-testid="input-ingredient"
          />
        </form>

        <div className="mb-8 min-h-[100px]">
          {isLoading ? (
            <div className="flex gap-2"><div className="h-8 w-24 bg-[#e8a889]/30 animate-pulse rounded-full" /></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {ingredients.map(ing => (
                  <motion.span 
                    key={ing.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-2 bg-[#b8ccb8] text-[#2d2a26] px-4 py-2 text-sm font-['Karla'] font-medium"
                    style={{ borderRadius: '40% 60% 60% 40% / 60% 40% 40% 60%' }}
                  >
                    <span className="text-lg">{ing.emoji}</span> {ing.name} 
                    <button 
                      onClick={() => deleteIngredient.mutate({ id: ing.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() })
                      })}
                      className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-ingredient-${ing.id}`}
                    >
                      <X size={14} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <h3 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Tomato", emoji: "🍅" },
              { name: "Eggs", emoji: "🥚" },
              { name: "Rice", emoji: "🍚" },
              { name: "Garlic", emoji: "🧄" },
              { name: "Butter", emoji: "🧈" }
            ].map(item => (
              <button 
                key={item.name}
                onClick={() => handleQuickAdd(item.name, item.emoji)}
                className="bg-[#d4c4a8] text-[#2d2a26] px-4 py-2 text-sm transition-transform hover:scale-105 font-['Karla'] font-medium"
                style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
                data-testid={`button-quick-add-${item.name}`}
              >
                {item.emoji} {item.name}
              </button>
            ))}
          </div>
        </div>
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

function PreferencesScreen({ onBack, navigate }: { onBack: () => void, navigate: (screen: ScreenState) => void }) {
  const [time, setTime] = useState("30 min");
  const [difficulty, setDifficulty] = useState("Easy");
  const [diet, setDiet] = useState("Any");
  
  const { data: ingredients = [] } = useListIngredients();
  const generateRecipe = useGenerateRecipe();

  const handleCookIt = () => {
    generateRecipe.mutate({
      data: {
        ingredientIds: ingredients.map(i => i.id),
        timePreference: time,
        difficulty,
        diet
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
      data-testid={`button-pref-${label}`}
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

      <div className="flex-1 space-y-10">
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
          <h2 className="uppercase tracking-widest text-[11px] font-['Karla'] text-[#c67d5a] mb-4">Diet</h2>
          <div className="flex flex-wrap gap-3">
            {["Any", "Vegan", "Vegetarian", "High Protein"].map(d => (
              <Pill key={d} label={d} active={diet === d} onClick={() => setDiet(d)} />
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

function RecipeOutputScreen({ recipeId, navigate, onBack }: { recipeId: number, navigate: (screen: ScreenState) => void, onBack: () => void }) {
  const { data: recipe, isLoading } = useGetRecipe(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetRecipeQueryKey(recipeId) }
  });
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [stepModifications, setStepModifications] = useState<Record<number, string>>({});
  const [showStepPanel, setShowStepPanel] = useState(false);

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
            const isModified = !!stepModifications[idx];
            const currentDesc = stepModifications[idx] || step.description;
            return (
              <div 
                key={idx}
                onClick={() => { setActiveStep(idx); setShowStepPanel(true); }}
                className="p-5 bg-[#f5f0e6] transition-all cursor-pointer hover:-translate-y-1"
                style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
                data-testid={`step-${idx}`}
              >
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-[#8fa68f] text-white font-['Karla']">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-['Fraunces'] font-bold mb-2 text-[#2d2a26] text-lg">
                      {step.title} {isModified && <span className="text-[10px] bg-[#d4c4a8] px-2 py-0.5 rounded-full ml-2 text-[#2d2a26] font-['Karla'] uppercase align-middle">Modified</span>}
                    </h3>
                    <p className="text-base text-[#6b6560] font-['Karla'] leading-relaxed">
                      {currentDesc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-6 left-6 right-6 max-w-[382px] mx-auto z-20 flex flex-col gap-3">
        <button 
          onClick={onBack}
          className="w-full text-[#c67d5a] py-3 font-['Karla'] font-medium text-base hover:bg-[#f0ebe3] transition-colors btn-secondary"
        >
          Regenerate
        </button>
        <button 
          onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id })}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 btn-primary"
        >
          View Full Recipe →
        </button>
      </div>

      <AnimatePresence>
        {showStepPanel && activeStep !== null && recipe?.steps[activeStep] && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#2d2a26] z-40"
              onClick={() => setShowStepPanel(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#f5f0e6] shadow-2xl max-w-2xl mx-auto"
              style={{ borderRadius: '40px 40px 0 0', padding: '24px 24px 40px' }}>
              <div className="w-12 h-1 bg-[#d4c4a8] rounded-full mx-auto mb-6" />
              <h3 className="font-['Fraunces'] italic text-[#2d2a26] text-xl mb-2">Adapt this step</h3>
              <p className="text-[#6b6560] font-['Karla'] text-sm mb-6 leading-relaxed">
                {stepModifications[activeStep] || recipe.steps[activeStep].description}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {getAlternativeMethods(recipe.steps[activeStep].description).map(({ label, newDescription }) => (
                  <button key={label}
                    onClick={() => setStepModifications(prev => { const next = { ...prev }; if (newDescription === recipe.steps[activeStep].description) { delete next[activeStep]; } else { next[activeStep] = newDescription; } return next; })}
                    style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
                    className={`px-4 py-2 text-sm font-['Karla'] font-medium transition-all ${
                      (stepModifications[activeStep] || recipe.steps[activeStep].description) === newDescription
                        ? 'bg-[#8fa68f] text-white'
                        : 'bg-[#f0ebe3] text-[#6b6560]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowStepPanel(false)}
                className="w-full bg-[#8fa68f] text-white py-3 font-['Karla'] font-semibold btn-primary">
                Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecipeDetailScreen({ recipeId, onBack }: { recipeId: number, onBack: () => void }) {
  const { data: recipe, isLoading } = useGetRecipe(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetRecipeQueryKey(recipeId) }
  });
  const { data: favStatus } = useGetFavoriteStatus(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetFavoriteStatusQueryKey(recipeId) }
  });
  
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const createShoppingItem = useCreateShoppingItem();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [stepModifications, setStepModifications] = useState<Record<number, string>>({});
  const [showStepPanel, setShowStepPanel] = useState(false);

  if (isLoading || !recipe) return <div className="p-6 text-center mt-20"><Loader2 className="animate-spin inline text-[#8fa68f]" /></div>;

  const isFav = favStatus?.isFavorited;

  const toggleFavorite = () => {
    if (isFav) {
      removeFavorite.mutate({ recipeId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoriteStatusQueryKey(recipeId) })
      });
    } else {
      addFavorite.mutate({ recipeId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFavoriteStatusQueryKey(recipeId) })
      });
    }
  };

  const handleAddMissing = (itemName: string) => {
    createShoppingItem.mutate({
      data: { name: itemName, quantity: "1", category: "Pantry", recipeId: recipe.id }
    }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
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
          <div className="space-y-6">
            {recipe.steps.map((step, idx) => {
              const isModified = !!stepModifications[idx];
              const currentDesc = stepModifications[idx] || step.description;
              return (
                <div 
                  key={idx}
                  onClick={() => { setActiveStep(idx); setShowStepPanel(true); }}
                  className="p-5 bg-[#f5f0e6] transition-all cursor-pointer hover:-translate-y-1"
                  style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
                >
                  <div className="flex gap-4">
                    <div className="w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0 bg-[#8fa68f] text-white font-['Karla']" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                      {step.number}
                    </div>
                    <div>
                      <h3 className="font-['Fraunces'] font-bold mb-2 text-[#2d2a26] text-lg">
                        {step.title} {isModified && <span className="text-[10px] bg-[#d4c4a8] px-2 py-0.5 rounded-full ml-2 text-[#2d2a26] font-['Karla'] uppercase align-middle">Modified</span>}
                      </h3>
                      <p className="text-base text-[#6b6560] font-['Karla'] leading-relaxed">
                        {currentDesc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed md:absolute bottom-6 left-6 right-6 max-w-[382px] mx-auto z-20">
        <button 
          onClick={toggleFavorite}
          className="w-full bg-[#8fa68f] text-white py-4 font-['Karla'] font-semibold text-lg shadow-lg flex items-center justify-center gap-2 btn-primary"
        >
          {isFav ? "Saved to Favourites ✓" : "Save to Favourites"}
        </button>
      </div>

      <AnimatePresence>
        {showStepPanel && activeStep !== null && recipe?.steps[activeStep] && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#2d2a26] z-40"
              onClick={() => setShowStepPanel(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#f5f0e6] shadow-2xl max-w-2xl mx-auto"
              style={{ borderRadius: '40px 40px 0 0', padding: '24px 24px 40px' }}>
              <div className="w-12 h-1 bg-[#d4c4a8] rounded-full mx-auto mb-6" />
              <h3 className="font-['Fraunces'] italic text-[#2d2a26] text-xl mb-2">Adapt this step</h3>
              <p className="text-[#6b6560] font-['Karla'] text-sm mb-6 leading-relaxed">
                {stepModifications[activeStep] || recipe.steps[activeStep].description}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {getAlternativeMethods(recipe.steps[activeStep].description).map(({ label, newDescription }) => (
                  <button key={label}
                    onClick={() => setStepModifications(prev => { const next = { ...prev }; if (newDescription === recipe.steps[activeStep].description) { delete next[activeStep]; } else { next[activeStep] = newDescription; } return next; })}
                    style={{ borderRadius: '50% 30% 50% 30% / 30% 50% 30% 50%' }}
                    className={`px-4 py-2 text-sm font-['Karla'] font-medium transition-all ${
                      (stepModifications[activeStep] || recipe.steps[activeStep].description) === newDescription
                        ? 'bg-[#8fa68f] text-white'
                        : 'bg-[#f0ebe3] text-[#6b6560]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowStepPanel(false)}
                className="w-full bg-[#8fa68f] text-white py-3 font-['Karla'] font-semibold btn-primary">
                Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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
          
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 px-2 -mx-2 snap-x snap-mandatory hide-scrollbar">
            {recommendations.ingredients.map((rec, i) => (
              <div key={i} className="reveal-card min-w-[200px] shrink-0 bg-[#f5f0e6] p-5 shadow-sm snap-center flex flex-col" style={{ borderRadius: '20px 40px 20px 40px' }}>
                <div className="w-12 h-12 bg-[#faf8f5] flex items-center justify-center text-2xl mb-4" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                  {rec.emoji}
                </div>
                <h3 className="font-['Fraunces'] font-bold text-[#2d2a26] text-lg mb-1">{rec.name}</h3>
                <p className="text-[#6b6560] text-xs font-['Karla'] mb-4 flex-1">{rec.reason}</p>
                <button 
                  onClick={() => createShoppingItem.mutate({ data: { name: rec.name, emoji: rec.emoji, quantity: "1", category: rec.category } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() }) })}
                  className="mt-auto self-start text-[11px] uppercase tracking-widest font-['Karla'] bg-[#8fa68f] text-white px-4 py-2"
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
                  category === c 
                    ? "bg-[#8fa68f] text-white" 
                    : "bg-[#f5f0e6] text-[#6b6560]"
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

  const categories = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];

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
              onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id })}
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
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover absolute inset-0 mix-blend-multiply" />
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
      <header className="mb-8 pt-4 flex justify-between items-start">
        <h1 className="text-[40px] font-['Fraunces'] italic text-[#2d2a26]">Favourites</h1>
        <UserAuthButton navigate={(p) => window.location.href = p} />
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
              onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id })}
              className="reveal-card group cursor-pointer"
            >
              <div className="aspect-[4/5] bg-[#f5f0e6] mb-4 relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-xl flex flex-col items-center justify-center p-4"
                   style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}>
                <div className="absolute top-3 right-3 bg-[#faf8f5] p-2 z-10" style={{ borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%' }}>
                  <Heart size={16} className="fill-[#c67d5a] text-[#c67d5a]" />
                </div>
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover absolute inset-0 mix-blend-multiply" />
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

function MainLayout() {
  const [screen, setScreen] = useState<ScreenState>({ name: 'tabs', tab: 'cook' });

  const navigate = (newState: ScreenState) => setScreen(newState);

  const activeTab = screen.name === 'tabs' ? screen.tab : 
                    screen.name === 'favorites' ? 'favorites' : null;

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
            <li>
              <button onClick={() => navigate({ name: 'tabs', tab: 'cook' })} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-['Karla'] font-medium text-lg ${activeTab === 'cook' ? 'bg-[#8fa68f] text-white shadow-md' : 'text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                <ChefHat size={24} /> Cook
              </button>
            </li>
            <li>
              <button onClick={() => navigate({ name: 'tabs', tab: 'shop' })} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-['Karla'] font-medium text-lg ${activeTab === 'shop' ? 'bg-[#8fa68f] text-white shadow-md' : 'text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                <ShoppingCart size={24} /> Shop
              </button>
            </li>
            <li>
              <button onClick={() => navigate({ name: 'tabs', tab: 'explore' })} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-['Karla'] font-medium text-lg ${activeTab === 'explore' ? 'bg-[#8fa68f] text-white shadow-md' : 'text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                <Compass size={24} /> Explore
              </button>
            </li>
            <li>
              <button onClick={() => navigate({ name: 'favorites' })} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-['Karla'] font-medium text-lg ${activeTab === 'favorites' ? 'bg-[#8fa68f] text-white shadow-md' : 'text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                <Heart size={24} /> Favourites
              </button>
            </li>
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
              onBack={() => navigate({ name: 'tabs', tab: 'explore' })} 
            />
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
          <button onClick={() => navigate({ name: 'tabs', tab: 'cook' })} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'cook' ? 'text-[#8fa68f]' : 'text-[#6b6560]'}`}>
            <div className={`p-2 transition-all ${activeTab === 'cook' ? 'bg-[#b8ccb8]/30' : ''}`} style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' }}>
              <ChefHat size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Cook</span>
          </button>
          <button onClick={() => navigate({ name: 'tabs', tab: 'shop' })} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'shop' ? 'text-[#8fa68f]' : 'text-[#6b6560]'}`}>
            <div className={`p-2 transition-all ${activeTab === 'shop' ? 'bg-[#b8ccb8]/30' : ''}`} style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' }}>
              <ShoppingCart size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Shop</span>
          </button>
          <button onClick={() => navigate({ name: 'tabs', tab: 'explore' })} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'explore' ? 'text-[#8fa68f]' : 'text-[#6b6560]'}`}>
            <div className={`p-2 transition-all ${activeTab === 'explore' ? 'bg-[#b8ccb8]/30' : ''}`} style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' }}>
              <Compass size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Explore</span>
          </button>
          <button onClick={() => navigate({ name: 'favorites' })} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'favorites' ? 'text-[#8fa68f]' : 'text-[#6b6560]'}`}>
            <div className={`p-2 transition-all ${activeTab === 'favorites' ? 'bg-[#b8ccb8]/30' : ''}`} style={{ borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' }}>
              <Heart size={24} />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">Saved</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

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

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;