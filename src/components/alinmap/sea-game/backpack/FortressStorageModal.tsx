import React, { useCallback, useEffect, useState } from 'react';
import { X, Database, Package, Sparkles, Anchor } from 'lucide-react';
import InventoryGrid from './InventoryGrid';
import { MAX_GRID_W } from './constants';
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
  shape: Array.from({ length: STORAGE_GRID_H }, () => Array(STORAGE_GRID_W).fill(true)),
  cells: STORAGE_GRID_W * STORAGE_GRID_H,
};

const buildStorageItems = (storage: SeaItem[]) => {
  const current = storage.map((item) => ({ ...item }));
  const occ = Array.from({ length: STORAGE_GRID_H }, () => Array(STORAGE_GRID_W).fill(false));

  current.forEach((item) => {
    if (item.gridX >= 0) {
      for (let r = 0; r < item.gridH; r += 1) {
        for (let c = 0; c < item.gridW; c += 1) {
          if (item.gridY + r < STORAGE_GRID_H && item.gridX + c < STORAGE_GRID_W) {
            occ[item.gridY + r][item.gridX + c] = true;
          }
        }
      }
    }
  });

  return current.map((item) => {
    if (item.gridX < 0) {
      for (let r = 0; r <= STORAGE_GRID_H - item.gridH; r += 1) {
        for (let c = 0; c <= STORAGE_GRID_W - item.gridW; c += 1) {
          let canFit = true;
          for (let ir = 0; ir < item.gridH; ir += 1) {
            for (let ic = 0; ic < item.gridW; ic += 1) {
              if (occ[r + ir][c + ic]) {
                canFit = false;
                break;
              }
            }
            if (!canFit) break;
          }

          if (canFit) {
            const placed = { ...item, gridX: c, gridY: r };
            for (let ir = 0; ir < item.gridH; ir += 1) {
              for (let ic = 0; ic < item.gridW; ic += 1) {
                occ[r + ir][c + ic] = true;
              }
            }
            return placed;
          }
        }
      }
    }
    return item;
  });
};

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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoverTarget, setHoverTarget] = useState<'inventory' | 'storage' | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  const storageItems = buildStorageItems(state.storage);
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

  const handleMoveToStorage = useCallback(async (item: SeaItem, x: number, y: number) => {
    await storeItems([item.uid], 'store', fortressStorageMode, x, y);
  }, [storeItems, fortressStorageMode]);

  const handleMoveToInventory = useCallback(async (item: SeaItem, x: number, y: number) => {
    await storeItems([item.uid], 'retrieve', fortressStorageMode, x, y);
  }, [storeItems, fortressStorageMode]);

  if (!isFortressStorageOpen) return null;

  const StoragePanel = () => (
    <div className={`flex flex-1 flex-col rounded-2xl border ${hoverTarget === 'storage' ? 'border-cyan-400 bg-cyan-950/20' : 'border-cyan-900/30 bg-[#08131d]'} p-3 transition-colors`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
          {isPortalMode ? <Sparkles className="h-4 w-4" /> : <Database className="h-4 w-4" />}
          {isPortalMode ? 'Kho Portal' : 'Kho Thành Trì'}
        </div>
        <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{storageItems.length} items</span>
      </div>

      <div
        className="rounded-xl border border-cyan-950/60 bg-[#050b12] p-2 flex-1 overflow-hidden relative group"
        onPointerEnter={() => setHoverTarget('storage')}
        onPointerLeave={() => {
          if (dragSource) setHoverTarget(null);
        }}
      >
        <div className="h-full overflow-y-auto subtle-scrollbar pr-1" style={{ maxHeight: '400px' }}>
          <InventoryGrid
            items={storageItems}
            bags={[VIRTUAL_STORAGE_BAG]}
            gridH={STORAGE_GRID_H}
            hideStorage
            onItemLayoutChange={(newItems) => saveStorage(newItems)}
            onHoverCellChange={(cell) => {
              setHoverCell(cell);
              if (cell) setHoverTarget('storage');
            }}
            onDragStart={(item, src, offset) => {
              setDragItem(item);
              setDragSource(src);
              setDragOffset(offset);
            }}
            onDragEnd={() => {
                setDragItem(null);
                setDragSource(null);
            }}
            onExternalDrop={handleMoveToStorage}
            externalDragItem={dragSource === 'inventory' ? dragItem : null}
            externalDragOffset={dragSource === 'inventory' ? dragOffset : null}
            externalHoverCell={dragSource === 'inventory' ? hoverCell : null}
            cellSize={38}
          />
        </div>
      </div>
    </div>
  );

  const InventoryPanel = () => (
    <div className={`flex flex-1 flex-col rounded-2xl border ${hoverTarget === 'inventory' ? 'border-cyan-400 bg-cyan-950/20' : 'border-cyan-900/30 bg-[#08131d]'} p-3 transition-colors`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-300">
          <Package className="h-4 w-4" />
          Hòm Đồ Thuyền
        </div>
        <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{state.inventory.length} items</span>
      </div>

      <div
        className="rounded-xl border border-cyan-950/60 bg-[#050b12] p-2"
        onPointerEnter={() => setHoverTarget('inventory')}
        onPointerLeave={() => {
          if (dragSource) setHoverTarget(null);
        }}
      >
        <InventoryGrid
          items={state.inventory}
          bags={state.bags}
          hideStorage
          onItemLayoutChange={(newItems) => saveInventory(newItems)}
          onHoverCellChange={(cell) => {
            setHoverCell(cell);
            if (cell) setHoverTarget('inventory');
          }}
          onDragStart={(item, src, offset) => {
            setDragItem(item);
            setDragSource(src);
            setDragOffset(offset);
          }}
          onDragEnd={() => {
              setDragItem(null);
              setDragSource(null);
          }}
          onExternalDrop={handleMoveToInventory}
          externalDragItem={dragSource === 'storage' ? dragItem : null}
          externalDragOffset={dragSource === 'storage' ? dragOffset : null}
          externalHoverCell={dragSource === 'storage' ? hoverCell : null}
          cellSize={38}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm lg:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-[#040b12] text-white lg:h-3/4 lg:w-1/3 lg:rounded-3xl lg:border lg:border-cyan-900/50 lg:shadow-2xl">
        <div className="flex items-center justify-between border-b border-cyan-800/30 bg-[#0a1929] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-wide text-cyan-400">
              {isPortalMode ? <Sparkles className="h-5 w-5" /> : <Database className="h-5 w-5" />}
              {isPortalMode ? 'Cổng Portal' : 'Kho Thành Trì'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isPortalMode && (
              <button
                type="button"
                onClick={() => {
                  void handleReturnToFortress();
                }}
                disabled={isReturning}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-black text-emerald-100 transition-colors hover:bg-emerald-900/40 disabled:cursor-wait disabled:opacity-60"
              >
                <Anchor className="h-4 w-4" />
                {isReturning ? 'Đang về...' : 'Về thành'}
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
          <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-2">
            <InventoryPanel />
            <StoragePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
