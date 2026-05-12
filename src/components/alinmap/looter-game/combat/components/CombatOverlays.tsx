import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CombatResult } from '../../LooterGameContext';
import type { LooterItem } from '../../backpack/types';

interface FleeConfirmOverlayProps {
    show: boolean;
    onFlee: () => void;
    onCancel: () => void;
}

export const FleeConfirmOverlay: React.FC<FleeConfirmOverlayProps> = ({ show, onFlee, onCancel }) => (
    <AnimatePresence>
        {show && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-[#0d2137] border border-red-500/30 p-8 rounded-[32px] text-center max-w-xs mx-4 shadow-2xl"
                >
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
                        <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Đầu hàng Ghost?</h3>
                    <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                        Bạn có thể đầu hàng để rút lui, nhưng sẽ mất một phần vật phẩm trong balo.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onFlee}
                            className="w-full py-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 font-bold rounded-2xl transition-all flex flex-col items-center leading-tight shadow-lg shadow-red-900/40"
                        >
                            <span className="text-sm uppercase">Đầu hàng</span>
                            <span className="text-[9px] text-red-400/70">Mất 25% vật phẩm trong balo, tối thiểu 1 món</span>
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-3 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:text-gray-300 transition-colors mt-2"
                        >
                            Ở lại chiến đấu
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

interface CombatResultOverlayProps {
    show: boolean;
    result: CombatResult | null;
    selectedItem: LooterItem | null;
    onSelectItem: (item: LooterItem | null) => void;
    onClose: () => void;
}

export const CombatResultOverlay: React.FC<CombatResultOverlayProps> = ({
    show, result, selectedItem, onSelectItem, onClose
}) => (
    <AnimatePresence>
        {show && result && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={`p-8 rounded-[40px] text-center max-w-sm mx-4 shadow-2xl ${
                        result.result === 'win' ? 'bg-gradient-to-b from-amber-800 to-amber-950 border-2 border-amber-500/50' : 'bg-gradient-to-b from-red-900 to-red-950 border-2 border-red-500/50'
                    }`}
                >
                    <span className="text-6xl block mb-4">{result.result === 'win' ? '🏆' : '💀'}</span>
                    <h3 className="text-3xl font-black mb-3 text-white tracking-tighter">{result.result === 'win' ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}</h3>

                    {result.result === 'win' && result.loot?.length ? (
                        <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">Vật phẩm thu được</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {result.loot.map((item: any) => (
                                    <div
                                        key={item.uid}
                                        onClick={() => onSelectItem(selectedItem?.uid === item.uid ? null : item)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all active:scale-90 ${selectedItem?.uid === item.uid ? 'bg-amber-500/30 ring-2 ring-amber-400' : 'bg-white/5 hover:bg-white/10'}`}
                                    >
                                        {item.icon}
                                    </div>
                                ))}
                            </div>
                            {selectedItem && (
                                <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/10 text-left">
                                    <p className="text-sm font-black text-white">{selectedItem.name}</p>
                                    <p className="text-[10px] text-gray-400 capitalize">{selectedItem.rarity} • {selectedItem.gridW}x{selectedItem.gridH}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                                        {selectedItem.weight > 0 && <span className="text-orange-300">⚔ {selectedItem.weight} DMG</span>}
                                        {selectedItem.hpBonus > 0 && <span className="text-red-300">❤ +{selectedItem.hpBonus} HP</span>}
                                        {selectedItem.energyMax > 0 && <span className="text-blue-300">⚡ +{selectedItem.energyMax} EN</span>}
                                        {selectedItem.energyRegen > 0 && <span className="text-green-300">✦ +{selectedItem.energyRegen} Regen</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : result.result === 'lose' && result.droppedItems?.length ? (
                        <div className="mb-6 bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-3">Vật phẩm bị mất (25%)</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {result.droppedItems.map((item: any) => (
                                    <div key={item.uid} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-xl opacity-40" title={item.name}>{item.icon}</div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 min-h-[40px]" />
                    )}

                    <button
                        onClick={onClose}
                        className={`w-full py-5 rounded-2xl font-black transition-all active:scale-95 shadow-xl uppercase tracking-tighter ${
                            result.result === 'lose' ? 'bg-white text-black hover:bg-gray-200' : 'bg-amber-500 text-black hover:bg-amber-400'
                        }`}
                    >
                        {result.result === 'lose' ? 'Về Thành Trì' : 'Tiếp tục'}
                    </button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);
