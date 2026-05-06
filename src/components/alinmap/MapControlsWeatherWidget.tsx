import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ChevronDown, ChevronUp } from 'lucide-react';

interface MapControlsWeatherWidgetProps {
    weatherData: { temp: number; desc: string; icon: string; humidity?: number; feelsLike?: number } | null;
    currentProvince?: string | null;
    myObfPos: { lat: number; lng: number } | null;
    friendLocInput: string;
    setFriendLocInput: (v: string) => void;
    setSearchMarkerPos: (pos: { lat: number; lng: number } | null) => void;
    handleCenterTo: (lat: number, lng: number, offset?: number) => void;
    isWidgetExpanded: boolean;
    setIsWidgetExpanded: (v: boolean) => void;
}

const MapControlsWeatherWidget: React.FC<MapControlsWeatherWidgetProps> = ({
    weatherData,
    currentProvince,
    myObfPos,
    friendLocInput,
    setFriendLocInput,
    setSearchMarkerPos,
    handleCenterTo,
    isWidgetExpanded,
    setIsWidgetExpanded,
}) => {
    const [copyToast, setCopyToast] = useState(false);

    const handleCopyLocation = () => {
        if (!myObfPos) return;
        const text = `${(myObfPos.lat || 0).toFixed(5)}, ${(myObfPos.lng || 0).toFixed(5)}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopyToast(true);
            window.setTimeout(() => setCopyToast(false), 3000);
        });
    };

    return (
        <div
            className={`${isWidgetExpanded ? 'flex' : 'hidden md:flex'} absolute top-[105px] left-4 md:top-6 md:right-8 md:left-auto z-[185] pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 flex-col gap-1 min-w-[180px] max-w-[calc(100vw-32px)] cursor-pointer hover:bg-white transition-all duration-300 animate-in fade-in slide-in-from-top-2`}
            onClick={() => setIsWidgetExpanded(!isWidgetExpanded)}
        >
            <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                    {weatherData && <span className="text-xl">{weatherData.icon}</span>}
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black text-gray-900 leading-tight truncate">
                            {currentProvince || (weatherData ? `${weatherData.temp}°C` : 'Location')}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <p className="text-[9px] font-bold text-gray-400 tracking-wide uppercase truncate">
                                {weatherData ? weatherData.desc : 'Unknown Weather'}
                            </p>
                            {weatherData && (
                                <>
                                    <span className="text-gray-300 text-[10px]">•</span>
                                    <p className="text-[9px] font-bold text-gray-500">
                                        {weatherData.temp}°C
                                    </p>
                                    {weatherData.humidity != null && (
                                        <>
                                            <span className="text-gray-300 text-[10px]">•</span>
                                            <p className="text-[9px] font-bold text-blue-500">
                                                💧{weatherData.humidity}%
                                            </p>
                                        </>
                                    )}
                                </>
                            )}
                            {!isWidgetExpanded && myObfPos && (
                                <>
                                    <span className="text-gray-300 text-[10px]">•</span>
                                    <p className="text-[9px] font-mono font-bold text-gray-400">
                                        {(myObfPos.lat || 0).toFixed(4)}, {(myObfPos.lng || 0).toFixed(4)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-gray-400">
                    {isWidgetExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            <AnimatePresence>
                {isWidgetExpanded && myObfPos && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gray-100 rounded-lg py-1.5 px-2 flex flex-col gap-1.5 w-full mt-2">
                            {weatherData && (
                                <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                                    <div className="flex-1 flex flex-col items-center gap-0.5 py-1">
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Temp</p>
                                        <p className="text-[13px] font-black text-gray-800">{weatherData.temp}°C</p>
                                    </div>
                                    {weatherData.feelsLike != null && (
                                        <div className="flex-1 flex flex-col items-center gap-0.5 py-1 border-x border-gray-200">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Feels</p>
                                            <p className="text-[13px] font-black text-orange-600">{weatherData.feelsLike}°C</p>
                                        </div>
                                    )}
                                    {weatherData.humidity != null && (
                                        <div className="flex-1 flex flex-col items-center gap-0.5 py-1">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Humid</p>
                                            <p className="text-[13px] font-black text-blue-600">{weatherData.humidity}%</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="relative">
                                <div className="flex items-center justify-between">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                                    <button
                                        onClick={handleCopyLocation}
                                        className="p-0.5 hover:bg-gray-200 rounded transition-colors active:scale-90"
                                        title="Copy location"
                                    >
                                        {copyToast ? (
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] font-mono font-bold text-gray-700 text-center tracking-wide">
                                    {(myObfPos.lat || 0).toFixed(5)}, {(myObfPos.lng || 0).toFixed(5)}
                                </p>
                                <AnimatePresence>
                                    {copyToast && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            className="text-[9px] font-bold text-emerald-600 text-center mt-1"
                                        >
                                            ✓ Đã sao chép tọa độ
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="flex flex-col gap-1 border-t border-gray-200 pt-1.5 mt-0.5">
                                <input
                                    type="text"
                                    placeholder="Lat, Lng"
                                    value={friendLocInput}
                                    onChange={e => setFriendLocInput(e.target.value)}
                                    className="text-[10px] w-full bg-white border border-gray-200 rounded px-1.5 py-1 outline-none font-mono text-gray-800"
                                />
                                <div className="flex gap-1 w-full">
                                    <button
                                        onClick={() => {
                                            if (!friendLocInput) return;
                                            const parts = friendLocInput.split(',');
                                            const locLat = parseFloat(parts[0]);
                                            const locLng = parseFloat(parts[1]);
                                            if (!Number.isNaN(locLat) && !Number.isNaN(locLng)) {
                                                handleCenterTo(locLat, locLng);
                                            }
                                        }}
                                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[9px] font-bold py-1 px-1 rounded transition-colors whitespace-nowrap"
                                    >
                                        Move
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!friendLocInput) return;
                                            const parts = friendLocInput.split(',');
                                            const locLat = parseFloat(parts[0]);
                                            const locLng = parseFloat(parts[1]);
                                            if (!Number.isNaN(locLat) && !Number.isNaN(locLng)) {
                                                setSearchMarkerPos({ lat: locLat, lng: locLng });
                                                handleCenterTo(locLat, locLng);
                                            }
                                        }}
                                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-[9px] font-bold py-1 px-1 rounded transition-colors whitespace-nowrap"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MapControlsWeatherWidget;
