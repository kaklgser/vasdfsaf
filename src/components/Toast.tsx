import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Check, AlertCircle, X, Sparkles } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 sm:bottom-8 right-4 sm:right-6 z-[60] space-y-3">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`relative flex items-center gap-3 px-5 py-4 rounded-2xl 
                        shadow-elevated animate-slide-in-right
                        text-[14px] font-semibold border backdrop-blur-xl
                        transform transition-all duration-300
                        hover:scale-[1.02] ${
              toast.type === 'success'
                ? 'bg-emerald-600/95 text-white border-emerald-400/20'
                : 'bg-red-600/95 text-white border-red-400/20'
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              toast.type === 'success' 
                ? 'bg-white/20' 
                : 'bg-white/20'
            }`}>
              {toast.type === 'success' ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <AlertCircle size={18} strokeWidth={2.5} />
              )}
            </div>
            
            {/* Message */}
            <span className="flex-1 pr-2">{toast.message}</span>
            
            {/* Close Button */}
            <button 
              onClick={() => removeToast(toast.id)} 
              className="p-1.5 rounded-lg hover:bg-white/20 
                         transition-all duration-200
                         active:scale-90"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 
                            bg-white/20 rounded-b-2xl overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  toast.type === 'success' ? 'bg-white/40' : 'bg-white/40'
                }`}
                style={{
                  animation: 'shrinkWidth 3.5s linear forwards',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Keyframe Animation */}
      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
