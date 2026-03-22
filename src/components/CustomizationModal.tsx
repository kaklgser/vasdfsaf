import { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, Sparkles } from 'lucide-react';
import type { MenuItem, CustomizationGroup, CustomizationOption, SelectedCustomization } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (item: MenuItem, quantity: number, customizations: SelectedCustomization[]) => void;
}

export default function CustomizationModal({ item, onClose, onConfirm }: Props) {
  const [groups, setGroups] = useState<(CustomizationGroup & { options: CustomizationOption[] })[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomizations();
  }, []);

  async function loadCustomizations() {
    const { data: groupsData } = await supabase
      .from('customization_groups')
      .select('*')
      .order('display_order');

    if (groupsData) {
      const { data: optionsData } = await supabase
        .from('customization_options')
        .select('*')
        .eq('is_available', true)
        .order('display_order');

      const grouped = groupsData.map((g) => ({
        ...g,
        options: (optionsData || []).filter((o) => o.group_id === g.id),
      }));
      setGroups(grouped);
    }
    setLoading(false);
  }

  function toggleOption(groupId: string, optionId: string, selectionType: string) {
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (selectionType === 'single') {
        return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
      }
      return {
        ...prev,
        [groupId]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
      };
    });
  }

  function getSelectedCustomizations(): SelectedCustomization[] {
    const result: SelectedCustomization[] = [];
    for (const group of groups) {
      const selectedIds = selected[group.id] || [];
      for (const optionId of selectedIds) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          result.push({ group_name: group.name, option_name: option.name, price: option.price });
        }
      }
    }
    return result;
  }

  const customizationsTotal = getSelectedCustomizations().reduce((sum, c) => sum + c.price, 0);
  const totalPrice = (item.price + customizationsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-brand-overlay/95 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative bg-brand-surface/98 backdrop-blur-xl 
                      w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl 
                      max-h-[85vh] sm:max-h-[90vh] 
                      flex flex-col 
                      animate-slide-up 
                      shadow-elevated border border-brand-border
                      mb-16 sm:mb-0
                      overflow-hidden">
        
        {/* Header */}
        <div className="relative flex-shrink-0 border-b border-brand-border">
          {/* Item Preview Image (small) */}
          <div className="absolute -top-1 left-5 w-20 h-20 sm:w-24 sm:h-24 
                          rounded-2xl overflow-hidden 
                          border-4 border-brand-surface shadow-elevated
                          transform -translate-y-1/2
                          hidden sm:block">
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="flex items-start justify-between p-5 sm:pl-32">
            <div className="pt-1">
              <h3 className="font-extrabold text-[20px] text-white tracking-tight">
                {item.name}
              </h3>
              <p className="text-[14px] font-semibold text-brand-text-dim mt-0.5">
                {'\u20B9'}{item.price} base price
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 hover:bg-brand-surface-light rounded-xl 
                         transition-colors duration-200 group"
            >
              <X 
                size={22} 
                className="text-brand-text-dim group-hover:text-white 
                           group-hover:rotate-90 transition-all duration-300" 
                strokeWidth={2.5} 
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-5 bg-brand-surface-light rounded-lg w-28 mb-4" />
                  <div className="space-y-2.5">
                    <div className="h-14 bg-brand-surface-light/70 rounded-2xl" />
                    <div className="h-14 bg-brand-surface-light/70 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-brand-surface-light rounded-2xl 
                              flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} className="text-brand-text-dim" />
              </div>
              <p className="text-brand-text-dim text-[15px] font-medium">
                No customization options available
              </p>
              <p className="text-brand-text-dim/60 text-[13px] mt-1">
                This item is perfect as is!
              </p>
            </div>
          ) : (
            groups.map((group, groupIndex) => (
              <div 
                key={group.id} 
                className="animate-fade-in-up"
                style={{ animationDelay: `${groupIndex * 0.1}s` }}
              >
                {/* Group Header */}
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="font-bold text-[16px] text-white">{group.name}</h4>
                  <span className="text-[12px] font-medium text-brand-text-dim 
                                   px-2 py-0.5 bg-brand-surface-light rounded-md">
                    {group.selection_type === 'single' ? 'Choose one' : 'Choose multiple'}
                  </span>
                  {group.is_required && (
                    <span className="text-[11px] text-brand-gold font-bold 
                                     px-2 py-0.5 bg-brand-gold/10 rounded-md
                                     border border-brand-gold/20">
                      Required
                    </span>
                  )}
                </div>
                
                {/* Options */}
                <div className="space-y-2">
                  {group.options.map((option, optionIndex) => {
                    const isSelected = (selected[group.id] || []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(group.id, option.id, group.selection_type)}
                        className={`w-full flex items-center justify-between 
                                    px-4 py-3.5 rounded-2xl border-2 
                                    transition-all duration-300 group/option
                                    ${isSelected
                                      ? 'border-brand-gold bg-brand-gold/10 shadow-glow-gold-soft'
                                      : 'border-brand-border hover:border-brand-gold/30 hover:bg-brand-surface-light/50'
                                    }`}
                        style={{ animationDelay: `${(groupIndex * 0.1) + (optionIndex * 0.05)}s` }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox/Radio */}
                          <div
                            className={`w-6 h-6 rounded-full border-2 
                                        flex items-center justify-center 
                                        transition-all duration-300
                                        ${isSelected 
                                          ? 'border-brand-gold bg-brand-gold scale-100' 
                                          : 'border-brand-text-dim group-hover/option:border-brand-gold/50 scale-90 group-hover/option:scale-100'
                                        }`}
                          >
                            {isSelected && (
                              <Check 
                                size={14} 
                                className="text-brand-bg animate-scale-in" 
                                strokeWidth={3} 
                              />
                            )}
                          </div>
                          <span className={`text-[15px] font-semibold transition-colors duration-200 ${
                            isSelected ? 'text-white' : 'text-brand-text-muted'
                          }`}>
                            {option.name}
                          </span>
                        </div>
                        {option.price > 0 && (
                          <span className={`text-[14px] font-bold transition-colors duration-200 ${
                            isSelected ? 'text-brand-gold' : 'text-brand-text-dim'
                          }`}>
                            +{'\u20B9'}{option.price}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-brand-border 
                        p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-5 
                        space-y-4 bg-brand-surface/50 backdrop-blur-sm">
          
          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 rounded-xl border-2 border-brand-border 
                         flex items-center justify-center 
                         text-white hover:border-brand-gold/40 hover:bg-brand-surface-light
                         active:scale-95 transition-all duration-200"
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <span className="text-[24px] font-extrabold w-10 text-center 
                             tabular-nums text-white">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 rounded-xl bg-brand-gold text-brand-bg 
                         flex items-center justify-center 
                         hover:brightness-110 hover:shadow-glow-gold-soft
                         active:scale-95 transition-all duration-200"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Price Breakdown */}
          {customizationsTotal > 0 && (
            <div className="flex items-center justify-center gap-2 
                            text-[13px] text-brand-text-dim font-medium
                            bg-brand-surface-light/50 rounded-xl py-2 px-4">
              <span>Base {'\u20B9'}{item.price}</span>
              <span className="text-brand-gold">+</span>
              <span>Add-ons {'\u20B9'}{customizationsTotal}</span>
              {quantity > 1 && (
                <>
                  <span className="text-brand-text-dim/50">x</span>
                  <span>{quantity}</span>
                </>
              )}
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={() => onConfirm(item, quantity, getSelectedCustomizations())}
            className="btn-primary w-full text-center flex items-center justify-center gap-3 
                       text-[16px] py-4"
          >
            <span>Add to Cart</span>
            <span className="font-extrabold text-[18px]">{'\u20B9'}{totalPrice.toFixed(0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
