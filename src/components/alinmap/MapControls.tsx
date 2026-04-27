import React, { useState } from 'react';
import { RefreshCw, Filter, LocateFixed, Plus, Minus, X, Copy, Check, ChevronDown, ChevronUp, Waves, Navigation, Home } from 'lucide-react';
import { motion, AnimatePresence, MotionValue } from 'framer-motion';

interface MapControlsProps {
    isConnecting: boolean;
    isSidebarOpen: boolean;
    weatherData: { temp: number; desc: string; icon: string; humidity?: number; feelsLike?: number } | null;
    currentProvince?: string | null;
    myObfPos: { lat: number; lng: number } | null;
    friendLocInput: string;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    searchTag: string;
    radius: number;
    scale: MotionValue<number>;
    ws: React.MutableRefObject<WebSocket | null>;
    mapMode: 'grid' | 'satellite';
    setIsSidebarOpen: (v: boolean) => void;
    setFriendLocInput: (v: string) => void;
    setMyObfPos: (pos: { lat: number; lng: number }) => void;
    setSearchMarkerPos: (pos: { lat: number; lng: number } | null) => void;
    setFilterDistance: (v: number) => void;
    setFilterAgeMin: (v: number) => void;
    setFilterAgeMax: (v: number) => void;
    setSearchTag: (v: string) => void;
    handleRefresh: () => void;
    handleCenter: () => void;
    handleCenterTo: (lat: number, lng: number) => void;
    handleUpdateRadius: (v: number) => void;
    setMapMode: (v: 'grid' | 'satellite') => void;
    isSeaGameMode?: boolean;
    seaState?: any;
}

