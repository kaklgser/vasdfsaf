import { Clock, Plus, Minus, Sparkles } from 'lucide-react';
import type { MenuItem } from '../types';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export default function ProductCard({ item, onAdd }: ProductCardProps) {
  const { items, updateQuantity, removeItem } = useCart();

  const cartItems = items.filter((ci) => ci.menu_item.id === item.id);
  const totalQty = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);

  function handleIncrement() {
    if (totalQty === 0) {
      onAdd(item);
    } else {
      const last = cartItems[cartItems.length - 1];
      updateQuantity(last.id, last.quantity + 1);
    }
  }

  function handleDecrement() {
    if (totalQty <= 0) return;
    const last = cartItems[cartItems.length - 1];
    if (last.quantity <= 1) {
      removeItem(last.id);
    } else {
      updateQuantity(last.id, last.quantity - 1);
    }
  }

  return (
    <div className="card group relative">
      {/* Image Container */}
      <div className="relative overflow-hidden aspect-square">
        {/* Main Image */}
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover 
                     group-hover:scale-110 
                     transition-transform duration-700 ease-out"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent opacity-60" />
        
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-brand-gold/0 group-hover:bg-brand-gold/5 
                        transition-colors duration-500" />
        
        {/* Sold Out Overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-brand-overlay/90 backdrop-blur-sm 
                          flex items-center justify-center">
            <span className="text-white font-bold text-[14px] 
                             bg-brand-surface-strong/90 px-5 py-2.5 rounded-xl
                             border border-brand-border">
              Sold Out
            </span>
          </div>
        )}
        
        {/* Veg/Non-Veg Badge */}
        <div className="absolute top-3 left-3">
          {item.is_veg ? (
            <div className="w-5 h-5 border-2 border-emerald-400 rounded-md 
                            flex items-center justify-center 
                            bg-brand-surface/90 backdrop-blur-sm
                            shadow-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            </div>
          ) : (
            <div className="w-5 h-5 border-2 border-red-400 rounded-md 
                            flex items-center justify-center 
                            bg-brand-surface/90 backdrop-blur-sm
                            shadow-sm">
              <div className="w-0 h-0 
                              border-l-[4px] border-l-transparent 
                              border-r-[4px] border-r-transparent 
                              border-b-[6px] border-b-red-400" />
            </div>
          )}
        </div>

        {/* Rating Badge - Top Right */}
        {item.rating > 4.5 && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 px-2 py-1 
                            bg-brand-surface/90 backdrop-blur-sm 
                            rounded-lg border border-brand-gold/20">
              <Sparkles size={10} className="text-brand-gold" />
              <span className="text-[10px] font-bold text-brand-gold">
                Popular
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="font-bold text-white text-[15px] leading-tight 
                       truncate group-hover:text-brand-gold-soft 
                       transition-colors duration-300">
          {item.name}
        </h3>

        {/* Prep Time */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <Clock 
            size={12} 
            className="text-brand-text-dim" 
            strokeWidth={2.2} 
          />
          <span className="text-[12px] font-semibold text-brand-text-dim">
            {item.prep_time} min
          </span>
        </div>

        {/* Price & Add Button Row */}
        <div className="flex items-center justify-between mt-3">
          {/* Price */}
          <span className="text-[18px] font-extrabold text-brand-gold tracking-tight">
            {'\u20B9'}{item.price}
          </span>

          {/* Quantity Controls / Add Button */}
          {totalQty > 0 ? (
            <div className="flex items-center gap-0 
                            border-2 border-brand-gold rounded-xl 
                            overflow-hidden
                            animate-scale-in">
              <button
                onClick={handleDecrement}
                className="w-9 h-9 flex items-center justify-center 
                           text-brand-gold hover:bg-brand-gold/10 
                           active:bg-brand-gold/20
                           transition-all duration-200"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>
              <span className="w-8 text-center text-[15px] font-extrabold 
                               text-brand-gold tabular-nums">
                {totalQty}
              </span>
              <button
                onClick={handleIncrement}
                className="w-9 h-9 flex items-center justify-center 
                           text-brand-gold hover:bg-brand-gold/10 
                           active:bg-brand-gold/20
                           transition-all duration-200"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(item)}
              disabled={!item.is_available}
              className="relative overflow-hidden
                         border-2 border-brand-gold text-brand-gold 
                         text-[13px] font-extrabold 
                         px-5 py-2 rounded-xl
                         hover:bg-brand-gold hover:text-brand-bg 
                         hover:shadow-glow-gold-soft
                         active:scale-[0.95] 
                         transition-all duration-300
                         disabled:opacity-30 disabled:cursor-not-allowed
                         disabled:hover:bg-transparent disabled:hover:shadow-none
                         group/btn"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Plus 
                  size={14} 
                  strokeWidth={3} 
                  className="group-hover/btn:rotate-90 transition-transform duration-300" 
                />
                ADD
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
