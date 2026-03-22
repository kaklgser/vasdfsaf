import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Truck, Clock, Sparkles, Flame, Star, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOfferBadgeLabel, getOfferRewardLabel, getOfferRuleSummary } from '../lib/offers';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/Toast';
import ProductCard from '../components/ProductCard';
import CustomizationModal from '../components/CustomizationModal';
import type { Category, MenuItem, Offer } from '../types';

const fallbackOffers: Offer[] = [
  {
    id: 'fallback-weekend20',
    title: 'Weekend Special',
    description: 'Get flat discount on orders above Rs.499',
    code: 'WEEKEND20',
    offer_mode: 'coupon',
    trigger_type: 'min_order',
    discount_type: 'percentage',
    discount_value: 20,
    min_order: 499,
    required_item_quantity: null,
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2027-01-01T00:00:00.000Z',
    is_active: true,
  },
  {
    id: 'fallback-combo149',
    title: 'Waffle Combo Deal',
    description: 'Save more when you order two signature waffles together',
    code: 'COMBO149',
    offer_mode: 'coupon',
    trigger_type: 'min_order',
    discount_type: 'flat',
    discount_value: 149,
    min_order: 699,
    required_item_quantity: null,
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2027-01-01T00:00:00.000Z',
    is_active: true,
  },
  {
    id: 'fallback-shake99',
    title: 'Buy 3, Add-Ons Free',
    description: 'Order any 3 menu items and unlock free add-ons automatically',
    code: null,
    offer_mode: 'automatic',
    trigger_type: 'item_quantity',
    discount_type: 'free_addons',
    discount_value: 0,
    min_order: 0,
    required_item_quantity: 3,
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2027-01-01T00:00:00.000Z',
    is_active: true,
  },
  {
    id: 'fallback-night15',
    title: 'Midnight Craving',
    description: 'Late-night sweet craving? Grab a fresh discount before checkout',
    code: 'NIGHT15',
    offer_mode: 'coupon',
    trigger_type: 'min_order',
    discount_type: 'percentage',
    discount_value: 15,
    min_order: 299,
    required_item_quantity: null,
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2027-01-01T00:00:00.000Z',
    is_active: true,
  },
];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestSellers, setBestSellers] = useState<MenuItem[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setInterval>>();
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => { 
    loadData(); 
  }, []);

  async function loadData() {
    const [catRes, bestRes, allRes, offerRes] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('menu_items').select('*').eq('is_available', true).order('rating', { ascending: false }).limit(10),
      supabase.from('menu_items').select('*').eq('is_available', true).order('display_order'),
      supabase.from('offers').select('*').eq('is_active', true).limit(5),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (bestRes.data) setBestSellers(bestRes.data);
    if (allRes.data) setAllItems(allRes.data);
    if (offerRes.data && offerRes.data.length > 0) {
      setOffers(offerRes.data);
    } else {
      setOffers(fallbackOffers);
    }
    setIsLoaded(true);
  }

  useEffect(() => {
    if (offers.length <= 1) return;
    bannerTimer.current = setInterval(() => {
      setBannerIdx((i) => (i + 1) % offers.length);
    }, 5000);
    return () => clearInterval(bannerTimer.current);
  }, [offers.length]);

  const handleAdd = useCallback((item: MenuItem) => {
    setSelectedItem(item);
  }, []);

  const handleConfirmAdd = useCallback((item: MenuItem, qty: number, custs: { group_name: string; option_name: string; price: number }[]) => {
    addItem(item, qty, custs);
    showToast(`${item.name} added to cart`);
    setSelectedItem(null);
  }, [addItem, showToast]);

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: allItems.filter((it) => it.category_id === cat.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className={`bg-brand-bg min-h-screen pb-24 transition-opacity duration-500 ${
      isLoaded ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Premium Hero Banner */}
      {offers.length > 0 && (
        <section className="px-4 pt-4 pb-2 animate-fade-in-up">
          <div className="relative overflow-hidden rounded-3xl aspect-[2.2/1] 
                          shadow-card border border-brand-border/50">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-surface via-brand-surface-light to-brand-gold/10" />
            
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full 
                            bg-gradient-to-l from-brand-gold/8 to-transparent" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 
                            bg-gradient-to-tr from-brand-gold/5 to-transparent" />
            
            {/* Slider Content */}
            <div
              className="flex transition-transform duration-700 ease-out h-full"
              style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
            >
              {offers.map((offer, index) => (
                <div 
                  key={offer.id} 
                  className="w-full flex-shrink-0 h-full relative"
                >
                  <div className="absolute inset-0 flex items-center px-6 sm:px-8">
                    <div className="flex-1">
                      {/* Badge */}
                      <span className={`inline-flex items-center gap-1.5 
                                       bg-brand-gold/15 text-brand-gold 
                                       text-[11px] font-bold px-3 py-1.5 rounded-lg 
                                       mb-2 tracking-wide uppercase
                                       ${index === bannerIdx ? 'animate-fade-in' : ''}`}
                            style={{ animationDelay: '0.1s' }}>
                        <Sparkles size={12} />
                        {getOfferBadgeLabel(offer)}
                      </span>
                      
                      {/* Title */}
                      <h3 className={`text-white font-extrabold text-[20px] sm:text-[24px] 
                                     leading-tight mb-1 tracking-tight
                                     ${index === bannerIdx ? 'animate-fade-in-up' : ''}`}
                          style={{ animationDelay: '0.2s' }}>
                        {offer.title}
                      </h3>
                      
                      {/* Description */}
                      <p className={`text-brand-text-muted text-[13px] sm:text-[14px] 
                                    font-medium mb-3 max-w-[220px] sm:max-w-[280px] 
                                    leading-relaxed
                                    ${index === bannerIdx ? 'animate-fade-in-up' : ''}`}
                         style={{ animationDelay: '0.3s' }}>
                        {offer.description || getOfferRuleSummary(offer)}
                      </p>
                      
                      {/* Reward Amount */}
                      <span className={`text-brand-gold font-black text-[26px] sm:text-[32px] 
                                       tracking-tight
                                       ${index === bannerIdx ? 'animate-fade-in-up' : ''}`}
                            style={{ animationDelay: '0.4s' }}>
                        {getOfferRewardLabel(offer)}
                      </span>
                    </div>
                    
                    {/* CTA Button */}
                    <Link
                      to="/menu"
                      className="hidden sm:flex items-center gap-2 
                                 bg-brand-gold text-brand-bg 
                                 font-bold text-[14px] px-6 py-3 rounded-xl 
                                 hover:shadow-glow-gold hover:brightness-110 
                                 active:scale-[0.98]
                                 transition-all duration-300 group"
                    >
                      Order Now
                      <ArrowRight 
                        size={16} 
                        strokeWidth={2.5}
                        className="group-hover:translate-x-1 transition-transform" 
                      />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Dots */}
            {offers.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {offers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIdx(i)}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === bannerIdx 
                        ? 'w-8 bg-brand-gold shadow-[0_0_10px_rgba(200,160,60,0.5)]' 
                        : 'w-2 bg-brand-text/20 hover:bg-brand-text/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Feature Badges */}
      <div className="px-4 py-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-4 text-[11px] sm:text-[12px] font-semibold 
                        text-brand-text-dim overflow-x-auto scrollbar-hide">
          {[
            { icon: Truck, text: 'Free delivery over \u20B9299', color: 'text-emerald-400' },
            { icon: Clock, text: '10-min prep', color: 'text-amber-400' },
            { icon: Star, text: 'Premium Quality', color: 'text-brand-gold' },
          ].map((item, i) => (
            <div 
              key={item.text} 
              className="flex items-center gap-2 whitespace-nowrap 
                         px-3 py-2 bg-brand-surface/50 rounded-xl
                         border border-brand-border/50
                         hover:border-brand-gold/20 transition-colors duration-300"
            >
              <item.icon size={14} className={item.color} strokeWidth={2.2} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="px-4 pt-4 pb-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-bold text-white tracking-tight">
              What are you craving?
            </h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat, index) => (
              <Link
                key={cat.id}
                to={`/menu?category=${cat.slug}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="relative">
                  {/* Glow Effect on Hover */}
                  <div className="absolute -inset-1 bg-brand-gold/0 
                                  group-hover:bg-brand-gold/20 
                                  rounded-full blur-md 
                                  transition-all duration-500" />
                  
                  {/* Image Container */}
                  <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden 
                                  border-2 border-brand-border 
                                  group-hover:border-brand-gold/60 
                                  transition-all duration-500
                                  group-hover:shadow-glow-gold-soft">
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover 
                                 group-hover:scale-115 
                                 transition-transform duration-700 ease-out"
                    />
                  </div>
                </div>
                
                <span className="text-[12px] font-bold text-brand-text-muted 
                                 group-hover:text-brand-gold 
                                 transition-colors duration-300 
                                 text-center max-w-[80px] truncate">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <HorizontalRail
          icon={<Flame size={20} className="text-orange-400" strokeWidth={2.5} />}
          title="Best Sellers"
          subtitle="Our most loved items"
          items={bestSellers}
          onAdd={handleAdd}
          linkTo="/menu"
          delay={0.4}
        />
      )}

      {/* Category Sections */}
      {itemsByCategory.map((group, index) => (
        <HorizontalRail
          key={group.category.id}
          title={group.category.name}
          items={group.items}
          onAdd={handleAdd}
          linkTo={`/menu?category=${group.category.slug}`}
          delay={0.5 + index * 0.1}
        />
      ))}

      {/* Customization Modal */}
      {selectedItem && (
        <CustomizationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={handleConfirmAdd}
        />
      )}
    </div>
  );
}

