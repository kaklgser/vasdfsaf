import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';

export default function FloatingCart() {
  const { itemCount, subtotal } = useCart();
  const location = useLocation();

  const hidden = location.pathname === '/cart'
    || location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/chef')
    || location.pathname.startsWith('/order-success')
    || itemCount === 0;

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            mass: 1
          }}
          className="customer-floating-cart"
        >
          <Link to="/cart">
            <motion.div 
              className="relative overflow-hidden 
                         bg-gradient-to-r from-brand-gold via-brand-gold-soft to-brand-gold 
                         rounded-2xl px-5 py-4 
                         flex items-center justify-between 
                         shadow-glow-gold 
                         group"
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 0 40px rgba(200,160,60,0.35)"
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Animated Background Shine */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ 
                  repeat: Infinity, 
                  repeatDelay: 3,
                  duration: 0.8,
                  ease: "easeInOut"
                }}
              />
              
              {/* Left Side - Bag Icon & Count */}
              <div className="relative flex items-center gap-4">
                <div className="relative">
                  <motion.div 
                    className="w-11 h-11 bg-brand-bg/15 rounded-xl 
                               flex items-center justify-center
                               group-hover:bg-brand-bg/20 transition-colors"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <ShoppingBag size={22} strokeWidth={2.5} className="text-brand-bg" />
                  </motion.div>
                  
                  {/* Item Count Badge with Pulse */}
                  <motion.span 
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 
                               w-6 h-6 bg-brand-bg text-brand-gold 
                               text-[12px] font-extrabold rounded-full 
                               flex items-center justify-center
                               shadow-lg"
                  >
                    <motion.span
                      key={`count-${itemCount}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      {itemCount}
                    </motion.span>
                  </motion.span>
                </div>
                
                {/* Item Count & Total */}
                <div className="text-brand-bg">
                  <span className="text-[15px] font-bold block leading-tight">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <motion.span 
                    key={subtotal}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[18px] font-extrabold tabular-nums tracking-tight block"
                  >
                    {'\u20B9'}{subtotal}
                  </motion.span>
                </div>
              </div>
              
              {/* Right Side - CTA */}
              <div className="relative flex items-center gap-2 text-brand-bg">
                <span className="text-[14px] font-bold">
                  View Cart
                </span>
                <motion.div 
                  className="w-8 h-8 bg-brand-bg/15 rounded-lg 
                             flex items-center justify-center"
                  whileHover={{ x: 4, backgroundColor: "rgba(10, 12, 8, 0.25)" }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                </motion.div>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
