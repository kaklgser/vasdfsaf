export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      {/* Image Skeleton with shimmer */}
      <div className="aspect-square bg-brand-surface-light/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                        animate-shimmer" 
             style={{ backgroundSize: '200% 100%' }} />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-4 bg-brand-surface-light rounded-lg w-3/4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                          animate-shimmer" 
               style={{ backgroundSize: '200% 100%', animationDelay: '0.1s' }} />
        </div>
        
        {/* Prep time */}
        <div className="h-3 bg-brand-surface-light/60 rounded-lg w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                          animate-shimmer" 
               style={{ backgroundSize: '200% 100%', animationDelay: '0.2s' }} />
        </div>
        
        {/* Price & Button Row */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 bg-brand-surface-light rounded-lg w-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                            animate-shimmer" 
                 style={{ backgroundSize: '200% 100%', animationDelay: '0.3s' }} />
          </div>
          <div className="h-9 bg-brand-surface-light rounded-xl w-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                            animate-shimmer" 
                 style={{ backgroundSize: '200% 100%', animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="section-padding py-8">
      {/* Title Skeleton */}
      <div className="h-8 bg-brand-surface-light rounded-xl w-48 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                        animate-shimmer" 
             style={{ backgroundSize: '200% 100%' }} />
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div 
            key={i} 
            className="animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <CardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BannerSkeleton() {
  return (
    <div className="aspect-[2.2/1] rounded-3xl bg-brand-surface-light/70 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                      animate-shimmer" 
           style={{ backgroundSize: '200% 100%' }} />
    </div>
  );
}
