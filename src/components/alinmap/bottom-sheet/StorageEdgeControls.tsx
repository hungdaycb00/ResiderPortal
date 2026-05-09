import type React from 'react';
import { Database } from 'lucide-react';

interface StorageEdgeControlsProps {
    isItemDragging: boolean;
    showFortressStorageButton: boolean;
    showStorageEdgeControls: boolean;
    setIsSheetExpanded: (v: boolean) => void;
    toggleIntegratedStorage?: (mode?: 'fortress' | 'portal') => void;
}

const StorageEdgeControls: React.FC<StorageEdgeControlsProps> = ({
    isItemDragging,
    showFortressStorageButton,
    showStorageEdgeControls,
    setIsSheetExpanded,
    toggleIntegratedStorage,
}) => {
    if (!showStorageEdgeControls) return null;

    return (
        <div className="absolute -top-12 left-3 z-[190] flex items-center gap-2 md:static md:flex-row md:gap-3">
            {showFortressStorageButton && (
                <button
                    type="button"
                    data-map-interactive="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsSheetExpanded(true);
                        toggleIntegratedStorage?.('fortress');
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/50 bg-[#121417]/95 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.35)] backdrop-blur-xl transition-all hover:border-amber-200 hover:text-amber-100 active:scale-95"
                    title="Mở Kho Thành Trì"
                >
                    <Database className="h-5 w-5" />
                </button>
            )}

            <div
                id="global-sell-zone"
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/50 bg-[#121417]/95 text-yellow-400 shadow-[0_0_24px_rgba(234,179,8,0.35)] backdrop-blur-xl transition-all ${isItemDragging ? 'animate-pulse scale-110 border-yellow-300 bg-yellow-500/20 text-yellow-300' : ''}`}
                title="Kéo vật phẩm vào đây để bán"
            >
                <span className="font-black text-lg">$</span>
            </div>
        </div>
    );
};

export default StorageEdgeControls;
