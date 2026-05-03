import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, X, Package, MousePointer2 } from 'lucide-react';
import { useLooterGame } from '../../../looter-game/LooterGameContext';
import { InventoryGrid, MAX_GRID_W } from '../../../looter-game/backpack';
import type { LooterItem, BagItem } from '../../../looter-game/backpack';
import ItemPopup from '../../../looter-game/backpack/components/ItemPopup';
import { createPortal } from 'react-dom';

const STORAGE_GRID_W = MAX_GRID_W;
const STORAGE_GRID_H = 24;

const VIRTUAL_STORAGE_BAG: BagItem = {
  uid: 'virtual_storage_bag',
  id: 'virtual_storage_bag',
  name: 'Kho Thành Trì',
  icon: '🏰',
  rarity: 'common',
  width: STORAGE_GRID_W,
  height: STORAGE_GRID_H,
  gridX: 0,
  gridY: 0,
  rotated: false,
  shape: Array.from({ length: STORAGE_GRID_H }, () => Array(STORAGE_GRID_W).fill(true)),
  cells: STORAGE_GRID_W * STORAGE_GRID_H,
};

// Helper to auto-place items in storage grid if they don't have coords
const buildPlacedStorage = (items: LooterItem[]) => {
  const current = items.map(i => ({ ...i }));
  const occ = Array.from({ length: STORAGE_GRID_H }, () => Array(STORAGE_GRID_W).fill(false));

  current.forEach(item => {
    if (item.gridX >= 0) {
      for (let r = 0; r < (item.gridH || 1); r++) {
        for (let c = 0; c < (item.gridW || 1); c++) {
          if (item.gridY + r < STORAGE_GRID_H && item.gridX + c < STORAGE_GRID_W) {
            occ[item.gridY + r][item.gridX + c] = true;
          }
        }
      }
    }
  });

  return current.map(item => {
    if (item.gridX < 0) {
      for (let r = 0; r <= STORAGE_GRID_H - (item.gridH || 1); r++) {
        for (let c = 0; c <= STORAGE_GRID_W - (item.gridW || 1); c++) {
          let canFit = true;
          for (let ir = 0; ir < (item.gridH || 1); ir++) {
            for (let ic = 0; ic < (item.gridW || 1); ic++) {
              if (occ[r + ir][c + ic]) { canFit = false; break; }
            }
            if (!canFit) break;
          }
          if (canFit) {
            item.gridX = c; item.gridY = r;
            for (let ir = 0; ir < (item.gridH || 1); ir++) {
              for (let ic = 0; ic < (item.gridW || 1); ic++) {
                occ[r + ir][c + ic] = true;
              }
            }
            return item;
          }
        }
      }
    }
    return item;
  });
};

export default function IntegratedStoragePanel() {
  const { state, isIntegratedStorageOpen, setIsIntegratedStorageOpen, saveStorage, storeItems } = useLooterGame();
  const [selectedItem, setSelectedItem] = useState<LooterItem | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  
  // Drag-to-scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScrollTop, setStartScrollTop] = useState(0);

  const cellSize = Math.min(42, (window.innerWidth - 10) / MAX_GRID_W);

  const storageItems = useMemo(() => buildPlacedStorage(state.storage), [state.storage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only scroll if clicking empty area (not an item)
    if ((e.target as HTMLElement).closest('.inventory-item')) return;
    
    setIsDraggingScroll(true);
    setStartY(e.pageY - (scrollRef.current?.offsetTop || 0));
    setStartScrollTop(scrollRef.current?.scrollTop || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingScroll || !scrollRef.current) return;
    e.preventDefault();
    const y = e.pageY - scrollRef.current.offsetTop;
    const walk = (y - startY) * 1.5; // Scroll speed multiplier
    scrollRef.current.scrollTop = startScrollTop - walk;
  };

  const handleMouseUp = () => setIsDraggingScroll(false);

  if (!isIntegratedStorageOpen) return null;

  return (
    <>
      {/* Global Transparent Overlay - Only covers top part (Map) to allow backpack interaction */}
      <div 
        className="fixed inset-x-0 top-0 z-[190] bg-black/40 backdrop-blur-[2px] pointer-events-auto" 
        style={{ height: 'calc(100vh - 400px)' }} // Assuming backpack is ~400px
        onClick={() => setIsIntegratedStorageOpen(false)}
      />

      <AnimatePresence>
        <motion.div
          id="integrated-storage-panel"
          initial={{ y: -400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -400, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[400] h-[40vh] border-b border-cyan-500/30 bg-[#050b14]/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto h-full max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Kho Thành Trì</h3>
                <p className="text-[10px] font-bold text-cyan-500/60 uppercase">Double-click để lấy đồ • Kéo để cuộn</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-white/40 md:flex">
                <Package className="h-3 w-3" />
                {storageItems.length} VẬT PHẨM
              </div>
              <button
                onClick={() => setIsIntegratedStorageOpen(false)}
                className="rounded-full p-2 text-white/20 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className={`h-[calc(40vh-56px)] overflow-y-auto subtle-scrollbar cursor-grab active:cursor-grabbing ${isDraggingScroll ? 'select-none' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="flex justify-center p-4">
              <InventoryGrid
                items={storageItems}
                bags={[VIRTUAL_STORAGE_BAG]}
                gridH={STORAGE_GRID_H}
                hideStorage
                onItemLayoutChange={(newItems) => saveStorage(newItems)}
                onItemDoubleClick={(item) => {
                  console.log(`[IntegratedStorage] DoubleClick callback for ${item.name}`);
                  setSelectedItem(null); // Force close popup
                  // Move back to backpack
                  storeItems([item.uid], 'retrieve', 'fortress');
                }}
                onItemClick={(item, pos) => {
                  setSelectedItem(item);
                  setPopupPos(pos);
                }}
                onDropOutside={(item, e) => {
                  if (e) {
                    const backpack = document.getElementById('looter-backpack-container');
                    if (backpack) {
                      const rect = backpack.getBoundingClientRect();
                      if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                      ) {
                        // Dropped into backpack!
                        storeItems([item.uid], 'retrieve', 'fortress');
                        return;
                      }
                    }
                  }
                  
                  // If dropped elsewhere, do nothing (InventoryGrid will keep it in storage)
                  // or we can refresh storage to ensure it's not lost
                  saveStorage([...state.storage]); 
                }}
                cellSize={cellSize}
              />
            </div>
          </div>
          </div>
        </motion.div>

        {/* Item Info Popup */}
        {selectedItem && createPortal(
          <ItemPopup
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            style={{
              position: 'fixed',
              left: Math.max(10, Math.min(window.innerWidth - 230, popupPos.x - 100)),
              top: Math.max(70, popupPos.y + 20),
              zIndex: 9999,
            }}
          />,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