function HorizontalRail({
  icon,
  title,
  subtitle,
  items,
  onAdd,
  linkTo,
  delay = 0,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
  linkTo: string;
  delay?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    return () => el.removeEventListener('scroll', updateArrows);
  }, [items]);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <section 
      className="pt-6 pb-2 animate-fade-in-up" 
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Header */}
      <div className="px-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 bg-brand-surface rounded-xl 
                            flex items-center justify-center
                            border border-brand-border">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-[20px] font-bold text-white tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] text-brand-text-dim font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <Link 
          to={linkTo} 
          className="flex items-center gap-1 text-brand-gold text-[13px] font-bold 
                     hover:gap-2 transition-all duration-300 group"
        >
          See All 
          <ChevronRight 
            size={16} 
            strokeWidth={2.5} 
            className="group-hover:translate-x-0.5 transition-transform" 
          />
        </Link>
      </div>
      
      {/* Scrollable Content */}
      <div className="relative group/rail">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory"
        >
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="w-[46vw] sm:w-48 flex-shrink-0 snap-start"
              style={{ animationDelay: `${delay + index * 0.05}s` }}
            >
              <ProductCard item={item} onAdd={onAdd} />
            </div>
          ))}
        </div>
        
        {/* Navigation Arrows */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 
                       w-10 h-10 bg-brand-surface/95 backdrop-blur-sm
                       border border-brand-border hover:border-brand-gold/30
                       rounded-full items-center justify-center 
                       text-white hover:text-brand-gold
                       opacity-0 group-hover/rail:opacity-100 
                       hover:shadow-glow-gold-soft
                       transition-all duration-300 z-10"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 
                       w-10 h-10 bg-brand-surface/95 backdrop-blur-sm
                       border border-brand-border hover:border-brand-gold/30
                       rounded-full items-center justify-center 
                       text-white hover:text-brand-gold
                       opacity-0 group-hover/rail:opacity-100 
                       hover:shadow-glow-gold-soft
                       transition-all duration-300 z-10"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  );
}
