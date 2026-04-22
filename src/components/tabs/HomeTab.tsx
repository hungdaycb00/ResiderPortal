import React, { useRef } from 'react';
import { Search, Trophy, ChevronLeft, ChevronRight, Play, RefreshCw, Plus, Trash2 } from 'lucide-react';
import GameCard from '../GameCard';
import GameSlider from '../GameSlider';
import { games } from '../../constants';

export interface HomeTabProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCategories: string[];
    setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
    isSearchActive: boolean;
    filteredGames: any[];
    fetchedGames: any[];
    recentlyPlayed: any[];
    handlePlayGame: (game: any) => void;
    AVAILABLE_CATEGORIES: any[];
}

const HomeTab: React.FC<HomeTabProps> = ({
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    isSearchActive,
    filteredGames,
    fetchedGames,
    recentlyPlayed,
    handlePlayGame,
    AVAILABLE_CATEGORIES
}) => {
    const heroScrollRef = useRef<HTMLDivElement>(null);
    const heroDragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

    const scrollHero = (direction: 'left' | 'right') => {
        if (heroScrollRef.current) {
            const { scrollLeft, clientWidth } = heroScrollRef.current;
            const scrollTo = direction === 'left'
                ? scrollLeft - clientWidth * 0.8
                : scrollLeft + clientWidth * 0.8;

            heroScrollRef.current.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
    };

    const handleHeroPointerDown = (e: React.PointerEvent) => {
        if (heroScrollRef.current) {
            heroDragState.current = {
                isDown: true,
                startX: e.pageX,
                scrollLeft: heroScrollRef.current.scrollLeft,
                moved: false
            };
        }
    };

    const handleHeroPointerMove = (e: React.PointerEvent) => {
        if (!heroDragState.current.isDown || !heroScrollRef.current) return;
        const x = e.pageX;
        const walk = (heroDragState.current.startX - x) * 2;
        if (Math.abs(walk) > 5) {
            heroDragState.current.moved = true;
        }
        heroScrollRef.current.scrollLeft = heroDragState.current.scrollLeft + walk;
    };

    const handleHeroPointerUpOrLeave = () => {
        heroDragState.current.isDown = false;
    };

    return (
        <div className="flex flex-col gap-3 md:gap-16 pb-20">
            {/* Search Results Section */}
            {isSearchActive && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic">
                            <Search className="w-6 h-6 text-blue-400" />
                            Search Results ({filteredGames.length})
                        </h3>
                        {isSearchActive && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategories([]);
                                }}
                                className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    {filteredGames.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {filteredGames.map((game, i) => (
                                <GameCard
                                    key={i}
                                    title={game.title}
                                    image={game.image}
                                    logoStyle={game.logoStyle || "text-white"}
                                    onClick={() => handlePlayGame(game)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#1a1d24] border border-gray-800 rounded-3xl p-12 text-center">
                            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-300 mb-1">No games found</h4>
                            <p className="text-sm text-gray-500">Try changing your search query or filters</p>
                        </div>
                    )}
                    <div className="h-px bg-gray-800/50 mt-10 md:mt-16" />
                </section>
            )}

            {/* Hero Carousel - Games with score > 8 */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 mb-8 md:mb-12">
                {(() => {
                    const highRatedGames = [...fetchedGames, ...games].filter(g => (g.score || 0) >= 8 || g.id === 'quiz-game-root');
                    const uniqueHighRated = Array.from(new Map(highRatedGames.map(g => [g.id || g.title, g])).values())
                        .sort((a, b) => (b.score || 0) - (a.score || 0));

                    const isSingleGame = uniqueHighRated.length === 1;

                    if (uniqueHighRated.length > 0) {
                        return (
                            <div className="relative group/carousel px-4 md:px-0">
                                <div className="flex items-center justify-between mb-4 mt-2">
                                    <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tighter italic border-l-4 border-yellow-400 pl-3">
                                        <Trophy className="w-6 h-6 text-yellow-400" />
                                        Featured Games
                                    </h3>
                                    {!isSingleGame && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => scrollHero('left')}
                                                className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-all active:scale-95"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => scrollHero('right')}
                                                className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-all active:scale-95"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div
                                    ref={heroScrollRef}
                                    onPointerDown={handleHeroPointerDown}
                                    onPointerMove={handleHeroPointerMove}
                                    onPointerUp={handleHeroPointerUpOrLeave}
                                    onPointerLeave={handleHeroPointerUpOrLeave}
                                    onPointerCancel={handleHeroPointerUpOrLeave}
                                    className={`overflow-x-auto flex gap-4 md:gap-6 pb-4 snap-x snap-mandatory custom-scrollbar select-none cursor-grab active:cursor-grabbing ${isSingleGame ? 'justify-center' : ''}`}
                                    style={{ scrollBehavior: 'smooth', touchAction: 'pan-y' }}
                                >
                                    {uniqueHighRated.map((game, idx) => (
                                        <div
                                            key={idx}
                                            onClick={(e) => {
                                                if (heroDragState.current.moved) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    heroDragState.current.moved = false; // reset for next time
                                                    return;
                                                }
                                                handlePlayGame(game);
                                            }}
                                            className={`shrink-0 snap-center ${isSingleGame ? 'w-full' : 'w-full md:w-[85%] lg:w-[70%]'} h-[200px] sm:h-[300px] md:h-[400px] rounded-3xl overflow-hidden relative transition-transform active:scale-[0.98] bg-[#1a1d24] shadow-2xl`}
                                        >
                                            {game.image ? (
                                                <img src={game.image} draggable={false} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" alt="" />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#13151a] via-[#13151a]/20 to-transparent opacity-90 pointer-events-none" />

                                            <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10 pointer-events-none">
                                                <div className="flex items-center gap-4 pointer-events-auto">
                                                    <button className="w-14 h-14 md:w-20 md:h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-90 flex-shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!heroDragState.current.moved) handlePlayGame(game);
                                                        }}
                                                    >
                                                        <Play className="w-6 h-6 md:w-10 md:h-10 fill-current ml-1" />
                                                    </button>
                                                    <div className="min-w-0">
                                                        <div className="px-2 py-1 md:px-3 md:py-1 bg-yellow-400 text-black rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-lg shadow-yellow-400/20 inline-flex items-center gap-1.5 mb-2">
                                                            <Trophy className="w-3 h-3" /> Featured {game.score ? `• ${game.score}/10` : '🔥'}
                                                        </div>
                                                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl truncate">
                                                            {game.title}
                                                        </h1>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}
            </section>

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
                <GameSlider
                    title="Recently Played"
                    icon={<RefreshCw className="w-6 h-6 text-blue-400" />}
                >
                    {recentlyPlayed.map((game, i) => (
                        <div key={i} className="w-[200px] sm:w-[240px] md:w-[320px]">
                            <GameCard
                                title={game.title}
                                image={game.image}
                                logoStyle={game.logoStyle || "text-white"}
                                onClick={() => handlePlayGame(game)}
                            />
                        </div>
                    ))}
                </GameSlider>
            )}

            {/* New Games */}
            <GameSlider
                title="New Games"
                icon={<Plus className="w-6 h-6 text-purple-400" />}
            >
                {[...fetchedGames].reverse().slice(0, 10).map((game, i) => (
                    <div key={i} className="w-[200px] sm:w-[240px] md:w-[320px]">
                        <GameCard
                            title={game.title}
                            image={game.image}
                            logoStyle={game.logoStyle || "text-white"}
                            onClick={() => handlePlayGame(game)}
                        />
                    </div>
                ))}
            </GameSlider>

            {/* Categories Sections */}
            {AVAILABLE_CATEGORIES.map((cat) => {
                const keywordsMap: any = {
                    puzzle: ['puzzle', 'quiz', 'brain', 'logic'],
                    action: ['action', 'sword', 'combat', 'battle'],
                    strategy: ['strategy', 'build', 'defense']
                };
                const catId = cat.id;
                const catGames = (fetchedGames || []).concat(games).filter(g =>
                    ((g.category || '').toLowerCase().includes(catId)) ||
                    (keywordsMap[catId] && keywordsMap[catId].some((k: string) => (g.title || '').toLowerCase().includes(k)))
                );

                if (catGames.length === 0) return null;

                return (
                    <div key={cat.id} id={`cat-${cat.id}`}>
                        <GameSlider
                            title={cat.name}
                            icon={cat.icon}
                        >
                            {catGames.map((game, i) => (
                                <div key={i} className="w-[200px] sm:w-[240px] md:w-[320px]">
                                    <GameCard
                                        title={game.title}
                                        image={game.image}
                                        logoStyle={game.logoStyle || "text-white"}
                                        onClick={() => handlePlayGame(game)}
                                    />
                                </div>
                            ))}
                        </GameSlider>
                    </div>
                );
            })}
        </div>
    );
};

export default HomeTab;
