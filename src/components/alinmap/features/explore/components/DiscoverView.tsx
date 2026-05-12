import React from 'react';
import { Brain, Plus, Search, Sword, Trophy, Zap } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import GameCard from '../../../../GameCard';
import GameSlider from '../../../../GameSlider';

interface DiscoverViewProps {
    games: any[];
    nearbyUsers: any[];
    setSearchTag: (tag: string) => void;
    handlePlayGame?: (game: any) => void;
    onSearchClick?: () => void;
}

const FEATURED_LIMIT = 8;
const ALL_GAMES_LIMIT = 36;
const CATEGORY_GAMES_LIMIT = 18;
const TRENDING_TAG_LIMIT = 12;

const AVAILABLE_CATEGORIES = [
    { id: 'puzzle', name: 'Puzzle & Logic', icon: <Brain className="w-5 h-5 text-pink-400" /> },
    { id: 'action', name: 'Action & Arcade', icon: <Zap className="w-5 h-5 text-yellow-400" /> },
    { id: 'strategy', name: 'Strategy', icon: <Sword className="w-5 h-5 text-blue-400" /> },
];

const keywordsMap: Record<string, string[]> = {
    puzzle: ['puzzle', 'quiz', 'brain', 'logic'],
    action: ['action', 'sword', 'combat', 'battle'],
    strategy: ['strategy', 'build', 'defense'],
};

const getGameTitle = (game: any) => game.title || game.name || 'Untitled Game';
const getGameImage = (game: any) => game.image || game.thumbnail || game.cover || '';
const normalizeTagKey = (value: string) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    return prefixed
        .replace(/[^\p{L}\p{N}#_-]/gu, '')
        .toLowerCase();
};

const extractTagsFromText = (value: string) => (String(value || '').match(/#[\p{L}\p{N}_-]+/gu) || []);

const DiscoverView: React.FC<DiscoverViewProps> = ({ games, nearbyUsers, setSearchTag, handlePlayGame, onSearchClick }) => {
    const gameList = React.useMemo(() => Array.isArray(games) ? games.filter(Boolean) : [], [games]);

    const uniqueHighRated = React.useMemo(() => (
        Array.from(
            new Map(
                gameList
                    .filter(g => (g.score || 0) >= 8 || g.id === 'quiz-game-root')
                    .map(g => [g.id || g.slug || getGameTitle(g), g])
            ).values()
        )
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, FEATURED_LIMIT)
    ), [gameList]);

    const visibleGames = React.useMemo(() => gameList.slice(0, ALL_GAMES_LIMIT), [gameList]);

    const categorySections = React.useMemo(() => (
        AVAILABLE_CATEGORIES.map((cat) => {
            const catGames = gameList.filter(g =>
                ((g.category || '').toLowerCase().includes(cat.id)) ||
                keywordsMap[cat.id]?.some((k) => (getGameTitle(g) || '').toLowerCase().includes(k))
            ).slice(0, CATEGORY_GAMES_LIMIT);

            return { ...cat, games: catGames };
        }).filter(cat => cat.games.length > 0)
    ), [gameList]);

    const trendingTags = React.useMemo(() => {
        const tagCounts: Record<string, number> = {};
        nearbyUsers.forEach(u => {
            extractTagsFromText(u.status).forEach((tag) => {
                const key = normalizeTagKey(tag);
                if (key.length > 1) tagCounts[key] = (tagCounts[key] || 0) + 1;
            });

            const userTags = Array.isArray(u.tags) ? u.tags : [];
            userTags.forEach((tag: string) => {
                const key = normalizeTagKey(tag);
                if (key.length > 1) tagCounts[key] = (tagCounts[key] || 0) + 1;
            });
        });
        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, TRENDING_TAG_LIMIT);
    }, [nearbyUsers]);

    return (
        <div className="flex flex-col gap-6 pb-20">
            <div className="flex items-center justify-between px-1 pt-1">
                <h3 className="truncate text-[20px] font-black uppercase tracking-tighter italic text-gray-900">
                    Explore
                </h3>
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        type="button"
                        onClick={onSearchClick}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all active:scale-95 hover:bg-gray-50"
                        aria-label="Search"
                        title="Search"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {uniqueHighRated.length > 0 && (
                <section className="mb-2 content-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[20px] font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter italic border-l-4 border-yellow-400 pl-3">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            Featured Games
                        </h3>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                        {uniqueHighRated.map((game: any, idx: number) => (
                            <button
                                type="button"
                                key={game.id || game.slug || idx}
                                onClick={() => handlePlayGame?.(game)}
                                className="snap-start shrink-0 w-[280px] h-[160px] rounded-3xl overflow-hidden relative transition-transform active:scale-[0.98] bg-gray-50 border border-gray-100 shadow-sm cursor-pointer text-left"
                            >
                                {getGameImage(game) ? (
                                    <img
                                        src={normalizeImageUrl(getGameImage(game))}
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
                                        alt=""
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent opacity-100 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-full p-4 z-10 pointer-events-none">
                                    <div className="px-2 py-1 bg-yellow-400 text-black rounded-full text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-1.5">
                                        <Trophy className="w-2.5 h-2.5" /> Featured {game.score ? `- ${game.score}/10` : ''}
                                    </div>
                                    <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none truncate">
                                        {getGameTitle(game)}
                                    </h1>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <GameSlider title="All Games" icon={<Plus className="w-5 h-5 text-purple-400" />} lightMode>
                {visibleGames.map((game, i) => (
                    <div key={game.id || game.slug || i} className="w-[180px] sm:w-[220px] content-auto">
                        <GameCard
                            title={getGameTitle(game)}
                            image={normalizeImageUrl(getGameImage(game))}
                            logoStyle={game.logoStyle || 'text-white'}
                            onClick={() => handlePlayGame?.(game)}
                            lightMode
                        />
                    </div>
                ))}
            </GameSlider>

            {categorySections.map((cat) => (
                <div key={cat.id} className="content-auto">
                    <GameSlider title={cat.name} icon={cat.icon} lightMode>
                        {cat.games.map((game, i) => (
                            <div key={game.id || game.slug || i} className="w-[180px] sm:w-[220px]">
                                <GameCard
                                    title={getGameTitle(game)}
                                    image={normalizeImageUrl(getGameImage(game))}
                                    logoStyle={game.logoStyle || 'text-white'}
                                    onClick={() => handlePlayGame?.(game)}
                                    lightMode
                                />
                            </div>
                        ))}
                    </GameSlider>
                </div>
            ))}

            <div className="mt-2 space-y-4 px-1 content-auto">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-gray-900">Trending Tags</h3>
                    <span className="text-[11px] font-bold text-gray-400">{nearbyUsers.length} users nearby</span>
                </div>
                <div className="flex flex-wrap gap-2">
                        {trendingTags.length === 0 ? (
                        <p className="text-[12px] text-gray-400 italic py-2">No trending tags yet.</p>
                    ) : trendingTags.map(([tag, count]) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setSearchTag(tag)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100 transition-colors active:scale-95"
                        >
                            {tag} <span className="text-blue-400 ml-1">x{count}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default React.memo(DiscoverView);
