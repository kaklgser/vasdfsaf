import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Truck, Clock, Sparkles, Flame } from 'lucide-react';
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
  const bannerTimer = useRef<ReturnType<typeof setInterval>>();
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => { loadData(); }, []);

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
  }

  useEffect(() => {
    if (offers.length <= 1) return;
    bannerTimer.current = setInterval(() => {
      setBannerIdx((i) => (i + 1) % offers.length);
    }, 4000);
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
    <div className="bg-brand-bg min-h-screen pb-20">
      {offers.length > 0 && (
        <section className="px-4 pt-3 pb-1">
          <div className="relative overflow-hidden rounded-xl aspect-[2.2/1]">
            <div
              className="flex transition-transform duration-500 ease-out h-full"
              style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
            >
              {offers.map((offer) => (
                <div key={offer.id} className="w-full flex-shrink-0 h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-surface via-brand-surface-light to-brand-gold/10 rounded-xl" />
                  <div className="absolute inset-0 flex items-center px-5">
                    <div className="flex-1">
                      <span className="inline-block bg-brand-gold/20 text-brand-gold text-[12px] font-bold px-2.5 py-1 rounded-md mb-1.5 tracking-wide">
                        {getOfferBadgeLabel(offer)}
                      </span>
                      <h3 className="text-white font-extrabold text-[18px] leading-tight mb-0.5">{offer.title}</h3>
                      <p className="text-brand-text-muted text-[13px] font-medium mb-2 max-w-[200px] leading-snug">
                        {offer.description || getOfferRuleSummary(offer)}
                      </p>
                      <span className="text-brand-gold font-black text-[22px] tracking-tight">
                        {getOfferRewardLabel(offer)}
                      </span>
                    </div>
                    <Link
                      to="/menu"
                      className="hidden sm:flex items-center gap-1.5 bg-brand-gold text-brand-bg font-bold text-[14px] px-5 py-2.5 rounded-lg hover:brightness-110 transition-all"
                    >
                      Order Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {offers.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {offers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIdx(i)}
                    className={`h-[3px] rounded-full transition-all duration-300 ${
                      i === bannerIdx ? 'w-6 bg-brand-gold' : 'w-2 bg-brand-text/25'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="px-4 py-2">
        <div className="flex items-center gap-3 text-[12px] font-semibold text-brand-text-dim">
          {[
            { icon: Truck, text: 'Free delivery over \u20B9299' },
            { icon: Clock, text: '10-min prep' },
            { icon: Sparkles, text: 'Fresh & Handcrafted' },
          ].map((item, i) => (
            <div key={item.text} className="flex items-center gap-1.5 whitespace-nowrap">
              {i > 0 && <span className="text-brand-gold-muted mr-1">|</span>}
              <item.icon size={13} className="text-brand-gold-muted flex-shrink-0" strokeWidth={2.2} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <section className="px-4 pt-3 pb-1">
          <h2 className="text-[18px] font-bold text-white mb-3">What are you craving?</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/menu?category=${cat.slug}`}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              >
                <div className="w-[68px] h-[68px] rounded-full overflow-hidden border-2 border-brand-border group-hover:border-brand-gold/50 transition-all">
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <span className="text-[12px] font-bold text-brand-text-muted group-hover:text-brand-gold transition-colors text-center max-w-[72px] truncate">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <HorizontalRail
          icon={<Flame size={18} className="text-orange-400" strokeWidth={2.5} />}
          title="Best Sellers"
          items={bestSellers}
          onAdd={handleAdd}
          linkTo="/menu"
        />
      )}

      {itemsByCategory.map((group) => (
        <HorizontalRail
          key={group.category.id}
          title={group.category.name}
          items={group.items}
          onAdd={handleAdd}
          linkTo={`/menu?category=${group.category.slug}`}
        />
      ))}

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
  items,
  onAdd,
  linkTo,
}: {
  icon?: React.ReactNode;
  title: string;
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
  linkTo: string;
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
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <section className="pt-4 pb-1">
      <div className="px-4 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[18px] font-bold text-white">{title}</h2>
        </div>
        <Link to={linkTo} className="text-brand-gold text-[13px] font-bold flex items-center gap-0.5 hover:gap-1.5 transition-all">
          See All <ChevronRight size={15} strokeWidth={2.5} />
        </Link>
      </div>
      <div className="relative group/rail">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory"
        >
          {items.map((item) => (
            <div key={item.id} className="w-[44vw] sm:w-44 flex-shrink-0 snap-start">
              <ProductCard item={item} onAdd={onAdd} />
            </div>
          ))}
        </div>
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-brand-surface border border-brand-border rounded-full items-center justify-center text-white hover:bg-brand-surface-light opacity-0 group-hover/rail:opacity-100 transition-all shadow-elevated z-10"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-brand-surface border border-brand-border rounded-full items-center justify-center text-white hover:bg-brand-surface-light opacity-0 group-hover/rail:opacity-100 transition-all shadow-elevated z-10"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </section>
  );
}
