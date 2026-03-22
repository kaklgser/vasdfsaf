import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-surface/50 border-t border-brand-border backdrop-blur-sm">
      <div className="section-padding py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
          {/* Brand */}
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-5">
              <img 
                src="/image.png" 
                alt="The Supreme Waffle" 
                className="h-12 w-auto object-contain 
                           drop-shadow-[0_0_15px_rgba(200,160,60,0.15)]" 
              />
            </div>
            <p className="text-brand-text-dim text-[14px] leading-relaxed mb-5 max-w-[280px]">
              Crafting the finest waffles with premium ingredients. 
              Every bite is a moment of pure joy.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border
                           flex items-center justify-center
                           text-brand-text-dim hover:text-brand-gold 
                           hover:border-brand-gold/30 hover:bg-brand-gold/5
                           transition-all duration-300 group"
              >
                <Instagram 
                  size={18} 
                  className="group-hover:scale-110 transition-transform" 
                />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border
                           flex items-center justify-center
                           text-brand-text-dim hover:text-brand-gold 
                           hover:border-brand-gold/30 hover:bg-brand-gold/5
                           transition-all duration-300 group"
              >
                <Facebook 
                  size={18} 
                  className="group-hover:scale-110 transition-transform" 
                />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h4 className="font-bold text-[12px] uppercase tracking-[0.15em] 
                           text-brand-text-dim mb-5 flex items-center gap-2">
              <Sparkles size={12} className="text-brand-gold" />
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { to: '/menu', label: 'Our Menu' },
                { to: '/track', label: 'Track Order' },
                { to: '/about', label: 'About Us' },
                { to: '/my-orders', label: 'My Orders' },
              ].map((link, index) => (
                <li key={link.label}>
                  <Link 
                    to={link.to} 
                    className="text-brand-text-muted hover:text-brand-gold 
                               text-[14px] font-medium transition-all duration-200
                               hover:translate-x-1 inline-flex"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h4 className="font-bold text-[12px] uppercase tracking-[0.15em] 
                           text-brand-text-dim mb-5 flex items-center gap-2">
              <Sparkles size={12} className="text-brand-gold" />
              Get in Touch
            </h4>
            <ul className="space-y-4">
              <li className="group">
                <a 
                  href="tel:+919876543210"
                  className="flex items-center gap-3 text-brand-text-muted text-[14px]
                             hover:text-white transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-surface-light 
                                  flex items-center justify-center
                                  group-hover:bg-brand-gold/10 transition-colors">
                    <Phone size={16} className="text-brand-gold" strokeWidth={2.2} />
                  </div>
                  <span>+91 98765 43210</span>
                </a>
              </li>
              <li className="group">
                <a 
                  href="mailto:hello@supremewaffle.com"
                  className="flex items-center gap-3 text-brand-text-muted text-[14px]
                             hover:text-white transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-surface-light 
                                  flex items-center justify-center
                                  group-hover:bg-brand-gold/10 transition-colors">
                    <Mail size={16} className="text-brand-gold" strokeWidth={2.2} />
                  </div>
                  <span>hello@supremewaffle.com</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-brand-text-muted text-[14px]">
                <div className="w-9 h-9 rounded-lg bg-brand-surface-light 
                                flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={16} className="text-brand-gold" strokeWidth={2.2} />
                </div>
                <span className="leading-relaxed">
                  123 Baker Street, Food District,<br />City - 400001
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-brand-border mt-10 pt-6 
                        flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-brand-text-dim text-[12px] font-medium">
            &copy; {new Date().getFullYear()} The Supreme Waffle. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-brand-text-dim text-[12px] font-medium">
            <Link 
              to="/privacy" 
              className="hover:text-brand-gold transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className="hover:text-brand-gold transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
