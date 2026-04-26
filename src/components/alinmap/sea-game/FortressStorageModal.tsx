import React, { useMemo } from 'react';
import { X, ArrowDown, Database, Package, Sparkles } from 'lucide-react';
import { useSeaGame, SeaItem, BagItem } from './SeaGameProvider';
import InventoryGridV2 from './InventoryGridV2';

const PORTAL_FEE_RATE = 0.05;

export default function FortressStorageModal() {
  const {
    state,
    isFortressStorageOpen,
    setIsFortressStorageOpen,
    fortressStorageMode,
    storeItems,
    saveStorage,
  } = useSeaGame();

  const isPortalMode = fortressStorageMode === 'portal';
  const activeBag = state.bags[0];
  const storageWidth = Math.max(3, activeBag?.width || 3);
  const storageCells = Math.max(storageWidth, (activeBag?.cells || 9) * 4);
  const storageHeight = Math.max(activeBag?.height || 3, Math.ceil(storageCells / storageWidth));

  const storageBag: BagItem = useMemo(() => ({
    uid: 'storage_fortress',
    id: 'storage_fortress',
    name: isPortalMode ? 'Portal Kho Do' : 'Kho Thanh Tri',
    icon: isPortalMode ? '🌀' : '🏰',
    rarity: 'legendary',
    gridX: 0,
    gridY: 0,
    rotated: false,
    shape: Array.from({ length: storageHeight }, () => Array(storageWidth).fill(true)),
    width: storageWidth,
    height: storageHeight,
    cells: storageCells,
  }), [isPortalMode, storageCells, storageHeight, storageWidth]);

  if (!isFortressStorageOpen) return null;

  const backpackItems = state.inventory.filter((item) => item.gridX >= 0);
  const portalFeeForItem = (item: SeaItem) => Math.max(1, Math.ceil((item.price || 0) * PORTAL_FEE_RATE));

  const handleSendToStorage = async (item: SeaItem) => {
    await storeItems([item.uid], 'store', fortressStorageMode);
  };

  const handleRetrieveToBackpack = async (item: SeaItem) => {
    if (isPortalMode) return;
    await storeItems([item.uid], 'retrieve', 'fortress');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#040b12] text-white">
      <div className="flex items-center justify-between border-b border-cyan-800/30 bg-[#0a1929] p-4">
        <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wide text-cyan-400">
          {isPortalMode ? <Sparkles className="h-5 w-5" /> : <Database className="h-5 w-5" />}
          {isPortalMode ? 'Portal Kho Do' : 'Kho Do Thanh Tri'}
        </h2>
        <button
          onClick={() => setIsFortressStorageOpen(false)}
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X className="h-6 w-6 text-gray-400" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <div className={`rounded-xl border p-3 shadow-lg ${isPortalMode ? 'border-violet-700/40 bg-violet-950/30' : 'border-cyan-800/30 bg-[#0a1929]'}`}>
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isPortalMode ? 'text-violet-300' : 'text-cyan-300'}`}>
            {isPortalMode ? 'Ket Noi Portal' : 'Kho Trung Tam'}
          </p>
          <p className="mt-1 text-xs text-gray-300">
            {isPortalMode
              ? 'Thuyen co the gui do ve kho tu xa. Phi moi mon = 5% gia, lam tron len.'
              : 'Dang o thanh tri nen ban co the cat va lay do mien phi.'}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-cyan-800/30 bg-[#0a1929] p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
              <Package className="h-4 w-4" /> Balo cua ban ({backpackItems.length})
            </h3>
            <span className="text-[10px] text-gray-400">
              {isPortalMode ? 'Bam de gui qua portal' : 'Bam de cat vao kho'}
              <ArrowDown className="ml-1 inline h-3 w-3 text-emerald-400" />
            </span>
          </div>

          <div className="subtle-scrollbar flex gap-2 overflow-x-auto pb-2">
            {backpackItems.map((item) => (
              <button
                key={item.uid}
                onClick={() => handleSendToStorage(item)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-900/50 bg-[#0d2137] text-2xl transition-all hover:bg-[#122b46] active:scale-95"
                title={isPortalMode ? `${item.name} - Phi portal: ${portalFeeForItem(item)} vang` : `${item.name} - Cat vao kho`}
              >
                <span className="leading-none">{item.icon}</span>
              </button>
            ))}
            {backpackItems.length === 0 && (
              <div className="w-full py-3 text-center text-xs italic text-gray-500">
                Balo dang trong
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-cyan-900/30 bg-[#06111a] p-2 shadow-inner">
          <div className="mb-2 mt-1 text-center">
            <span className="rounded-full bg-amber-900/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-500/80">
              Suc chua toi da: {storageBag.cells} o • ngang {storageWidth} • doc {storageHeight}
            </span>
          </div>

          <div className="subtle-scrollbar flex flex-1 flex-col items-center overflow-y-auto pb-8">
            <InventoryGridV2
              items={state.storage}
              bags={[storageBag]}
              gridW={storageWidth}
              gridH={storageHeight}
              cellSize={Math.min(44, (window.innerWidth - 64) / storageWidth)}
              onItemLayoutChange={(newStorage) => saveStorage(newStorage)}
              onItemDoubleClick={isPortalMode ? undefined : handleRetrieveToBackpack}
            />
          </div>

          {isPortalMode && (
            <div className="border-t border-violet-900/30 px-3 py-2 text-center text-[11px] text-violet-200/80">
              Che do portal chi cho phep gui do ve kho. Muon lay do ra balo, hay quay ve thanh tri.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
