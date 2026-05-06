import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MapControlsFiltersSidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (v: boolean) => void;
    filterDistance: number;
    filterAgeMin: number;
    filterAgeMax: number;
    searchTag: string;
    setFilterDistance: (v: number) => void;
    setFilterAgeMin: (v: number) => void;
    setFilterAgeMax: (v: number) => void;
    setSearchTag: (v: string) => void;
}

const MapControlsFiltersSidebar: React.FC<MapControlsFiltersSidebarProps> = ({
    isSidebarOpen,
    setIsSidebarOpen,
    filterDistance,
    filterAgeMin,
    filterAgeMax,
    searchTag,
    setFilterDistance,
    setFilterAgeMin,
    setFilterAgeMax,
    setSearchTag,
}) => {
    return (
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
    );
};

export default MapControlsFiltersSidebar;
