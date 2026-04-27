import React, { useMemo, useState } from 'react';
import { X, Database, Package, Sparkles, ArrowRightLeft, Anchor } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { MAX_GRID_W } from './constants';
import { useSeaGame } from '../SeaGameProvider';
import type { SeaItem } from './types';

const PORTAL_FEE_RATE = 0.05;

const formatItemTooltip = (item: SeaItem) =>
  `${item.name}\n⚔ ${item.weight || 0} DMG | ❤ +${item.hpBonus || 0} HP\n⚡ +${item.energyMax || 0} EN | ✦ +${item.energyRegen || 0} Regen\n💰 ${item.price || 0} vang | ${item.gridW}x${item.gridH}`;

export default function FortressStorageModal() {
  const {
    state,
    isFortressStorageOpen,
    setIsFortressStorageOpen,
    fortressStorageMode,
    openFortressStorage,
    returnToFortress,
    saveInventory,
    storeItems,
  } = useSeaGame();
  const [dragging, setDragging] = useState<{ uid: string; source: 'inventory' | 'storage' } | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  const isPortalMode = fortressStorageMode === 'portal';
  const backpackItems = useMemo(() => state.inventory, [state.inventory]);
  const storageItems = state.storage;

  if (!isFortressStorageOpen) return null;

  const handleTransferItem = async (item: SeaItem, source: 'inventory' | 'storage') => {
    if (source === 'inventory') {
      await storeItems([item.uid], 'store', fortressStorageMode);
    } else {
      if (isPortalMode) return;
      await storeItems([item.uid], 'retrieve', 'fortress');
    }
  };

  const handleDropToStorage = async () => {
    if (!dragging || dragging.source !== 'inventory') return;
    await storeItems([dragging.uid], 'store', fortressStorageMode);
    setDragging(null);
  };

  const handleDropToInventory = async () => {
    if (!dragging || dragging.source !== 'storage' || isPortalMode) return;
    await storeItems([dragging.uid], 'retrieve', 'fortress');
    setDragging(null);
  };

  const handleReturnToFortress = async () => {
    setIsReturning(true);
    try {
      await returnToFortress();
      openFortressStorage('fortress');
    } finally {
      setIsReturning(false);
    }
  };

  const portalFeeForItem = (item: SeaItem) => Math.max(1, Math.ceil((item.price || 0) * PORTAL_FEE_RATE));

  const Column = ({
    title,
    icon,
    items,
    source,
    onDrop,
    allowDrop,
    caption,
  }: {
    title: string;
    icon: React.ReactNode;
    items: SeaItem[];
    source: 'inventory' | 'storage';
    onDrop: () => void;
    allowDrop: boolean;
    caption: string;
  }) => (
    <div
      onDragOver={(e) => {
        if (!allowDrop) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!allowDrop) return;
        e.preventDefault();
        void onDrop();
      }}
      className={`flex flex-1 flex-col rounded-2xl border p-3 transition-colors ${allowDrop && dragging ? 'border-cyan-400/60 bg-cyan-950/20' : 'border-cyan-900/30 bg-[#08131d]'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
          {icon}
          {title}
        </div>
        <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{items.length} items</span>
      </div>

      <p className="mb-3 text-[11px] text-cyan-100/65">{caption}</p>

      <div 
        className="subtle-scrollbar grid grid-cols-7 gap-[1px] overflow-y-auto rounded-xl border-2 border-[rgba(30,60,90,0.4)] bg-[#060d17] p-1 mx-auto"
        style={{ width: "fit-content", maxHeight: "400px" }}
      >
        {items.map((item) => (
          <button
            key={item.uid}
            type="button"
            draggable
            onDragStart={() => setDragging({ uid: item.uid, source })}
            onDragEnd={() => setDragging(null)}
            onDoubleClick={() => handleTransferItem(item, source)}
            title={formatItemTooltip(item)}
            className="flex aspect-square w-[40px] h-[40px] items-center justify-center border border-[rgba(25,45,65,0.3)] bg-[rgba(8,12,20,0.6)] text-2xl transition-all hover:scale-[1.04] hover:border-cyan-500/60 z-10"
          >
            <span className="leading-none">{item.icon}</span>
          </button>
        ))}
        {Array.from({ length: Math.max(0, 168 - items.length) }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="aspect-square w-[40px] h-[40px] border border-[rgba(25,45,65,0.3)] bg-[rgba(8,12,20,0.6)]" 
          />
        ))}
      </div>
    </div>
  );

  const InventoryPanel = () => {
    const allowRetrieveDrop = dragging?.source === 'storage' && !isPortalMode;

    return (
      <div
        onDragOver={(e) => {
          if (!allowRetrieveDrop) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (!allowRetrieveDrop) return;
          e.preventDefault();
          void handleDropToInventory();
        }}
        className={`flex flex-1 flex-col rounded-2xl border p-3 transition-colors ${
          allowRetrieveDrop ? 'border-cyan-400/60 bg-cyan-950/20' : 'border-cyan-900/30 bg-[#08131d]'
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
            <Package className="h-4 w-4" />
            Hom do tren thuyen
          </div>
          <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{backpackItems.length} items</span>
        </div>

        <p className="mb-3 text-[11px] text-cyan-100/65">
          Sap xep va lap item tren grid. Keo item tu dai ben duoi sang kho de cat.
        </p>

        <div className="rounded-xl border border-cyan-950/60 bg-[#050b12] p-2">
          <InventoryGrid
            items={state.inventory}
            bags={state.bags}
            onItemLayoutChange={(newItems) => saveInventory(newItems)}
            onItemDoubleClick={(item) => handleTransferItem(item, 'inventory')}
            cellSize={Math.min(40, (window.innerWidth - 96) / MAX_GRID_W)}
          />
        </div>

        <div className="mt-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">Cat nhanh vao kho</div>
          <div className="subtle-scrollbar flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-xl border border-cyan-950/60 bg-[#050b12] p-2">
            {backpackItems.map((item) => (
              <button
                key={item.uid}
                type="button"
                draggable
                onDragStart={() => setDragging({ uid: item.uid, source: 'inventory' })}
                onDragEnd={() => setDragging(null)}
                onDoubleClick={() => handleTransferItem(item, 'inventory')}
                title={formatItemTooltip(item)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-900/40 bg-[#0d2137] text-xl transition-all hover:scale-[1.04] hover:border-cyan-500/60"
              >
                <span className="leading-none">{item.icon}</span>
              </button>
            ))}
            {backpackItems.length === 0 && (
              <div className="w-full py-3 text-center text-xs italic text-gray-500">Trong</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center lg:p-4 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col bg-[#040b12] text-white w-full h-full lg:w-1/3 lg:h-3/4 lg:rounded-3xl lg:border lg:border-cyan-900/50 lg:shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-cyan-800/30 bg-[#0a1929] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wide text-cyan-400">
            {isPortalMode ? <Sparkles className="h-5 w-5" /> : <Database className="h-5 w-5" />}
            {isPortalMode ? 'Cong Portal' : 'Kho Thanh Tri'}
          </h2>
          <p className="mt-1 text-[11px] text-cyan-100/65">
            {isPortalMode ? 'Nhanh dup mon do de gui vao kho tu xa.' : 'Nhanh dup mon do de chuyen qua lai giua thuyen va kho.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPortalMode && (
            <button
              type="button"
              onClick={() => { void handleReturnToFortress(); }}
              disabled={isReturning}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-black text-emerald-100 transition-colors hover:bg-emerald-900/40 disabled:cursor-wait disabled:opacity-60"
            >
              <Anchor className="h-4 w-4" />
              {isReturning ? 'Dang ve...' : 'Ve thanh'}
            </button>
          )}
          <button
            onClick={() => setIsFortressStorageOpen(false)}
            className="rounded-full p-2 transition-colors hover:bg-white/10"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {isPortalMode && (
          <div className="mb-4 rounded-2xl border border-violet-500/30 bg-violet-950/20 px-4 py-3 text-[11px] text-violet-100/80">
            Phi portal: 5% gia tri mon do, lam tron len tung mon. Che do portal chi gui vao kho, khong lay ra tu xa.
          </div>
        )}

        <div className="mb-4 flex items-center justify-center gap-2 text-cyan-300/70">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-[0.24em]">
            {isPortalMode ? 'Nhan nhap dup vao mon do ben trai' : 'Nhap dup vao mon do de chuyen nhanh'}
          </span>
        </div>

        <div className="flex flex-col-reverse lg:grid flex-1 gap-4 lg:grid-cols-2">
          <InventoryPanel />

          <Column
            title={isPortalMode ? 'Kho portal' : 'Kho thanh tri'}
            icon={isPortalMode ? <Sparkles className="h-4 w-4" /> : <Database className="h-4 w-4" />}
            items={storageItems}
            source="storage"
            onDrop={handleDropToStorage}
            allowDrop={dragging?.source === 'inventory'}
            caption={isPortalMode ? 'Tha vao day de cat tru qua cong portal.' : 'Tha vao day de cat, keo nguoc lai de lay ra.'}
          />
        </div>

        {isPortalMode && dragging?.source === 'inventory' && (
          <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 text-xs text-violet-100/80">
            {(() => {
              const item = backpackItems.find((entry) => entry.uid === dragging.uid);
              return item ? `Dang keo ${item.name}. Phi gui: ${portalFeeForItem(item)} vang.` : 'Dang keo item.';
            })()}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
