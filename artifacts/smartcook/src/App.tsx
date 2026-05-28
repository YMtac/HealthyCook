import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChefHat, ShoppingCart, Compass, Search, Plus, ArrowLeft, Heart, HeartOff, Check, X, Clock, Flame, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  useListIngredients, useCreateIngredient, useDeleteIngredient, getListIngredientsQueryKey,
  useGenerateRecipe, 
  useListRecipes, useGetTrendingRecipes, useGetRecipe, getGetRecipeQueryKey, getListRecipesQueryKey,
  useListShoppingItems, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, getListShoppingItemsQueryKey,
  useListFavorites, useAddFavorite, useRemoveFavorite, useGetFavoriteStatus, getListFavoritesQueryKey, getGetFavoriteStatusQueryKey
} from "@workspace/api-client-react";

// Types
type ScreenState = 
  | { name: 'tabs'; tab: 'cook' | 'shop' | 'explore' }
  | { name: 'preferences' }
  | { name: 'recipe-output'; recipeId: number }
  | { name: 'recipe-detail'; recipeId: number }
  | { name: 'add-item' }
  | { name: 'favorites' };

// --- Components ---

function ScreenWrapper({ children, isActive }: { children: React.ReactNode, isActive: boolean }) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-background overflow-y-auto z-10 pb-safe"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 1. Cook Tab
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
    <div className="flex flex-col h-full p-6 pb-24 relative">
      <header className="mb-8 pt-4">
        <h1 className="text-4xl font-serif italic text-primary mb-2">SmartCook</h1>
        <p className="text-muted-foreground font-sans">What's in your fridge?</p>
      </header>
      
      <div className="flex-1">
        <form onSubmit={handleAdd} className="mb-6">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type an ingredient..." 
            className="w-full bg-transparent border-b-2 border-primary/20 pb-2 focus:outline-none focus:border-primary text-lg transition-colors text-foreground placeholder:text-muted-foreground"
          />
        </form>

        <div className="mb-8">
          {isLoading ? (
            <div className="flex gap-2"><div className="h-8 w-24 bg-muted animate-pulse rounded-full" /></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {ingredients.map(ing => (
                  <motion.span 
                    key={ing.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-sm shadow-primary/5"
                  >
                    {ing.emoji} {ing.name} 
                    <button 
                      onClick={() => deleteIngredient.mutate({ id: ing.id }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() })
                      })}
                      className="ml-1 opacity-50 hover:opacity-100"
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
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Add</h3>
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
                className="bg-background border border-border text-foreground px-3 py-1.5 rounded-full text-sm hover:border-primary/50 transition-colors"
              >
                {item.emoji} {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-24 left-6 right-6 max-w-[382px] mx-auto z-20">
        <button 
          onClick={() => navigate({ name: 'preferences' })}
          disabled={ingredients.length === 0}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-medium text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
        >
          Generate Recipe <span>→</span>
        </button>
      </div>
    </div>
  );
}

// 2. Preferences
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
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active 
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
          : "bg-secondary/50 text-foreground border border-border"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full p-6 relative bg-background">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-3xl font-serif text-primary">Preferences</h1>
      </header>

      <div className="flex-1 space-y-8">
        <div>
          <h2 className="text-lg font-serif mb-3 text-foreground">Time</h2>
          <div className="flex flex-wrap gap-2">
            {["< 15 min", "30 min", "60 min+"].map(t => (
              <Pill key={t} label={t} active={time === t} onClick={() => setTime(t)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-serif mb-3 text-foreground">Difficulty</h2>
          <div className="flex flex-wrap gap-2">
            {["Easy", "Medium", "Hard"].map(d => (
              <Pill key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-serif mb-3 text-foreground">Diet</h2>
          <div className="flex flex-wrap gap-2">
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
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-medium text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {generateRecipe.isPending ? <Loader2 className="animate-spin" /> : "Cook It! →"}
        </button>
      </div>
    </div>
  );
}

// 3. Recipe Output (Generated)
function RecipeOutputScreen({ recipeId, navigate, onBack }: { recipeId: number, navigate: (screen: ScreenState) => void, onBack: () => void }) {
  const { data: recipe, isLoading } = useGetRecipe(recipeId, {
    query: { enabled: !!recipeId, queryKey: getGetRecipeQueryKey(recipeId) }
  });
  const [activeStep, setActiveStep] = useState<number | null>(null);

  if (isLoading || !recipe) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="font-serif text-xl text-primary animate-pulse">Crafting your recipe...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 relative bg-background overflow-y-auto">
      <header className="flex justify-between items-start mb-6 pt-4">
        <div>
          <h1 className="text-3xl font-serif text-primary leading-tight mb-2">
            {recipe.emoji} {recipe.name}
          </h1>
          <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium">
            <span className="flex items-center gap-1"><Clock size={14} /> {recipe.timeMinutes} min</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Flame size={14} /> {recipe.difficulty}</span>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <h2 className="text-xl font-serif mb-4 text-foreground">Steps</h2>
        <div className="space-y-4 mb-24">
          {recipe.steps.map((step, idx) => (
            <div 
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeStep === idx 
                  ? "bg-secondary border-primary/20 shadow-sm" 
                  : "bg-card border-border"
              }`}
            >
              <div className="flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  activeStep === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step.number}
                </div>
                <div>
                  <h3 className={`font-medium mb-1 ${activeStep === idx ? "text-primary" : "text-foreground"}`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm ${activeStep === idx ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-6 left-6 right-6 max-w-[382px] mx-auto z-20 flex flex-col gap-3 bg-background/80 backdrop-blur pt-4">
        <button 
          onClick={onBack}
          className="w-full border-2 border-primary text-primary py-3 rounded-xl font-medium text-base hover:bg-secondary/50 transition-colors"
        >
          Regenerate
        </button>
        <button 
          onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id })}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-medium text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          View Full Recipe →
        </button>
      </div>
    </div>
  );
}

// 4. Recipe Detail
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

  if (isLoading || !recipe) return <div className="p-6">Loading...</div>;

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
    <div className="flex flex-col h-full bg-background relative overflow-y-auto">
      <div className="sticky top-0 bg-background/90 backdrop-blur z-20 px-6 py-4 flex justify-between items-center border-b border-border">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <button onClick={toggleFavorite} className="p-2 -mr-2 rounded-full hover:bg-secondary text-primary">
          {isFav ? <Heart className="fill-primary" size={24} /> : <Heart size={24} />}
        </button>
      </div>

      <div className="p-6 pb-32">
        <h1 className="text-4xl font-serif text-primary leading-tight mb-3">
          {recipe.emoji} {recipe.name}
        </h1>
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-6">
          <span>{recipe.timeMinutes} min</span>
          <span>·</span>
          <span>{recipe.difficulty}</span>
          <span>·</span>
          <span>{recipe.category}</span>
        </div>

        <div className="bg-secondary rounded-2xl p-4 flex justify-between mb-8 border border-primary/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{recipe.nutrition.kcal}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Kcal</div>
          </div>
          <div className="w-px bg-primary/10"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{recipe.nutrition.protein}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Protein</div>
          </div>
          <div className="w-px bg-primary/10"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{recipe.nutrition.carbs}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Carbs</div>
          </div>
          <div className="w-px bg-primary/10"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{recipe.nutrition.fat}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Fat</div>
          </div>
        </div>

        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <h3 className="font-serif text-destructive font-medium mb-2">Missing Ingredients</h3>
            <ul className="space-y-2">
              {recipe.missingIngredients.map((item, i) => (
                <li key={i} className="flex justify-between items-center text-sm text-foreground">
                  <span>{item}</span>
                  <button 
                    onClick={() => handleAddMissing(item)}
                    className="text-xs bg-background border border-border px-2 py-1 rounded-md hover:bg-secondary"
                  >
                    Add to Shop
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-serif mb-4 text-foreground">Ingredients</h2>
          <ul className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-foreground">{ing.emoji} {ing.name}</span>
                <span className="text-muted-foreground font-medium">{ing.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif mb-4 text-foreground">Method</h2>
          <div className="space-y-6">
            {recipe.steps.map((step, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`flex gap-4 cursor-pointer group`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 mt-0.5 transition-colors ${
                  activeStep === idx || (activeStep !== null && activeStep > idx)
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-primary"
                }`}>
                  {step.number}
                </div>
                <div>
                  <h3 className={`font-bold mb-1 transition-colors ${
                    activeStep === idx ? "text-primary" : "text-foreground"
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-base leading-relaxed ${
                    activeStep === idx ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 right-6 max-w-[382px] mx-auto z-20">
        <button 
          onClick={toggleFavorite}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-medium text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          {isFav ? "Saved to Favourites ✓" : "Save to Favourites"}
        </button>
      </div>
    </div>
  );
}

// 5. Shop Tab
function ShopTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const { data: items = [], isLoading } = useListShoppingItems();
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const queryClient = useQueryClient();

  const handleToggle = (id: number, checked: boolean) => {
    updateItem.mutate({ id, data: { checked: !checked } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
  };

  const toBuy = items.filter(i => !i.checked);
  const bought = items.filter(i => i.checked);

  return (
    <div className="flex flex-col h-full p-6 pb-24 bg-background overflow-y-auto relative">
      <header className="mb-8 pt-4">
        <h1 className="text-4xl font-serif italic text-primary mb-2">Shopping List</h1>
      </header>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-secondary rounded-xl"></div>
          <div className="h-12 bg-secondary rounded-xl"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground mt-12">
          <ShoppingCart size={48} className="mb-4 opacity-20" />
          <p>Your list is empty.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {toBuy.length > 0 && (
            <div>
              <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-3">Need to buy</h2>
              <div className="space-y-2">
                {toBuy.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleToggle(item.id, item.checked)}
                        className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center"
                      />
                      <span className="font-medium text-foreground">{item.emoji} {item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{item.quantity}</span>
                      <button onClick={() => deleteItem.mutate({id: item.id}, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })})} className="text-muted-foreground hover:text-destructive">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bought.length > 0 && (
            <div>
              <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-3">Already have</h2>
              <div className="space-y-2 opacity-60">
                {bought.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleToggle(item.id, item.checked)}
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check size={14} className="text-primary-foreground" />
                      </button>
                      <span className="font-medium text-foreground line-through">{item.emoji} {item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground line-through">{item.quantity}</span>
                      <button onClick={() => deleteItem.mutate({id: item.id}, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })})} className="text-muted-foreground hover:text-destructive">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-24 right-6 z-20">
        <button 
          onClick={() => navigate({ name: 'add-item' })}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}

// 6. Add Item Screen
function AddItemScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("Produce");
  
  const createItem = useCreateShoppingItem();
  const queryClient = useQueryClient();

  const handleAdd = () => {
    if (!name.trim()) return;
    createItem.mutate({
      data: { name, quantity, category, emoji: "🛒" }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() });
        onBack();
      }
    });
  };

  const handleQuickAdd = (itemName: string, itemCategory: string) => {
    createItem.mutate({
      data: { name: itemName, quantity: "1", category: itemCategory, emoji: "🛒" }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() });
        onBack();
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-3xl font-serif text-primary">Add Item</h1>
      </header>

      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Item Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card border border-border rounded-xl p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
            placeholder="e.g. Olive Oil"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Quantity</label>
          <input 
            type="text" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-card border border-border rounded-xl p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
            placeholder="e.g. 1 bottle"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {["Produce", "Pantry", "Dairy", "Meat", "Frozen"].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  category === cat 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card text-foreground border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <label className="block text-sm font-medium text-muted-foreground mb-3">Quick Add Pantry Staples</label>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Salt", cat: "Pantry", emoji: "🧂" },
              { name: "Onion", cat: "Produce", emoji: "🧅" },
              { name: "Oil", cat: "Pantry", emoji: "🫒" },
              { name: "Garlic", cat: "Produce", emoji: "🧄" }
            ].map(item => (
              <button 
                key={item.name}
                onClick={() => handleQuickAdd(item.name, item.cat)}
                className="bg-secondary text-foreground px-3 py-1.5 rounded-full text-sm flex items-center gap-1 border border-border hover:border-primary/30"
              >
                {item.emoji} {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 mb-6">
        <button 
          onClick={handleAdd}
          disabled={!name.trim() || createItem.isPending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-medium text-lg shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {createItem.isPending ? "Adding..." : "✓ Add to List"}
        </button>
      </div>
    </div>
  );
}

// 7. Explore Tab
function ExploreTab({ navigate }: { navigate: (screen: ScreenState) => void }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  
  const { data: recipes = [], isLoading: isLoadingRecipes } = useListRecipes({ 
    search: search || undefined, 
    category: activeCategory !== "All" && activeCategory !== "Trending" ? activeCategory : undefined 
  });
  
  const { data: trendingRecipes = [], isLoading: isLoadingTrending } = useGetTrendingRecipes({
    query: { enabled: activeCategory === "Trending" }
  });

  const displayRecipes = activeCategory === "Trending" ? trendingRecipes : recipes;
  const isLoading = activeCategory === "Trending" ? isLoadingTrending : isLoadingRecipes;

  return (
    <div className="flex flex-col h-full bg-background p-6 pb-24 overflow-y-auto">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-4xl font-serif italic text-primary">Explore</h1>
        <button 
          onClick={() => navigate({ name: 'favorites' })}
          className="p-2 rounded-full bg-secondary text-primary border border-primary/10"
        >
          <Heart size={20} />
        </button>
      </header>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes..." 
          className="w-full bg-card border border-border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 -mx-6 px-6 no-scrollbar">
        {["All", "Asian", "Quick", "Vegan", "Trending"].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border shrink-0 transition-colors ${
              activeCategory === cat 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-secondary text-foreground border-transparent hover:border-primary/20"
            }`}
          >
            {cat === "Trending" ? "🔥 Trending" : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-secondary animate-pulse rounded-2xl"></div>
          ))
        ) : recipes.length === 0 ? (
          <div className="col-span-2 text-center text-muted-foreground py-12">
            No recipes found.
          </div>
        ) : (
          recipes.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id })}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col"
            >
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-2xl mb-3 border border-primary/5">
                {recipe.emoji}
              </div>
              <h3 className="font-bold text-foreground leading-tight mb-2 flex-1">{recipe.name}</h3>
              <div className="text-xs text-muted-foreground font-medium flex flex-col gap-1">
                <span>{recipe.timeMinutes}m · {recipe.difficulty}</span>
                <span className="text-primary">{recipe.kcal} kcal</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 8. Favorites Screen
function FavoritesScreen({ onBack, navigate }: { onBack: () => void, navigate: (screen: ScreenState) => void }) {
  const { data: favorites = [], isLoading } = useListFavorites();

  return (
    <div className="flex flex-col h-full bg-background p-6 overflow-y-auto">
      <header className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-3xl font-serif text-primary">Saved Recipes</h1>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-secondary animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground mt-12">
          <HeartOff size={48} className="mb-4 opacity-20" />
          <p>No saved recipes yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 pb-12">
          {favorites.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => navigate({ name: 'recipe-detail', recipeId: recipe.id })}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm cursor-pointer flex flex-col relative"
            >
              <div className="absolute top-3 right-3 text-primary">
                <Heart size={16} className="fill-primary" />
              </div>
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-2xl mb-3">
                {recipe.emoji}
              </div>
              <h3 className="font-bold text-foreground leading-tight mb-2 flex-1">{recipe.name}</h3>
              <div className="text-xs text-muted-foreground font-medium flex flex-col gap-1">
                <span>{recipe.timeMinutes}m · {recipe.difficulty}</span>
                <span className="text-primary">{recipe.kcal} kcal</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main App Shell
function MainLayout() {
  const [screenStack, setScreenStack] = useState<ScreenState[]>([{ name: 'tabs', tab: 'cook' }]);
  
  const currentScreen = screenStack[screenStack.length - 1];
  const isTabs = currentScreen.name === 'tabs';
  const activeTab = isTabs ? currentScreen.tab : 'cook';

  const navigate = (screen: ScreenState) => {
    setScreenStack(prev => [...prev, screen]);
  };

  const switchTab = (tab: 'cook' | 'shop' | 'explore') => {
    setScreenStack([{ name: 'tabs', tab }]);
  };

  const goBack = () => {
    if (screenStack.length > 1) {
      setScreenStack(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="max-w-[430px] mx-auto w-full h-[100dvh] bg-background relative overflow-hidden flex flex-col shadow-2xl sm:border-x sm:border-border">
      
      {/* Base Tabs Layer */}
      <div className="absolute inset-0 pb-[80px] bg-background">
        <AnimatePresence mode="wait">
          {isTabs && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'cook' && <CookTab navigate={navigate} />}
              {activeTab === 'shop' && <ShopTab navigate={navigate} />}
              {activeTab === 'explore' && <ExploreTab navigate={navigate} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Overlays */}
      <ScreenWrapper isActive={currentScreen.name === 'preferences'}>
        <PreferencesScreen onBack={goBack} navigate={navigate} />
      </ScreenWrapper>

      <ScreenWrapper isActive={currentScreen.name === 'recipe-output'}>
        {currentScreen.name === 'recipe-output' && (
          <RecipeOutputScreen 
            recipeId={currentScreen.recipeId} 
            navigate={navigate} 
            onBack={goBack} 
          />
        )}
      </ScreenWrapper>

      <ScreenWrapper isActive={currentScreen.name === 'recipe-detail'}>
        {currentScreen.name === 'recipe-detail' && (
          <RecipeDetailScreen recipeId={currentScreen.recipeId} onBack={goBack} />
        )}
      </ScreenWrapper>

      <ScreenWrapper isActive={currentScreen.name === 'add-item'}>
        <AddItemScreen onBack={goBack} />
      </ScreenWrapper>

      <ScreenWrapper isActive={currentScreen.name === 'favorites'}>
        <FavoritesScreen onBack={goBack} navigate={navigate} />
      </ScreenWrapper>

      {/* Bottom Navigation */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border p-3 pb-safe flex justify-around items-center transition-transform duration-300 z-0 ${
          isTabs ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button 
          onClick={() => switchTab('cook')}
          className={`flex flex-col items-center gap-1.5 w-16 ${activeTab === 'cook' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <div className={`p-1.5 rounded-full transition-colors ${activeTab === 'cook' ? 'bg-secondary' : ''}`}>
            <ChefHat size={24} strokeWidth={activeTab === 'cook' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Cook</span>
        </button>
        <button 
          onClick={() => switchTab('shop')}
          className={`flex flex-col items-center gap-1.5 w-16 ${activeTab === 'shop' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <div className={`p-1.5 rounded-full transition-colors ${activeTab === 'shop' ? 'bg-secondary' : ''}`}>
            <ShoppingCart size={24} strokeWidth={activeTab === 'shop' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Shop</span>
        </button>
        <button 
          onClick={() => switchTab('explore')}
          className={`flex flex-col items-center gap-1.5 w-16 ${activeTab === 'explore' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <div className={`p-1.5 rounded-full transition-colors ${activeTab === 'explore' ? 'bg-secondary' : ''}`}>
            <Compass size={24} strokeWidth={activeTab === 'explore' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
        </button>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainLayout />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
