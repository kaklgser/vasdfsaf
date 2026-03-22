import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export default function FloatingCart() {
  const { itemCount, subtotal } = useCart();
  const location = useLocation();

  const hidden = location.pathname === '/cart'
    || location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/chef')
    || location.pathname.startsWith('/order-success')
    || itemCount === 0;

  if (hidden) return null;

  return (
    <Link
      to="/cart"
      className="customer-floating-cart animate-slide-up"
    >
      <div className="relative overflow-hidden 
                      bg-gradient-to-r from-brand-gold via-brand-gold-soft to-brand-gold 
                      rounded-2xl px-5 py-4 
                      flex items-center justify-between 
                      shadow-glow-gold 
                      hover:shadow-[0_0_40px_rgba(200,160,60,0.35)]
                      active:scale-[0.98] 
                      transition-all duration-300
                      group">
        {/* Animated Background Shine */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        translate-x-[-100%] group-hover:translate-x-[100%] 
                        transition-transform duration-700" />
        
        {/* Left Side - Bag Icon & Count */}
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 bg-brand-bg/15 rounded-xl 
                            flex items-center justify-center
                            group-hover:bg-brand-bg/20 transition-colors">
              <ShoppingBag size={22} strokeWidth={2.5} className="text-brand-bg" />
            </div>
            {/* Item Count Badge */}
            <span className="absolute -top-2 -right-2 
                             w-6 h-6 bg-brand-bg text-brand-gold 
                             text-[12px] font-extrabold rounded-full 
                             flex items-center justify-center
                             shadow-lg
                             animate-scale-in-bounce">
              {itemCount}
            </span>
          </div>
          
          {/* Item Count & Total */}
          <div className="text-brand-bg">
            <span className="text-[15px] font-bold block leading-tight">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-[18px] font-extrabold tabular-nums tracking-tight">
              {'\u20B9'}{subtotal}
            </span>
          </div>
        </div>
        
        {/* Right Side - CTA */}
        <div className="relative flex items-center gap-2 text-brand-bg">
          <span className="text-[14px] font-bold">
            View Cart
          </span>
          <div className="w-8 h-8 bg-brand-bg/15 rounded-lg 
                          flex items-center justify-center
                          group-hover:bg-brand-bg/25 
                          group-hover:translate-x-1
                          transition-all duration-300">
            <ArrowRight size={18} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </Link>
  );
}
