import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category, MenuItem } from '../types';
import ProductCard from '../components/ProductCard';
import CustomizationModal from '../components/CustomizationModal';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/Toast';
import { playAddToCartSound } from '../lib/sounds';

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [vegOnly, setVegOnly] = useState(false);
  const [egglessOnly, setEgglessOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price_low' | 'price_high'>('popular');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('menu_items').select('*').eq('is_available', true).order('display_order'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (itemRes.data) setItems(itemRes.data);
    setLoading(false);
  }

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (activeCategory !== 'all') {
      const cat = categories.find((c) => c.slug === activeCategory);
      if (cat) result = result.filter((i) => i.category_id === cat.id);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    if (vegOnly) result = result.filter((i) => i.is_veg);
    if (egglessOnly) result = result.filter((i) => i.is_eggless);
    switch (sortBy) {
      case 'price_low': result.sort((a, b) => a.price - b.price); break;
      case 'price_high': result.sort((a, b) => b.price - a.price); break;
      default: result.sort((a, b) => b.rating - a.rating);
    }
    return result;
  }, [items, categories, activeCategory, search, vegOnly, egglessOnly, sortBy]);

  function handleCategoryChange(slug: string) {
    setActiveCategory(slug);
    if (slug === 'all') { searchParams.delete('category'); } else { searchParams.set('category', slug); }
    setSearchParams(searchParams);
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Sticky Header */}
      <div className="bg-brand-bg/98 backdrop-blur-2xl border-b border-brand-border 
                      sticky top-[64px] lg:top-[72px] z-30">
        <div className="px-4 py-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 group">
              <Search 
                size={18} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold 
                           transition-transform group-focus-within:scale-110" 
                strokeWidth={2.5} 
              />
              <input
                type="text"
                placeholder="Search waffles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-12 text-[15px] font-medium
                           focus:shadow-glow-gold-soft"
                autoFocus
              />
              {search && (
                <button 
                  onClick={() => setSearch('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 
                             p-1 rounded-lg
                             text-brand-text-dim hover:text-white hover:bg-brand-surface-light
                             transition-all"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
          
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`whitespace-nowrap px-5 py-2.5 rounded-xl 
                          text-[13px] font-bold transition-all duration-300 ${
                activeCategory === 'all'
                  ? 'bg-brand-gold text-brand-bg shadow-glow-gold-soft'
                  : 'bg-brand-surface text-brand-text-muted border border-brand-border hover:border-brand-gold/30'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-xl 
                            text-[13px] font-bold transition-all duration-300 ${
                  activeCategory === cat.slug
                    ? 'bg-brand-gold text-brand-bg shadow-glow-gold-soft'
                    : 'bg-brand-surface text-brand-text-muted border border-brand-border hover:border-brand-gold/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5">
        {/* Filters Row */}
        <div className="flex items-center justify-between mb-5 animate-fade-in">
          <div className="flex items-center gap-2">
            {/* Veg Filter */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl 
                          text-[13px] font-bold transition-all duration-300 ${
                vegOnly 
                  ? 'bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/40' 
                  : 'bg-brand-surface text-brand-text-dim border border-brand-border hover:border-brand-gold/30'
              }`}
            >
              <div className="w-4 h-4 border-2 border-emerald-400 rounded-sm 
                              flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              </div>
              Veg
            </button>
            
            {/* Eggless Filter */}
            <button
              onClick={() => setEgglessOnly(!egglessOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl 
                          text-[13px] font-bold transition-all duration-300 ${
                egglessOnly 
                  ? 'bg-brand-gold/15 text-brand-gold border-2 border-brand-gold/40' 
                  : 'bg-brand-surface text-brand-text-dim border border-brand-border hover:border-brand-gold/30'
              }`}
            >
              Eggless
            </button>
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2 bg-brand-surface rounded-xl 
                          px-3 py-2 border border-brand-border">
            <SlidersHorizontal size={14} className="text-brand-text-dim" strokeWidth={2.5} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-[13px] bg-transparent font-bold text-brand-text-muted 
                         focus:outline-none cursor-pointer"
            >
              <option value="popular">Popular</option>
              <option value="price_low">Price: Low</option>
              <option value="price_high">Price: High</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="flex items-center gap-2 mb-4 animate-fade-in">
            <span className="text-[13px] font-medium text-brand-text-dim">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
            </span>
            {(vegOnly || egglessOnly || activeCategory !== 'all') && (
              <button
                onClick={() => {
                  setVegOnly(false);
                  setEgglessOnly(false);
                  handleCategoryChange('all');
                }}
                className="text-[12px] font-bold text-brand-gold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div 
                key={i} 
                className="animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <CardSkeleton />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-brand-surface rounded-2xl 
                            flex items-center justify-center mx-auto mb-4
                            border border-brand-border">
              <Search size={32} className="text-brand-text-dim" strokeWidth={2} />
            </div>
            <h3 className="text-[18px] font-bold text-white mb-2">
              No waffles found
            </h3>
            <p className="text-brand-text-dim text-[14px] font-medium max-w-[250px] mx-auto">
              Try adjusting your filters or search for something else
            </p>
            <button
              onClick={() => {
                setSearch('');
                setVegOnly(false);
                setEgglessOnly(false);
                handleCategoryChange('all');
              }}
              className="btn-outline mt-6 text-[14px]"
            >
              View All Items
            </button>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((item, index) => (
              <div 
                key={item.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <ProductCard item={item} onAdd={setSelectedItem} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customization Modal */}
      {selectedItem && (
        <CustomizationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={(item, qty, customizations) => {
            addItem(item, qty, customizations);
            setSelectedItem(null);
            playAddToCartSound();
            showToast(`${item.name} added to cart!`);
          }}
        />
      )}
    </div>
  );
}