const MapControls: React.FC<MapControlsProps> = ({
    isConnecting, isSidebarOpen, weatherData, currentProvince, myObfPos, friendLocInput,
    filterDistance, filterAgeMin, filterAgeMax, searchTag, radius, scale, ws, mapMode,
    setIsSidebarOpen, setFriendLocInput, setMyObfPos, setSearchMarkerPos,
    setFilterDistance, setFilterAgeMin, setFilterAgeMax, setSearchTag,
    handleRefresh, handleCenter, handleCenterTo, handleUpdateRadius, setMapMode, isSeaGameMode, seaState
}) => {
    const [copyToast, setCopyToast] = useState(false);
    const [isWidgetExpanded, setIsWidgetExpanded] = useState(false);

    const handleCopyLocation = () => {
        if (!myObfPos) return;
        const text = `${(myObfPos?.lat || 0).toFixed(5)}, ${(myObfPos?.lng || 0).toFixed(5)}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopyToast(true);
            setTimeout(() => setCopyToast(false), 3000);
        });
    };

    return (
        <>
            {/* Floating Controls - Right Side */}
            <div className="absolute right-2 md:right-8 bottom-[75px] md:bottom-12 z-[120] flex flex-col gap-2 md:gap-3 pointer-events-auto">
                {!isSeaGameMode && (
                    <>
                    <button
                        onClick={handleRefresh}
                    disabled={isConnecting}
                    className="w-8 h-8 md:w-10 md:h-10 bg-white/60 md:bg-white backdrop-blur-md rounded-[10px] md:rounded-xl shadow-md md:shadow-[0_4px_15px_rgba(0,0,0,0.1)] flex items-center justify-center text-gray-700 hover:text-blue-600 active:scale-95 transition-all disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isConnecting ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                    onClick={() => setMapMode(mapMode === 'grid' ? 'satellite' : 'grid')}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-xl shadow-md backdrop-blur-md flex items-center justify-center active:scale-95 transition-all ${mapMode === 'satellite' ? 'bg-cyan-600/80 md:bg-cyan-600 text-white' : 'bg-white/60 md:bg-white text-gray-700'}`}
                    title={mapMode === 'satellite' ? 'Chuyển sang Lưới 3D' : 'Chuyển sang Bản đồ Biển'}
                >
                    <Waves className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                    </>
                )}
                <div className="flex flex-col bg-white/60 md:bg-white rounded-[10px] md:rounded-[14px] shadow-md overflow-hidden mt-1 pointer-events-auto backdrop-blur-md md:backdrop-blur-none">
                    <button
                        onClick={handleCenter}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-blue-600 md:hover:bg-gray-50 flex items-center justify-center border-b border-white/30 md:border-gray-200 transition-colors"
                        title="Your Position"
                    >
                        <LocateFixed className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                        onClick={() => scale.set(Math.min((scale?.get?.() ?? 1) + 0.3, 3))}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-gray-700 md:text-gray-600 md:hover:bg-gray-50 flex items-center justify-center border-b border-white/30 md:border-gray-200 transition-colors"
                        title="Zoom In"
                    >
                        <Plus className="w-4 h-4 md:w-6 md:h-6 md:stroke-[2.5]" />
                    </button>
                    <button
                        onClick={() => scale.set(Math.max((scale?.get?.() ?? 1) - 0.3, 0.4))}
                        className="w-8 h-8 md:w-[42px] md:h-11 text-gray-700 md:text-gray-600 md:hover:bg-gray-50 flex items-center justify-center transition-colors"
                        title="Zoom Out"
                    >
                        <Minus className="w-4 h-4 md:w-6 md:h-6 md:stroke-[2.5]" />
                    </button>
                </div>
                {isSeaGameMode && (
                    <div className="flex flex-col gap-2 mt-2">
                        <button
                            onClick={handleCenter}
                            className="w-10 h-10 md:w-12 md:h-12 bg-cyan-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-cyan-900/40 flex items-center justify-center active:scale-95 transition-all border border-cyan-400/30"
                            title="Định vị Thuyền"
                        >
                            <Navigation className="w-5 h-5 md:w-6 md:h-6 fill-current rotate-45" />
                        </button>
                        <button
                            onClick={() => {
                                if (seaState?.fortressLat && seaState?.fortressLng) {
                                    handleCenterTo(seaState.fortressLat, seaState.fortressLng);
                                }
                            }}
                            className="w-10 h-10 md:w-12 md:h-12 bg-amber-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-amber-900/40 flex items-center justify-center active:scale-95 transition-all border border-amber-400/30"
                            title="Về Thành trì"
                        >
                            <Home className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                )}
            </div>

            {/* Weather & Coordinates Widget - Top Right */}
            {!isSeaGameMode && (
                <div 
                    className="hidden md:flex absolute top-2 md:top-6 right-4 md:right-8 z-[120] pointer-events-auto bg-white/90 backdrop-blur-md rounded-2xl p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100/50 flex-col gap-1 min-w-[160px] cursor-pointer hover:bg-white transition-colors"
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
                                            {(myObfPos?.lat || 0).toFixed(4)}, {(myObfPos?.lng || 0).toFixed(4)}
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
                            onClick={(e) => e.stopPropagation()} // Prevent collapse when interacting with widget content
                        >
                            <div className="bg-gray-100 rounded-lg py-1.5 px-2 flex flex-col gap-1.5 w-full mt-2">
                                {/* Weather Stats Row */}
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
                                        {(myObfPos?.lat || 0).toFixed(5)}, {(myObfPos?.lng || 0).toFixed(5)}
                                    </p>
                                    <AnimatePresence>
                                        {copyToast && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                                className="text-[9px] font-bold text-emerald-600 text-center mt-1"
                                            >
                                                ✓ Đã sao chép toạ độ
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
                                                if(!friendLocInput) return;
                                                const parts = friendLocInput.split(',');
                                                const locLat = parseFloat(parts[0]);
                                                const locLng = parseFloat(parts[1]);
                                                if(!isNaN(locLat) && !isNaN(locLng)) {
                                                    handleCenterTo(locLat, locLng);
                                                }
                                            }}
                                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[9px] font-bold py-1 px-1 rounded transition-colors whitespace-nowrap"
                                        >Move</button>
                                        <button 
                                            onClick={() => {
                                                if(!friendLocInput) return;
                                                const parts = friendLocInput.split(',');
                                                const locLat = parseFloat(parts[0]);
                                                const locLng = parseFloat(parts[1]);
                                                if(!isNaN(locLat) && !isNaN(locLng)) {
                                                    setSearchMarkerPos({ lat: locLat, lng: locLng });
                                                    handleCenterTo(locLat, locLng);
                                                }
                                            }}
                                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-[9px] font-bold py-1 px-1 rounded transition-colors whitespace-nowrap"
                                        >Search</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            )}

            {/* Sidebar (Map Filters) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute inset-0 bg-black/40 z-[150]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="absolute top-0 right-0 bottom-0 w-80 bg-[#1a1d24] z-[160] p-6 shadow-2xl border-l border-white/10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold">Map Filters</h2>
                                <X className="w-6 h-6 cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Distance (km)</h3>
                                    <div className="flex justify-between text-blue-400 font-bold mb-2">
                                        <span>Within {filterDistance} km</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="500"
                                        value={filterDistance}
                                        onChange={(e) => setFilterDistance(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                    />
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Age Range</h3>
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min="13"
                                                max="99"
                                                value={filterAgeMin}
                                                onChange={(e) => setFilterAgeMin(parseInt(e.target.value))}
                                                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[10px] text-gray-500 block text-center mt-1">Min Age</span>
                                        </div>
                                        <span className="text-gray-500 font-bold">-</span>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min="13"
                                                max="99"
                                                value={filterAgeMax}
                                                onChange={(e) => setFilterAgeMax(parseInt(e.target.value))}
                                                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[10px] text-gray-500 block text-center mt-1">Max Age</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-6 border-t border-white/10">
                                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Keywords / Tags</h3>
                                    <input
                                        type="text"
                                        placeholder="E.g. #GAMER or 'Looking for...'"
                                        value={searchTag}
                                        onChange={(e) => setSearchTag(e.target.value)}
                                        className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2">Filters the map instantly as you type.</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default MapControls;
