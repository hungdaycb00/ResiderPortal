import React from 'react';
import { motion } from 'motion/react';
import { Minimize2, X, Monitor } from 'lucide-react';
import PreviewArea from '../../../../creator/components/PreviewArea';
import type { DeviceType, Orientation } from '../../../../creator/types';

interface CreatorPreviewOverlayProps {
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    deviceType: DeviceType;
    orientation: Orientation;
    serverPreviewUrl: string | null;
    localGameUrl: string | null;
    isPreviewingOnServer: boolean;
    scale: number;
    containerRef: React.RefObject<HTMLDivElement>;
    onDeviceTypeChange: (v: DeviceType) => void;
    onOrientationToggle: () => void;
    onIframeLoad: () => void;
    showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const CreatorPreviewOverlay: React.FC<CreatorPreviewOverlayProps> = ({
    isExpanded,
    setIsExpanded,
    deviceType,
    orientation,
    serverPreviewUrl,
    localGameUrl,
    isPreviewingOnServer,
    scale,
    containerRef,
    onDeviceTypeChange,
    onOrientationToggle,
    onIframeLoad,
    showNotification,
}) => {
    if (!isExpanded) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black flex flex-col"
        >
            <div className="h-14 bg-[#1a1d24] border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <Monitor className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white leading-tight">Live Preview</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{deviceType} Mode</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all border border-gray-700"
                    >
                        <Minimize2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Thu nhỏ</span>
                    </button>
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#13151a]">
                <PreviewArea
                    serverPreviewUrl={serverPreviewUrl}
                    localGameUrl={localGameUrl}
                    isPreviewingOnServer={isPreviewingOnServer}
                    deviceType={deviceType}
                    orientation={orientation}
                    scale={scale}
                    containerRef={containerRef}
                    onDeviceTypeChange={onDeviceTypeChange}
                    onOrientationToggle={onOrientationToggle}
                    onIframeLoad={onIframeLoad}
                    showNotification={showNotification}
                />
            </div>
        </motion.div>
    );
};

export default CreatorPreviewOverlay;
