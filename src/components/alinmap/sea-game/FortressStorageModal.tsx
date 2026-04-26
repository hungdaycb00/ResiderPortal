import React, { useMemo } from 'react';
import { X, ArrowDown, Database, Package } from 'lucide-react';
import { useSeaGame, MAX_GRID_W, MAX_GRID_H, SeaItem, BagItem } from './SeaGameProvider';
import InventoryGridV2 from './InventoryGridV2';

export default function FortressStorageModal() {
  const { 
    state, isFortressStorageOpen, setIsFortressStorageOpen, 
    storeItems, saveStorage 
  } = useSeaGame();

  const storageBag: BagItem = useMemo(() => {
    return {
      uid: 'storage_fortress',
      id: 'storage_fortress',
      name: 'Kho Thành Trì',
      icon: '🏰',
      rarity: 'legendary',
      gridX: 0,
      gridY: 0,
      rotated: false,
      shape: Array.from({ length: MAX_GRID_H * 4 }, () => Array(MAX_GRID_W).fill(true)),
      width: MAX_GRID_W,
      height: MAX_GRID_H * 4,
      cells: MAX_GRID_W * MAX_GRID_H * 4,
    };
  }, []);

  if (!isFortressStorageOpen) return null;

  const backpackItems = state.inventory.filter(i => i.gridX >= 0);

  const handleSendToStorage = async (item: SeaItem) => {
    await storeItems([item.uid], 'store');
  };

  const handleRetrieveToBackpack = async (item: SeaItem) => {
    await storeItems([item.uid], 'retrieve');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#040b12] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#0a1929] border-b border-cyan-800/30">
        <h2 className="text-lg font-black text-cyan-400 flex items-center gap-2 tracking-wide uppercase">
          <Database className="w-5 h-5" /> Kho Đồ Thành Trì
        </h2>
        <button 
          onClick={() => setIsFortressStorageOpen(false)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-6">
        {/* Backpack Strip */}
        <div className="bg-[#0a1929] border border-cyan-800/30 rounded-xl p-3 shadow-lg shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Package className="w-4 h-4" /> Balo của bạn ({backpackItems.length})
            </h3>
            <span className="text-[10px] text-gray-400">Nhấn đúp (hoặc bấm) để cất vào kho <ArrowDown className="w-3 h-3 inline text-emerald-400"/></span>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 subtle-scrollbar">
            {backpackItems.map(item => (
              <button
                key={item.uid}
                onClick={() => handleSendToStorage(item)}
                className="w-12 h-12 shrink-0 bg-[#0d2137] hover:bg-[#122b46] border border-cyan-900/50 rounded-lg flex items-center justify-center text-2xl transition-all active:scale-95"
                title={`${item.name}\nNhấn để cất vào kho`}
              >
                {item.icon}
              </button>
            ))}
            {backpackItems.length === 0 && (
              <div className="w-full text-center text-xs text-gray-500 py-3 italic">
                Balo đang trống
              </div>
            )}
          </div>
        </div>

        {/* Storage Grid */}
        <div className="flex-1 bg-[#06111a] rounded-xl border border-cyan-900/30 p-2 shadow-inner overflow-hidden flex flex-col">
          <div className="text-center mb-2 mt-1">
            <span className="text-xs font-bold text-amber-500/80 uppercase tracking-widest bg-amber-900/20 px-3 py-1 rounded-full">
              Sức chứa tối đa: {storageBag.cells} ô
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto subtle-scrollbar flex flex-col items-center pb-8">
            <InventoryGridV2
              items={state.storage}
              bags={[storageBag]}
              gridW={MAX_GRID_W}
              gridH={MAX_GRID_H * 4}
              cellSize={Math.min(44, (window.innerWidth - 64) / MAX_GRID_W)}
              onItemLayoutChange={(newStorage) => saveStorage(newStorage)}
              onItemDoubleClick={handleRetrieveToBackpack}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
