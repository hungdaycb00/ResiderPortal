import type React from 'react';
import type { LooterItem } from '../LooterGameContext';

interface PickupRewardModalProps {
    item: LooterItem;
    onDiscard: () => void;
    onOpenBackpack: () => void;
}

const PickupRewardModal: React.FC<PickupRewardModalProps> = ({
    item,
    onDiscard,
    onOpenBackpack,
}) => (
    <div className="fixed inset-0 z-[450] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
        <div className="w-full max-w-xs rounded-3xl border border-cyan-700/40 bg-[#08131d] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-700/40 bg-[#0d2137] text-5xl shadow-inner">
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-contain drop-shadow-md" />
                ) : (
                    item.icon
                )}
            </div>
            <p className="mt-4 text-lg font-black text-cyan-100">{item.name}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs text-cyan-100/85">
                <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">DMG: {item.weight || 0}</div>
                <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">HP: {item.hpBonus || 0}</div>
                <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">EN: {item.energyMax || 0}</div>
                <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">Regen: {item.energyRegen || 0}</div>
                <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">Vang: {item.price || 0}</div>
                <div className="rounded-xl border border-cyan-900/30 bg-[#0a1929] px-3 py-2">Kich thuoc: {item.gridW}x{item.gridH}</div>
            </div>

            <div className="mt-5 flex gap-3">
                <button
                    type="button"
                    onClick={onDiscard}
                    className="flex-1 rounded-2xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm font-black text-red-200 transition-colors hover:bg-red-900/40"
                >
                    Vut bo
                </button>
                <button
                    type="button"
                    onClick={onOpenBackpack}
                    className="flex-1 rounded-2xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-3 text-sm font-black text-cyan-100 transition-colors hover:bg-cyan-900/40"
                >
                    Mo balo
                </button>
            </div>
        </div>
    </div>
);

export default PickupRewardModal;
