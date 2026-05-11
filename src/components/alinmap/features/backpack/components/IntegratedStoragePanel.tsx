import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, X, Package, Home, Truck, DollarSign } from 'lucide-react';
import { useLooterGame } from '../../../looter-game/LooterGameContext';
import { InventoryGrid, MAX_GRID_W } from '../../../looter-game/backpack';
import StorageEdgeControls from '../../../bottom-sheet/StorageEdgeControls';
import type { LooterItem, BagItem } from '../../../looter-game/backpack';

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

interface IntegratedStoragePanelProps {
  variant?: 'overlay' | 'inline';
}

export default function IntegratedStoragePanel({ variant = 'overlay' }: IntegratedStoragePanelProps) {
  const {
    state,
    fortressStorageMode,
    isIntegratedStorageOpen,
    isItemDragging,
    setIsItemDragging,
    setIsIntegratedStorageOpen,
    toggleIntegratedStorage,
    openFortressStorage,
    saveStorage,
    savePortalStorage,
    transportPortalItems,
    storeItems,
    sellItems,
    returnToFortress,
  } = useLooterGame();

  const [isReturning, setIsReturning] = useState(false);
  const [isTransporting, setIsTransporting] = useState(false);
  const [transportProgress, setTransportProgress] = useState(0);
  const [sellZoneHover, setSellZoneHover] = useState(false);
  
  // Drag-to-scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScrollTop, setStartScrollTop] = useState(0);
  const sellZoneRef = useRef<HTMLDivElement>(null);

  const cellSize = Math.min(42, (window.innerWidth - 10) / MAX_GRID_W);

  const isPortalMode = fortressStorageMode === 'portal';
  const activeItems = isPortalMode ? (state.portalStorage || []) : state.storage;
  const storageItems = useMemo(() => buildPlacedStorage(activeItems), [activeItems]);
  const activeSave = isPortalMode ? savePortalStorage : saveStorage;

  // Transport fee calculation
  const totalValue = useMemo(
    () => (state.portalStorage || []).reduce((s, i) => s + (i.price || 0), 0),
    [state.portalStorage]
  );
  const transportFee = Math.ceil(totalValue * 0.05);
  const canTransport = !isTransporting && (state.portalStorage || []).length > 0 && state.looterGold >= transportFee;

  // Transport progress animation
  useEffect(() => {
    if (!isTransporting) { setTransportProgress(0); return; }
    const start = Date.now();
    const duration = 3000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      setTransportProgress(pct * 100);
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isTransporting]);

  const handleTransport = useCallback(async () => {
    if (!canTransport) return;
    setIsTransporting(true);
    // Wait 3s for progress bar
    await new Promise(r => setTimeout(r, 3000));
    await transportPortalItems();
    setIsTransporting(false);
  }, [canTransport, transportPortalItems]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.inventory-item')) return;
    setIsDraggingScroll(true);
    setStartY(e.pageY - (scrollRef.current?.offsetTop || 0));
    setStartScrollTop(scrollRef.current?.scrollTop || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingScroll || !scrollRef.current) return;
    e.preventDefault();
    const y = e.pageY - scrollRef.current.offsetTop;
    const walk = (y - startY) * 1.5;
    scrollRef.current.scrollTop = startScrollTop - walk;
  };

  const handleMouseUp = () => setIsDraggingScroll(false);

  const handleReturnToFortress = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReturning) return;
    setIsReturning(true);
    try {
      await returnToFortress();
      openFortressStorage('fortress');
    } finally {
      setIsReturning(false);
    }
  }, [isReturning, openFortressStorage, returnToFortress]);



  if (!isIntegratedStorageOpen) return null;

  const headerTitle = isPortalMode ? 'Kho Portal' : 'Kho Thành Trì';
  const headerIcon = isPortalMode ? '🌀' : '🏰';
  const borderColor = isPortalMode ? 'border-purple-500/30' : 'border-cyan-500/30';
  const accentColor = isPortalMode ? 'purple' : 'cyan';

  if (variant === 'inline') {
    return (
      <motion.div
        id="integrated-storage-panel"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`flex h-full min-h-0 flex-col overflow-hidden border-b ${borderColor} bg-[#050b14]/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${accentColor}-500/20 text-${accentColor}-400`}>
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  <span className="mr-1">{headerIcon}</span>{headerTitle}
                </h3>
                <p className={`text-[10px] font-bold text-${accentColor}-500/60 uppercase`}>Double-click để lấy đồ • Kéo để cuộn</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isPortalMode && (
                <StorageEdgeControls
                  isItemDragging={isItemDragging}
                  showFortressStorageButton={true}
                  showStorageEdgeControls={true}
                  setIsSheetExpanded={() => {}}
                  toggleIntegratedStorage={toggleIntegratedStorage}
                />
              )}
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
            className={`flex-1 min-h-0 overflow-y-auto subtle-scrollbar cursor-grab active:cursor-grabbing ${isDraggingScroll ? 'select-none' : ''} ${isTransporting ? 'pointer-events-none' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className={`flex justify-center p-4 transition-all duration-300 ${isTransporting ? 'grayscale opacity-50' : ''}`}>
              <InventoryGrid
                items={storageItems}
                bags={[VIRTUAL_STORAGE_BAG]}
                gridH={STORAGE_GRID_H}
                onItemLayoutChange={(newItems) => activeSave(newItems)}
                onItemDoubleClick={(item) => {
                  if (isTransporting) return;
                  storeItems([item.uid], 'retrieve', fortressStorageMode);
                }}
                onDropOutside={(item, e) => {
                  if (isTransporting) return;

                  if (e) {
                    const sellZone = document.getElementById('global-sell-zone');
                    if (sellZone) {
                      const sRect = sellZone.getBoundingClientRect();
                      if (
                        e.clientX >= sRect.left - 10 &&
                        e.clientX <= sRect.right + 10 &&
                        e.clientY >= sRect.top - 10 &&
                        e.clientY <= sRect.bottom + 10
                      ) {
                        sellItems([item.uid]);
                        return;
                      }
                    }
                    const backpack = document.getElementById('looter-backpack-container');
                    if (backpack) {
                      const rect = backpack.getBoundingClientRect();
                      if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                      ) {
                        storeItems([item.uid], 'retrieve', fortressStorageMode);
                        return;
                      }
                    }
                  }
                  activeSave([...activeItems]);
                }}
                onDragStateChange={(item) => setIsItemDragging(!!item)}
                cellSize={cellSize}
              />
            </div>
          </div>

          {isPortalMode && (
            <div className="border-t border-white/5 bg-black/25 px-4 py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleTransport}
                  disabled={!canTransport}
                  className={`flex items-center gap-2 rounded-b-xl border-x border-b px-4 py-2 text-xs font-black uppercase tracking-widest shadow-lg transition-all duration-200 ${
                    canTransport
                      ? 'border-emerald-400/40 bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_10px_28px_rgba(16,185,129,0.35)]'
                      : 'border-white/10 bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  {isTransporting ? 'Đang vận chuyển...' : 'Vận chuyển'}
                </button>

                <button
                  type="button"
                  onClick={handleReturnToFortress}
                  disabled={isReturning}
                  className="flex items-center gap-2 rounded-b-xl border-x border-b border-amber-400/40 bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-black shadow-[0_10px_28px_rgba(245,158,11,0.35)] transition-colors hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70"
                >
                  <Home className="h-4 w-4" />
                  {isReturning ? 'Đang về...' : 'Về Thành Trì'}
                </button>
              </div>

              {isTransporting && (
                <div className="mt-3 w-full overflow-hidden rounded-full bg-black/60 border border-emerald-500/30">
                  <motion.div
                    className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                    style={{ width: `${transportProgress}%` }}
                  />
                  <p className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
                    {Math.floor(transportProgress)}%
                  </p>
                </div>
              )}

              {!isTransporting && (state.portalStorage || []).length > 0 && (
                <div className="mt-3 flex flex-col items-center gap-0.5 rounded-lg bg-black/60 px-3 py-1 backdrop-blur-sm">
                  <p className="text-[10px] font-bold text-yellow-400">
                    Phí: {transportFee}G (5%)
                  </p>
                  <p className="text-[9px] font-bold text-red-400/80">
                    ⚠ 25% tỷ lệ mất đồ khi vận chuyển
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Global Transparent Overlay - Only covers top part (Map) to allow backpack interaction */}
      <div 
        className="fixed inset-x-0 top-0 z-[190] bg-black/40 backdrop-blur-[2px] pointer-events-auto" 
        onClick={() => setIsIntegratedStorageOpen(false)}
      />

      <AnimatePresence>
        <motion.div
          id="integrated-storage-panel"
          initial={{ y: -400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -400, opacity: 0 }}
          className={`fixed inset-x-0 top-0 z-[400] h-[40vh] border-b ${borderColor} bg-[#050b14]/95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto h-full max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${accentColor}-500/20 text-${accentColor}-400`}>
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  <span className="mr-1">{headerIcon}</span>{headerTitle}
                </h3>
                <p className={`text-[10px] font-bold text-${accentColor}-500/60 uppercase`}>Double-click để lấy đồ • Kéo để cuộn</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isPortalMode && (
                <StorageEdgeControls
                  isItemDragging={isItemDragging}
                  showFortressStorageButton={true}
                  showStorageEdgeControls={true}
                  setIsSheetExpanded={() => {}}
                  toggleIntegratedStorage={toggleIntegratedStorage}
                />
              )}
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
            className={`h-[calc(40vh-56px)] overflow-y-auto subtle-scrollbar cursor-grab active:cursor-grabbing ${isDraggingScroll ? 'select-none' : ''} ${isTransporting ? 'pointer-events-none' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className={`flex justify-center p-4 transition-all duration-300 ${isTransporting ? 'grayscale opacity-50' : ''}`}>
              <InventoryGrid
                items={storageItems}
                bags={[VIRTUAL_STORAGE_BAG]}
                gridH={STORAGE_GRID_H}
                onItemLayoutChange={(newItems) => activeSave(newItems)}
                onItemDoubleClick={(item) => {
                  if (isTransporting) return;
                  storeItems([item.uid], 'retrieve', fortressStorageMode);
                }}
                onDropOutside={(item, e) => {
                  if (isTransporting) return;
                  
                  if (e) {
                    const sellZone = document.getElementById('global-sell-zone');
                    if (sellZone) {
                      const sRect = sellZone.getBoundingClientRect();
                      if (
                        e.clientX >= sRect.left - 10 &&
                        e.clientX <= sRect.right + 10 &&
                        e.clientY >= sRect.top - 10 &&
                        e.clientY <= sRect.bottom + 10
                      ) {
                        sellItems([item.uid]);
                        return;
                      }
                    }
                    const backpack = document.getElementById('looter-backpack-container');
                    if (backpack) {
                      const rect = backpack.getBoundingClientRect();
                      if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                      ) {
                        storeItems([item.uid], 'retrieve', fortressStorageMode);
                        return;
                      }
                    }
                  }
                  activeSave([...activeItems]); 
                }}
                onDragStateChange={(item) => setIsItemDragging(!!item)}
                cellSize={cellSize}
              />

            </div>


          </div>
          </div>
        </motion.div>

        {/* Portal-specific: Transport button + Return button */}
        {isPortalMode && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="fixed left-1/2 top-[40vh] z-[410] flex -translate-x-1/2 flex-col items-center gap-1"
          >
            {/* Transport button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTransport}
                disabled={!canTransport}
                className={`flex items-center gap-2 rounded-b-xl border-x border-b px-4 py-2 text-xs font-black uppercase tracking-widest shadow-lg transition-all duration-200 ${
                  canTransport
                    ? 'border-emerald-400/40 bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_10px_28px_rgba(16,185,129,0.35)]'
                    : 'border-white/10 bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Truck className="h-4 w-4" />
                {isTransporting ? 'Đang vận chuyển...' : 'Vận chuyển'}
              </button>

              <button
                type="button"
                onClick={handleReturnToFortress}
                disabled={isReturning}
                className="flex items-center gap-2 rounded-b-xl border-x border-b border-amber-400/40 bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-black shadow-[0_10px_28px_rgba(245,158,11,0.35)] transition-colors hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70"
              >
                <Home className="h-4 w-4" />
                {isReturning ? 'Đang về...' : 'Về Thành Trì'}
              </button>
            </div>

            {/* Transport progress bar */}
            {isTransporting && (
              <div className="w-64 overflow-hidden rounded-full bg-black/60 border border-emerald-500/30">
                <motion.div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  style={{ width: `${transportProgress}%` }}
                />
                <p className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
                  {Math.floor(transportProgress)}%
                </p>
              </div>
            )}

            {/* Fee + risk info */}
            {!isTransporting && (state.portalStorage || []).length > 0 && (
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-black/60 px-3 py-1 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-yellow-400">
                  Phí: {transportFee}G (5%)
                </p>
                <p className="text-[9px] font-bold text-red-400/80">
                  ⚠ 25% tỷ lệ mất đồ khi vận chuyển
                </p>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </>
  );
}
