import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Swords, Coins, Heart, Zap, Wind, ChevronDown } from 'lucide-react';
import { useLooterGame } from '../../../looter-game/LooterGameContext';
import { getBagBonuses, MAX_GRID_W, MAX_GRID_H, InventoryGrid } from '../../../looter-game/backpack';
import type { LooterItem, BagItem } from '../../../looter-game/backpack';
import ItemPopup from '../../../looter-game/backpack/components/ItemPopup';
import { isItemFullyInsideBag } from '../../../looter-game/utils/looterHelpers';

const BAG_SLOT_RARITY: Record<string, string> = {
  common: 'border-sky-500/40 bg-sky-950/20 text-sky-200',
  uncommon: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200',
  rare: 'border-amber-500/40 bg-amber-950/20 text-amber-200',
  legendary: 'border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-200',
};

const formatBagTooltip = (bag: any) =>
  `${bag?.name || 'Balo'}\n⚔ ${bag?.weight || 0} DMG | ❤ +${bag?.hpBonus || 0} HP\n⚡ +${bag?.energyMax || 0} EN | ✦ +${bag?.energyRegen || 0} Regen\n💰 ${bag?.price || 0} vang | ${(bag?.width || 3)}x${(bag?.height || 3)} | ${Math.max(9, bag?.cells || 9)} o`;

interface BackpackViewProps {
  onEnterWorld?: () => void;
  readOnly?: boolean;
}

