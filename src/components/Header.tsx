import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Package, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.startsWith('/admin');
  const isChef = location.pathname.startsWith('/chef');

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isAdmin || isChef) return null;

  async function handleSignOut() {
    await signOut();
    setProfileOpen(false);
    navigate('/');
  }

  const displayName = profile?.full_name || profile?.email || user?.email || 'User';
  const displayPhone = profile?.phone || '';
  const displayEmail = profile?.email || user?.email || '';

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-brand-bg/98 backdrop-blur-2xl shadow-glass border-b border-brand-border/50' 
          : 'bg-brand-bg/80 backdrop-blur-xl border-b border-transparent'
      }`}
    >
      <div className="section-padding">
        <div className="flex items-center gap-4 h-[64px] lg:h-[72px]">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex-shrink-0 group relative"
          >
            <div className="absolute -inset-2 bg-brand-gold/0 group-hover:bg-brand-gold/5 rounded-2xl transition-all duration-500" />
            <img
              src="https://res.cloudinary.com/dlkovvlud/image/upload/v1771590689/Screenshot_2026-02-20_175222-removebg-preview_ufalk6.png"
              alt="The Supreme Waffle"
              className="relative h-11 sm:h-12 lg:h-14 w-auto object-contain 
                         drop-shadow-[0_0_20px_rgba(200,160,60,0.15)]
                         group-hover:drop-shadow-[0_0_30px_rgba(200,160,60,0.25)]
                         transition-all duration-500"
            />
          </Link>

          {/* Search Bar */}
          <Link
            to="/menu"
            className="flex-1 group"
          >
            <div className="flex items-center gap-3 bg-brand-surface/60 backdrop-blur-sm 
                            border border-brand-border hover:border-brand-gold/30 
                            rounded-2xl px-5 py-3.5
                            transition-all duration-300
                            group-hover:bg-brand-surface/80
                            group-hover:shadow-glow-gold-soft">
              <Search 
                size={18} 
                className="text-brand-gold flex-shrink-0 
                           group-hover:scale-110 transition-transform duration-300" 
                strokeWidth={2.5} 
              />
              <span className="text-[15px] font-medium text-brand-text-dim 
                               group-hover:text-brand-text-muted transition-colors duration-300">
                Search our menu...
              </span>
              <div className="hidden sm:flex items-center gap-1.5 ml-auto">
                <kbd className="px-2 py-1 text-[11px] font-semibold text-brand-text-dim 
                                bg-brand-surface-light rounded-lg border border-brand-border">
                  /
                </kbd>
              </div>
            </div>
          </Link>

          {/* Profile / Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="hidden sm:flex items-center gap-2.5 px-3 py-2.5 rounded-2xl
                             hover:bg-brand-surface-light/70 transition-all duration-300
                             group"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 
                                    rounded-full flex items-center justify-center 
                                    border border-brand-gold/30 
                                    group-hover:border-brand-gold/50 
                                    group-hover:shadow-glow-gold-soft
                                    transition-all duration-300">
                      <User size={18} className="text-brand-gold" strokeWidth={2.5} />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 
                                    bg-emerald-500 rounded-full border-2 border-brand-bg" />
                  </div>
                  <span className="max-w-[100px] truncate hidden lg:inline 
                                   text-[14px] font-semibold text-brand-text-muted
                                   group-hover:text-white transition-colors">
                    {displayName}
                  </span>
                  <ChevronDown 
                    size={14} 
                    className={`text-brand-text-dim transition-transform duration-300 ${
                      profileOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 
                                  bg-brand-surface/95 backdrop-blur-2xl 
                                  rounded-2xl border border-brand-border 
                                  shadow-elevated py-2 
                                  animate-fade-in-down z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-brand-border">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 
                                        rounded-full flex items-center justify-center 
                                        border border-brand-gold/30">
                          <User size={20} className="text-brand-gold" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[15px] text-white truncate">
                            {displayName}
                          </p>
                          {displayEmail && (
                            <p className="text-[12px] font-medium text-brand-text-dim truncate mt-0.5">
                              {displayEmail}
                            </p>
                          )}
                          {displayPhone && (
                            <p className="text-[11px] font-medium text-brand-text-dim truncate mt-0.5">
                              {displayPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/my-orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 
                                   text-[14px] font-semibold text-brand-text-muted 
                                   hover:text-white hover:bg-brand-surface-light/70 
                                   transition-all duration-200 group"
                      >
                        <Package 
                          size={18} 
                          strokeWidth={2.2} 
                          className="group-hover:text-brand-gold transition-colors" 
                        />
                        <span>My Orders</span>
                        <Sparkles 
                          size={14} 
                          className="ml-auto text-brand-gold opacity-0 
                                     group-hover:opacity-100 transition-opacity" 
                        />
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 
                                   text-[14px] font-semibold text-brand-text-muted 
                                   hover:text-white hover:bg-brand-surface-light/70 
                                   transition-all duration-200 group"
                      >
                        <LogOut 
                          size={18} 
                          strokeWidth={2.2} 
                          className="group-hover:text-red-400 transition-colors" 
                        />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                state={{ from: location.pathname }}
                className="hidden sm:flex items-center gap-2 
                           text-[14px] font-bold text-brand-gold 
                           hover:text-brand-gold-soft 
                           px-4 py-2.5 rounded-2xl
                           hover:bg-brand-gold/5
                           transition-all duration-300 group"
              >
                <User 
                  size={18} 
                  strokeWidth={2.5} 
                  className="group-hover:scale-110 transition-transform duration-300" 
                />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
