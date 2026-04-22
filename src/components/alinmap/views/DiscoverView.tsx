import React from 'react';
import { CloudSun, Diamond, MapPin } from 'lucide-react';
import { normalizeImageUrl } from '../../../services/externalApi';

interface DiscoverViewProps {
    games: any[];
    nearbyUsers: any[];
    setSearchTag: (tag: string) => void;
}

const DiscoverView: React.FC<DiscoverViewProps> = ({ games, nearbyUsers, setSearchTag }) => {
    return (
        <>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-[22px] font-black text-gray-900 tracking-tight">Featured Games</h2>
                <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1.5 shrink-0">
                    <CloudSun className="w-4 h-4 text-gray-500" />
                    <span className="text-[11px] font-bold text-gray-700">28°</span>
                </div>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                {(games && games.length > 0 ? games : [1, 2, 3]).slice(0, 5).map((game: any, idx: number) => {
                    const isPlaceholder = typeof game === 'number';
                    return (
                        <div key={isPlaceholder ? idx : game.id} className="snap-start shrink-0 w-64 bg-[#eef5fa] rounded-3xl overflow-hidden border border-[#d6eaf3] flex flex-col active:scale-[0.98] transition-transform cursor-pointer">
                            <div className="p-4 pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2">{isPlaceholder ? 'Explore a world of smooth gaming...' : game.title}</h3>
                                    <Diamond className="w-5 h-5 text-blue-500 shrink-0 fill-blue-50 mt-0.5" />
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-2">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Alin Maps • {isPlaceholder ? 'Coming Soon' : (game.mode || 'Multiplayer')}</span>
                                </div>
                            </div>
                            <div className="p-2 pt-0 flex-1 flex flex-col justify-end">
                                <div className="w-full aspect-[4/3] bg-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    {!isPlaceholder && (
                                        <img
                                            src={normalizeImageUrl(game.image || '')}
                                            alt={game.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    )}
                                    {isPlaceholder && <div className="w-full h-full bg-gradient-to-br from-blue-100 to-gray-200" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trending Tags from nearby users */}
            <div className="mt-4 space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-black text-gray-900">Trending Tags</h3>
                    <span className="text-[11px] font-bold text-gray-400">{nearbyUsers.length} users nearby</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(() => {
                        const tagCounts: Record<string, number> = {};
                        nearbyUsers.forEach(u => {
                            const words = (u.status || '').split(' ').filter((w: string) => w.startsWith('#'));
                            words.forEach((w: string) => {
                                const clean = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9#]/g, '').toUpperCase();
                                if (clean.length > 1) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
                            });
                        });
                        const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
                        if (sorted.length === 0) return <p className="text-[12px] text-gray-400 italic py-2">No trending tags yet.</p>;
                        return sorted.map(([tag, count]) => (
                            <button key={tag} onClick={() => setSearchTag(tag)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100 transition-colors active:scale-95">
                                {tag} <span className="text-blue-400 ml-1">×{count}</span>
                            </button>
                        ));
                    })()}
                </div>
            </div>
        </>
    );
};

export default DiscoverView;
