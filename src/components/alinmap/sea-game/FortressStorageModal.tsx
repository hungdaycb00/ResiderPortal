import React, { useMemo, useState } from 'react';
import { X, Database, Package, Sparkles, ArrowRightLeft } from 'lucide-react';
import { useSeaGame, SeaItem } from './SeaGameProvider';

const PORTAL_FEE_RATE = 0.05;

const formatItemTooltip = (item: SeaItem) =>
  `${item.name}\n⚔ ${item.weight || 0} DMG | ❤ +${item.hpBonus || 0} HP\n⚡ +${item.energyMax || 0} EN | ✦ +${item.energyRegen || 0} Regen\n💰 ${item.price || 0} vang | ${item.gridW}x${item.gridH}`;

export default function FortressStorageModal() {
  const {
    state,
    isFortressStorageOpen,
    setIsFortressStorageOpen,
    fortressStorageMode,
    storeItems,
  } = useSeaGame();
  const [dragging, setDragging] = useState<{ uid: string; source: 'inventory' | 'storage' } | null>(null);

  const isPortalMode = fortressStorageMode === 'portal';
  const backpackItems = useMemo(() => state.inventory.filter((item) => item.gridX >= 0), [state.inventory]);
  const storageItems = state.storage;

  if (!isFortressStorageOpen) return null;

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
      className={`flex min-h-[360px] flex-col rounded-2xl border p-3 transition-colors ${allowDrop && dragging ? 'border-cyan-400/60 bg-cyan-950/20' : 'border-cyan-900/30 bg-[#08131d]'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
          {icon}
          {title}
        </div>
        <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{items.length} items</span>
      </div>

      <p className="mb-3 text-[11px] text-cyan-100/65">{caption}</p>

      <div className="subtle-scrollbar grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-cyan-950/60 bg-[#050b12] p-2 sm:grid-cols-5">
        {items.map((item) => (
          <button
            key={item.uid}
            type="button"
            draggable
            onDragStart={() => setDragging({ uid: item.uid, source })}
            onDragEnd={() => setDragging(null)}
            title={formatItemTooltip(item)}
            className="flex aspect-square items-center justify-center rounded-xl border border-cyan-900/40 bg-[#0d2137] text-2xl transition-all hover:scale-[1.04] hover:border-cyan-500/60"
          >
            <span className="leading-none">{item.icon}</span>
          </button>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs italic text-gray-500">
            Trong
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#040b12] text-white">
      <div className="flex items-center justify-between border-b border-cyan-800/30 bg-[#0a1929] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wide text-cyan-400">
            {isPortalMode ? <Sparkles className="h-5 w-5" /> : <Database className="h-5 w-5" />}
            {isPortalMode ? 'Cong Portal' : 'Kho Thanh Tri'}
          </h2>
          <p className="mt-1 text-[11px] text-cyan-100/65">
            {isPortalMode ? 'Keo item tu hom do tren thuyen sang kho de cat tru.' : 'Keo item qua lai giua thuyen va kho.'}
          </p>
        </div>
        <button
          onClick={() => setIsFortressStorageOpen(false)}
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X className="h-6 w-6 text-gray-400" />
        </button>
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
            {isPortalMode ? 'Keo tu trai sang phai' : 'Keo qua lai giua hai ben'}
          </span>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-2">
          <Column
            title="Hom do tren thuyen"
            icon={<Package className="h-4 w-4" />}
            items={backpackItems}
            source="inventory"
            onDrop={handleDropToInventory}
            allowDrop={!isPortalMode && dragging?.source === 'storage'}
            caption="Vat pham dang mang theo."
          />

          <Column
            title={isPortalMode ? 'Kho portal' : 'Kho do'}
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
  );
}
