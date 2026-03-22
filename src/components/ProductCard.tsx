import { Clock, Plus, Minus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MenuItem } from '../types';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  index?: number;
}

export default function ProductCard({ item, onAdd, index = 0 }: ProductCardProps) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      className="card group relative"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden aspect-square">
        {/* Main Image */}
        <motion.img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent opacity-60" />
        
        {/* Hover Glow Effect */}
        <motion.div 
          className="absolute inset-0 bg-brand-gold/0"
          whileHover={{ backgroundColor: "rgba(200, 160, 60, 0.08)" }}
          transition={{ duration: 0.4 }}
        />
        
        {/* Sold Out Overlay */}
        <AnimatePresence>
          {!item.is_available && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-overlay/90 backdrop-blur-sm 
                          flex items-center justify-center"
            >
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-white font-bold text-[14px] 
                           bg-brand-surface-strong/90 px-5 py-2.5 rounded-xl
                           border border-brand-border"
              >
                Sold Out
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Veg/Non-Veg Badge */}
        <motion.div 
          className="absolute top-3 left-3"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.2, type: "spring", stiffness: 400 }}
        >
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
        </motion.div>

        {/* Rating Badge - Top Right */}
        <AnimatePresence>
          {item.rating > 4.5 && (
            <motion.div 
              className="absolute top-3 right-3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ delay: index * 0.05 + 0.3, type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-1 px-2 py-1 
                              bg-brand-surface/90 backdrop-blur-sm 
                              rounded-lg border border-brand-gold/20">
                <Sparkles size={10} className="text-brand-gold" />
                <span className="text-[10px] font-bold text-brand-gold">
                  Popular
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          <motion.span 
            className="text-[18px] font-extrabold text-brand-gold tracking-tight"
            key={item.price}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3 }}
          >
            {'\u20B9'}{item.price}
          </motion.span>

          {/* Quantity Controls / Add Button */}
          <AnimatePresence mode="wait">
            {totalQty > 0 ? (
              <motion.div 
                key="qty-controls"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-0 
                           border-2 border-brand-gold rounded-xl 
                           overflow-hidden"
              >
                <motion.button
                  onClick={handleDecrement}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center 
                             text-brand-gold hover:bg-brand-gold/10 
                             active:bg-brand-gold/20
                             transition-all duration-200"
                >
                  <Minus size={16} strokeWidth={2.5} />
                </motion.button>
                <motion.span 
                  key={totalQty}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-8 text-center text-[15px] font-extrabold 
                             text-brand-gold tabular-nums"
                >
                  {totalQty}
                </motion.span>
                <motion.button
                  onClick={handleIncrement}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center 
                             text-brand-gold hover:bg-brand-gold/10 
                             active:bg-brand-gold/20
                             transition-all duration-200"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                onClick={() => onAdd(item)}
                disabled={!item.is_available}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative overflow-hidden
                           border-2 border-brand-gold text-brand-gold 
                           text-[13px] font-extrabold 
                           px-5 py-2 rounded-xl
                           hover:bg-brand-gold hover:text-brand-bg 
                           hover:shadow-glow-gold-soft
                           transition-all duration-300
                           disabled:opacity-30 disabled:cursor-not-allowed
                           disabled:hover:bg-transparent disabled:hover:shadow-none
                           group/btn"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <motion.span
                    className="inline-block"
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Plus size={14} strokeWidth={3} />
                  </motion.span>
                  ADD
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
