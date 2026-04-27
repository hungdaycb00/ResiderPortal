import React from 'react';
import { Diamond, MapPin, Trophy, Plus, Brain, Zap, Sword } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import GameCard from '../../../../GameCard';
import GameSlider from '../../../../GameSlider';

interface DiscoverViewProps {
    games: any[];
    nearbyUsers: any[];
    setSearchTag: (tag: string) => void;
    handlePlayGame?: (game: any) => void;
}

const DiscoverView: React.FC<DiscoverViewProps> = ({ games, nearbyUsers, setSearchTag, handlePlayGame }) => {
    const gameList = Array.isArray(games) ? games.filter(Boolean) : [];
    const getGameTitle = (game: any) => game.title || game.name || 'Untitled Game';
    const getGameImage = (game: any) => game.image || game.thumbnail || game.cover || '';

    const AVAILABLE_CATEGORIES = [
        { id: 'puzzle', name: 'Puzzle & Logic', icon: <Brain className="w-5 h-5 text-pink-400" /> },
        { id: 'action', name: 'Action & Arcade', icon: <Zap className="w-5 h-5 text-yellow-400" /> },
        { id: 'strategy', name: 'Strategy', icon: <Sword className="w-5 h-5 text-blue-400" /> }
    ];

    const keywordsMap: Record<string, string[]> = {
        puzzle: ['puzzle', 'quiz', 'brain', 'logic'],
        action: ['action', 'sword', 'combat', 'battle'],
        strategy: ['strategy', 'build', 'defense']
    };

    const uniqueHighRated = Array.from(new Map(gameList.filter(g => (g.score || 0) >= 8 || g.id === 'quiz-game-root').map(g => [g.id || g.slug || getGameTitle(g), g])).values())
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
        <div className="flex flex-col gap-6 pb-20">
            {/* Hero Carousel */}
            {uniqueHighRated.length > 0 && (
                <section className="mb-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[20px] font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter italic border-l-4 border-yellow-400 pl-3">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            Featured Games
                        </h3>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                        {uniqueHighRated.map((game: any, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => handlePlayGame && handlePlayGame(game)}
                                className="snap-start shrink-0 w-[280px] h-[160px] rounded-3xl overflow-hidden relative transition-transform active:scale-[0.98] bg-gray-50 border border-gray-100 shadow-sm cursor-pointer"
                            >
                                {getGameImage(game) ? (
                                    <img src={normalizeImageUrl(getGameImage(game))} className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" alt="" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent opacity-100 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-full p-4 z-10 pointer-events-none">
                                    <div className="px-2 py-1 bg-yellow-400 text-black rounded-full text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-1.5">
                                        <Trophy className="w-2.5 h-2.5" /> Featured {game.score ? `• ${game.score}/10` : '🔥'}
                                    </div>
                                    <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none truncate">
                                        {getGameTitle(game)}
                                    </h1>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* All Games */}
            <GameSlider
                title="All Games"
                icon={<Plus className="w-5 h-5 text-purple-400" />}
                lightMode
            >
                {gameList.map((game, i) => (
                    <div key={i} className="w-[180px] sm:w-[220px]">
                        <GameCard
                            title={getGameTitle(game)}
                            image={normalizeImageUrl(getGameImage(game))}
                            logoStyle={game.logoStyle || "text-white"}
                            onClick={() => handlePlayGame && handlePlayGame(game)}
                            lightMode
                        />
                    </div>
                ))}
            </GameSlider>

            {/* Categories */}
            {AVAILABLE_CATEGORIES.map((cat) => {
                const catGames = gameList.filter(g =>
                    ((g.category || '').toLowerCase().includes(cat.id)) ||
                    (keywordsMap[cat.id] && keywordsMap[cat.id].some((k: string) => getGameTitle(g).toLowerCase().includes(k)))
                );

                if (catGames.length === 0) return null;

                return (
                    <div key={cat.id}>
                        <GameSlider
                            title={cat.name}
                            icon={cat.icon}
                            lightMode
                        >
                            {catGames.map((game, i) => (
                                <div key={i} className="w-[180px] sm:w-[220px]">
                                    <GameCard
                                        title={getGameTitle(game)}
                                        image={normalizeImageUrl(getGameImage(game))}
                                        logoStyle={game.logoStyle || "text-white"}
                                        onClick={() => handlePlayGame && handlePlayGame(game)}
                                        lightMode
                                    />
                                </div>
                            ))}
                        </GameSlider>
                    </div>
                );
            })}

            {/* Trending Tags from nearby users */}
            <div className="mt-2 space-y-4 px-1">
                <div className="flex justify-between items-center">
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
        </div>
    );
};

export default DiscoverView;
