import React, { useMemo, useState } from 'react';
import { X, Database, Package, Sparkles, ArrowRightLeft, Anchor } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { MAX_GRID_W, MAX_GRID_H } from './constants';
import { useSeaGame } from '../SeaGameProvider';
import type { SeaItem, BagItem } from './types';

const STORAGE_GRID_W = MAX_GRID_W;
const STORAGE_GRID_H = 24;

const VIRTUAL_STORAGE_BAG: BagItem = {
  uid: 'virtual_storage_bag',
  id: 'virtual_storage_bag',
  name: 'Kho Portal',
  icon: '🌀',
  rarity: 'common',
  width: STORAGE_GRID_W,
  height: STORAGE_GRID_H,
  gridX: 0,
  gridY: 0,
  rotated: false,
  shape: Array(STORAGE_GRID_H).fill(Array(STORAGE_GRID_W).fill(true)),
  cells: STORAGE_GRID_W * STORAGE_GRID_H,
};

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
    saveStorage,
    storeItems,
  } = useSeaGame();
  
  const [dragItem, setDragItem] = useState<SeaItem | null>(null);
  const [dragSource, setDragSource] = useState<'inventory' | 'storage' | null>(null);
  const [hoverTarget, setHoverTarget] = useState<'inventory' | 'storage' | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  if (!isFortressStorageOpen) return null;

  const isPortalMode = fortressStorageMode === 'portal';

  const handleReturnToFortress = async () => {
    setIsReturning(true);
    try {
      await returnToFortress();
      openFortressStorage('fortress');
    } finally {
      setIsReturning(false);
    }
  };

  // Ensure all storage items have grid coordinates for the UI
  const storageItems = useMemo(() => {
    let current = [...state.storage];
    const occ = Array.from({ length: STORAGE_GRID_H }, () => Array(STORAGE_GRID_W).fill(false));
    current.forEach(item => {
      if (item.gridX >= 0) {
        for (let r = 0; r < item.gridH; r++) {
          for (let c = 0; c < item.gridW; c++) {
            if (item.gridY + r < STORAGE_GRID_H && item.gridX + c < STORAGE_GRID_W) {
              occ[item.gridY + r][item.gridX + c] = true;
            }
          }
        }
      }
    });
    return current.map(item => {
      if (item.gridX < 0) {
        for (let r = 0; r <= STORAGE_GRID_H - item.gridH; r++) {
          for (let c = 0; c <= STORAGE_GRID_W - item.gridW; c++) {
            let canFit = true;
            for (let ir = 0; ir < item.gridH; ir++) {
              for (let ic = 0; ic < item.gridW; ic++) {
                if (occ[r + ir][c + ic]) { canFit = false; break; }
              }
              if (!canFit) break;
            }
            if (canFit) {
              item.gridX = c; item.gridY = r;
              for (let ir = 0; ir < item.gridH; ir++) {
                for (let ic = 0; ic < item.gridW; ic++) { occ[r + ir][c + ic] = true; }
              }
              return { ...item };
            }
          }
        }
      }
      return item;
    });
  }, [state.storage]);

  const portalFeeForItem = (item: SeaItem) => Math.max(1, Math.ceil((item.price || 0) * PORTAL_FEE_RATE));

  const handleGlobalPointerUp = async () => {
    if (!dragItem || !dragSource) return;
    const item = dragItem;
    const source = dragSource;
    const target = hoverTarget;
    const cell = hoverCell;

    setDragItem(null);
    setDragSource(null);
    setHoverTarget(null);
    setHoverCell(null);

    if (!target || !cell) return;

    if (source === 'inventory' && target === 'storage') {
      await storeItems([item.uid], 'store', fortressStorageMode, cell.x, cell.y);
    } else if (source === 'storage' && target === 'inventory') {
      if (isPortalMode) return;
      await storeItems([item.uid], 'retrieve', 'fortress', cell.x, cell.y);
    } else if (source === 'storage' && target === 'storage') {
      const newStorage = storageItems.map(i => i.uid === item.uid ? { ...i, gridX: cell.x, gridY: cell.y } : i);
      await saveStorage(newStorage);
    }
  };

  React.useEffect(() => {
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [dragItem, dragSource, hoverTarget, hoverCell]);

  const StoragePanel = () => {
    return (
      <div className="flex flex-1 flex-col rounded-2xl border border-cyan-900/30 bg-[#08131d] p-3 transition-colors">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
            {isPortalMode ? <Sparkles className="h-4 w-4" /> : <Database className="h-4 w-4" />}
            {isPortalMode ? 'Kho Portal' : 'Kho Thanh Tri'}
          </div>
          <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{storageItems.length} items</span>
        </div>

        <div className="rounded-xl border border-cyan-950/60 bg-[#050b12] p-2 flex-1 overflow-hidden" onPointerEnter={() => setHoverTarget('storage')}>
          <div className="h-full overflow-y-auto subtle-scrollbar" style={{ maxHeight: '400px' }}>
            <InventoryGrid
              items={storageItems}
              bags={[VIRTUAL_STORAGE_BAG]}
              gridH={STORAGE_GRID_H}
              hideStorage
              onItemLayoutChange={(newItems) => saveStorage(newItems)}
              onHoverCellChange={(c) => setHoverCell(c)}
              onDragStart={(item, src) => { setDragItem(item); setDragSource(src); }}
              externalDragItem={dragSource === 'inventory' ? dragItem : null}
              externalHoverCell={dragSource === 'inventory' ? hoverCell : null}
              cellSize={38}
            />
          </div>
        </div>
      </div>
    );
  };

  const InventoryPanel = () => {
    return (
      <div className="flex flex-1 flex-col rounded-2xl border border-cyan-900/30 bg-[#08131d] p-3 transition-colors">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
            <Package className="h-4 w-4" />
            Hom do thuyen
          </div>
          <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{state.inventory.length} items</span>
        </div>

        <div className="rounded-xl border border-cyan-950/60 bg-[#050b12] p-2" onPointerEnter={() => setHoverTarget('inventory')}>
          <InventoryGrid
            items={state.inventory}
            bags={state.bags}
            hideStorage
            onItemLayoutChange={(newItems) => saveInventory(newItems)}
            onHoverCellChange={(c) => setHoverCell(c)}
            onDragStart={(item, src) => { setDragItem(item); setDragSource(src); }}
            externalDragItem={dragSource === 'storage' ? dragItem : null}
            externalHoverCell={dragSource === 'storage' ? hoverCell : null}
            cellSize={38}
          />
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

        <div className="flex flex-col lg:grid flex-1 gap-4 lg:grid-cols-2">
          <InventoryPanel />
          <StoragePanel />
        </div>

        {isPortalMode && dragItem && dragSource === 'inventory' && (
          <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 text-xs text-violet-100/80">
            {`Dang keo ${dragItem.name}. Phi gui: ${portalFeeForItem(dragItem)} vang.`}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
