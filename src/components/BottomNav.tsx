import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, Package, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/my-orders', icon: Package, label: 'Orders' },
  { to: '/auth', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = location.pathname.startsWith('/admin');
  const isChef = location.pathname.startsWith('/chef');
  if (isAdmin || isChef) return null;

  function getProfileTo() {
    return user ? '/profile' : '/auth';
  }

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/';
    if (to === '/auth') return location.pathname === '/auth' || location.pathname === '/profile';
    return location.pathname.startsWith(to);
  }

  return (
    <nav className="customer-bottom-nav">
      <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-3">
        {tabs.map((tab, index) => {
          const to = tab.to === '/auth' ? getProfileTo() : tab.to;
          const active = isActive(tab.to);
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.label}
              to={to}
              className={`relative flex flex-col items-center justify-center 
                          gap-1 w-[72px] py-2.5 rounded-2xl 
                          transition-all duration-300 ease-out
                          group ${
                active
                  ? 'text-brand-gold'
                  : 'text-brand-text-dim hover:text-brand-text-muted'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active Background */}
              {active && (
                <div className="absolute inset-x-2 inset-y-1 
                                bg-brand-gold/10 rounded-xl
                                animate-scale-in" />
              )}
              
              {/* Icon Container */}
              <div className={`relative z-10 transition-transform duration-300 ${
                active ? 'scale-110' : 'group-hover:scale-110'
              }`}>
                <Icon 
                  size={24} 
                  strokeWidth={active ? 2.5 : 2} 
                  className="transition-all duration-300"
                />
                
                {/* Active Indicator Dot */}
                {active && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 
                                  w-1.5 h-1.5 bg-brand-gold rounded-full
                                  animate-scale-in-bounce
                                  shadow-[0_0_8px_rgba(200,160,60,0.5)]" />
                )}
              </div>
              
              {/* Label */}
              <span className={`relative z-10 text-[11px] leading-none 
                                transition-all duration-300 ${
                active ? 'font-bold' : 'font-semibold'
              }`}>
                {tab.label === 'Profile' && user ? 'Profile' : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* Safe Area Spacer */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