const BackpackView: React.FC<BackpackViewProps> = ({ onEnterWorld, readOnly = false }) => {
  const {
    state, saveInventory, saveBags, equipBag, dropItems,
    isIntegratedStorageOpen,
    fortressStorageMode,
    storeItems, encounter, isMoving, setIsItemDragging, sellItems
  } = useLooterGame();
  const [isHoveringBagSlot, setIsHoveringBagSlot] = useState(false);
  const [draggingItem, setDraggingItem] = useState<LooterItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<LooterItem | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  const activeBag = Array.isArray(state.bags) ? state.bags[0] : undefined;
  const bagStats = getBagBonuses(activeBag);

  const isMobileViewport = window.innerWidth < 768;
  const cellSize = Math.min(42, (window.innerWidth - 10) / MAX_GRID_W);

  const memoizedSaveInventory = React.useCallback((newItems: LooterItem[]) => {
    saveInventory(newItems);
  }, [saveInventory]);

  const totalStats = useMemo(() => {
    if (!activeBag) return { hp: 0, weight: 0, energyMax: 0, regen: 0 };

    return state.inventory.filter((item) => item.gridX >= 0 && isItemFullyInsideBag(item, activeBag)).reduce(
      (acc, item) => ({
        hp: acc.hp + (item.hpBonus || 0),
        weight: acc.weight + (item.weight || 0),
        energyMax: acc.energyMax + (item.energyMax || 0),
        regen: acc.regen + (item.energyRegen || 0),
      }),
      { hp: bagStats.hp, weight: bagStats.weight, energyMax: bagStats.energyMax, regen: bagStats.regen }
    );
  }, [state.inventory, activeBag, bagStats]);

  const dynamicGridH = useMemo(() => {
    const headerHeight = 48;
    const bottomNavHeight = window.innerWidth < 768 ? 96 : 0;
    const availableHeight = window.innerHeight - headerHeight - bottomNavHeight;
    return Math.max(MAX_GRID_H, Math.floor(availableHeight / cellSize));
  }, [cellSize]);

  const lastPosRef = useRef({ lat: state.currentLat, lng: state.currentLng });
  const wasMovingRef = useRef(false);
  const lastMobileBagLayoutRef = useRef('');

  useEffect(() => {
    if (isMoving && !wasMovingRef.current) {
      (window as any).collapseLooterTab?.();
    }
    wasMovingRef.current = !!isMoving;
  }, [isMoving]);

  useEffect(() => {
    if (state.currentLat === null || state.currentLng === null) return;

    lastPosRef.current = { lat: state.currentLat, lng: state.currentLng };
  }, [state.currentLat, state.currentLng]);

  useEffect(() => {
    setIsItemDragging?.(!!draggingItem);
    return () => {
      if (draggingItem) setIsItemDragging?.(false);
    };
  }, [draggingItem, setIsItemDragging]);


  useEffect(() => {
    if (!isMobileViewport || !activeBag || activeBag.gridX < 0 || activeBag.gridY < 0) return;

    const targetX = Math.max(0, Math.floor((MAX_GRID_W - activeBag.width) / 2));
    const targetY = 0;
    if (activeBag.gridX === targetX && activeBag.gridY === targetY) return;

    const layoutKey = `${activeBag.uid}:${activeBag.gridX}:${activeBag.gridY}:${targetX}:${targetY}`;
    if (lastMobileBagLayoutRef.current === layoutKey) return;
    lastMobileBagLayoutRef.current = layoutKey;

    const dx = targetX - activeBag.gridX;
    const dy = targetY - activeBag.gridY;
    const nextBags = state.bags.map((bag, index) =>
      index === 0 ? { ...bag, gridX: targetX, gridY: targetY } : bag
    );
    const nextInventory = state.inventory.map((item) => {
      if (item.gridX < 0 || item.gridY < 0 || !isItemFullyInsideBag(item, activeBag)) return item;
      return { ...item, gridX: item.gridX + dx, gridY: item.gridY + dy };
    });

    void saveBags(nextBags);
    saveInventory(nextInventory);
  }, [isMobileViewport, activeBag, state.bags, state.inventory, saveBags, saveInventory]);

  useEffect(() => {
    if (!draggingItem || (draggingItem as any).type !== 'bag') {
      setIsHoveringBagSlot(false);
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const bagSlot = document.getElementById('header-bag-slot');
      if (bagSlot) {
        const rect = bagSlot.getBoundingClientRect();
        const isOver = (
          e.clientX >= rect.left - 10 &&
          e.clientX <= rect.right + 10 &&
          e.clientY >= rect.top - 10 &&
          e.clientY <= rect.bottom + 10
        );
        setIsHoveringBagSlot(isOver);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [draggingItem]);

  return (
    <div
      id="looter-backpack-container"
      className="flex h-full flex-col overflow-visible text-white relative bg-[#040911]"
      style={isMobileViewport ? { height: '45dvh' } : undefined}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/5 z-[150] relative">
        <div className="flex items-center gap-4">
          {/* Gold */}
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[12px] font-black text-amber-400">{(state.looterGold || 0).toLocaleString()}</span>
          </div>

          {/* HP */}
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[12px] font-black">{state.currentHp}</span>
          </div>

          {/* Energy */}
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[12px] font-black">{state.energyMax + totalStats.energyMax}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[12px] font-black">{state.moveSpeed}x</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Swords className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[12px] font-black">{totalStats.weight}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            id="header-bag-slot"
            className={`h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all shadow-lg ${(draggingItem as any)?.type === 'bag'
              ? isHoveringBagSlot
                ? 'scale-125 border-yellow-400 bg-yellow-400/20 ring-4 ring-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                : 'scale-110 border-cyan-400 bg-cyan-400/10 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : `${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`
              }`}
            onPointerEnter={() => setIsHoveringBagSlot(true)}
            onPointerLeave={() => setIsHoveringBagSlot(false)}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (activeBag) {
                setSelectedItem(activeBag as any);
                setPopupPos({ x: e.clientX, y: e.clientY });
              }
            }}
            title={formatBagTooltip(activeBag)}
            aria-label="Balo active"
          >
            <span className="text-xl leading-none">{activeBag?.icon || 'ðŸŽ’'}</span>
          </div>
          <button
            onClick={() => (window as any).collapseLooterTab?.()}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Balo active</p>
            <p className="text-[13px] font-black text-white/90 truncate">{activeBag?.name || 'Chưa có balo'}</p>
          </div>
          <div
            id="legacy-header-bag-slot"
            className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition-all shadow-lg ${(draggingItem as any)?.type === 'bag'
              ? isHoveringBagSlot
                ? 'scale-125 border-yellow-400 bg-yellow-400/20 ring-4 ring-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                : 'scale-110 border-cyan-400 bg-cyan-400/10 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : `${BAG_SLOT_RARITY[activeBag?.rarity || 'common'] || BAG_SLOT_RARITY.common}`
              }`}
            onPointerEnter={() => setIsHoveringBagSlot(true)}
            onPointerLeave={() => setIsHoveringBagSlot(false)}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (activeBag) {
                setSelectedItem(activeBag as any);
                setPopupPos({ x: e.clientX, y: e.clientY });
              }
            }}
            title={formatBagTooltip(activeBag)}
          >
            <span className="text-2xl leading-none">{activeBag?.icon || '🎒'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto subtle-scrollbar" data-immersive-scroll>
        <div className="w-full h-full">
          <InventoryGrid
            items={state.inventory}
            bags={state.bags}
            readOnly={readOnly || !!isMoving}
            onDragStateChange={setDraggingItem}
            onItemLayoutChange={readOnly ? undefined : memoizedSaveInventory}
            onItemDoubleClick={(item) => {
              setSelectedItem(null); // Force close popup
              if ((item as any).type === 'bag') {
                equipBag(item.uid);
              } else if (state.worldTier === -1 || fortressStorageMode === 'portal' || isIntegratedStorageOpen) {
                storeItems([item.uid], 'store', fortressStorageMode || 'fortress');
              }
            }}
            onDropOutside={(item, e) => {
              if (e) {
                // Check Global Sell Zone
                const sellZone = document.getElementById('global-sell-zone');
                if (sellZone) {
                  const sRect = sellZone.getBoundingClientRect();
                  if (
                    e.clientX >= sRect.left - 10 &&
                    e.clientX <= sRect.right + 10 &&
                    e.clientY >= sRect.top - 10 &&
                    e.clientY <= sRect.bottom + 10
                  ) {
                    if (sellItems) sellItems([item.uid]);
                    return;
                  }
                }

                const bagSlot = document.getElementById('header-bag-slot');
                if (bagSlot) {
                  const rect = bagSlot.getBoundingClientRect();
                  if (
                    e.clientX >= rect.left - 10 &&
                    e.clientX <= rect.right + 10 &&
                    e.clientY >= rect.top - 10 &&
                    e.clientY <= rect.bottom + 10
                  ) {
                    if ((item as any).type === 'bag') {
                      equipBag(item.uid);
                      setIsHoveringBagSlot(false);
                    }
                    return;
                  }
                }
              }

              if (isHoveringBagSlot && (item as any).type === 'bag') {
                equipBag(item.uid);
                setIsHoveringBagSlot(false);
                return;
              }

              if (state.currentLat && state.currentLng) {
                // Check if dropped into Integrated Storage Panel
                if (isIntegratedStorageOpen) {
                  const storagePanel = document.getElementById('integrated-storage-panel');
                  if (storagePanel && e) {
                    const rect = storagePanel.getBoundingClientRect();
                    if (
                      e.clientX >= rect.left &&
                      e.clientX <= rect.right &&
                      e.clientY >= rect.top &&
                      e.clientY <= rect.bottom
                    ) {
                      // Dropped into storage!
                      storeItems([item.uid], 'store', fortressStorageMode || 'fortress');
                      return;
                    }
                  }
                }

                // Otherwise drop to map
                dropItems([item.uid], state.currentLat, state.currentLng);
              }
            }}
            cellSize={cellSize}
            gridW={MAX_GRID_W}
            gridH={dynamicGridH}
          />
        </div>
      </div>

      {selectedItem && createPortal(
        <ItemPopup
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          style={{
            position: 'fixed',
            left: Math.max(10, Math.min(window.innerWidth - 230, popupPos.x - 100)),
            top: popupPos.y,
            zIndex: 9999,
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default BackpackView;
