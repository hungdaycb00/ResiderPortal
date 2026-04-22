import React from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AVAILABLE_CATEGORIES } from '../constants';

interface CategorySelectorProps {
  selectedCategories: string[];
  onToggle: (catId: string) => void;
  maxCategories?: number;
  /** Expandable mode (for sidebar) */
  expandable?: boolean;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  /** Grid mode (for modals) */
  gridCols?: string;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function CategorySelector({
  selectedCategories,
  onToggle,
  maxCategories = 3,
  expandable = false,
  isExpanded = true,
  onExpandToggle,
  gridCols,
  showNotification,
}: CategorySelectorProps) {
  const handleToggle = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      onToggle(catId);
    } else if (selectedCategories.length < maxCategories) {
      onToggle(catId);
    } else {
      showNotification?.(`Only max ${maxCategories} categories allowed.`, 'info');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Category (Max {maxCategories})</label>
          {expandable && onExpandToggle && (
            <button 
              type="button"
              onClick={onExpandToggle}
              className={`flex items-center justify-center p-1 rounded-full transition-all ${isExpanded ? 'bg-purple-600 text-white rotate-45' : 'bg-[#252830] text-gray-400 hover:text-white'}`}
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
        {selectedCategories.length === 0 ? (
          <span className="text-[9px] font-bold text-red-500 animate-pulse">* Required</span>
        ) : (
          <span className="text-[9px] font-bold text-blue-500">{selectedCategories.length}/{maxCategories}</span>
        )}
      </div>

      {expandable ? (
        <>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 p-3 bg-[#1a1d24] border border-gray-700 rounded-xl">
                  {AVAILABLE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggle(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                          : 'bg-[#252830] border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {cat.icon}
                      {cat.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show selected categories review even when collapsed */}
          {!isExpanded && selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1">
              {selectedCategories.map(catId => {
                const cat = AVAILABLE_CATEGORIES.find(c => c.id === catId);
                return (
                  <span key={catId} className="text-[9px] font-bold px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md">
                    {cat?.name.toUpperCase()}
                  </span>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // Grid mode for modals
        <div className={gridCols || "grid grid-cols-2 gap-2"}>
          {AVAILABLE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleToggle(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                selectedCategories.includes(cat.id.toLowerCase())
                ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/10'
              }`}
            >
              {cat.icon}
              {cat.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
