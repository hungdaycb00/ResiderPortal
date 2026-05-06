import React from 'react';
import { ChevronRight } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';

interface SelectedUserGamesSectionProps {
    games: any[];
}

const INITIAL_GAME_LIMIT = 12;
const GAME_BATCH_SIZE = 12;

const SelectedUserGamesSection: React.FC<SelectedUserGamesSectionProps> = ({ games }) => {
    const [visibleGameCount, setVisibleGameCount] = React.useState(INITIAL_GAME_LIMIT);

    React.useEffect(() => {
        setVisibleGameCount(INITIAL_GAME_LIMIT);
    }, [games]);

    const visibleGames = React.useMemo(() => (games || []).slice(0, visibleGameCount), [games, visibleGameCount]);

    if (!games || games.length === 0) return null;

    return (
        <div className="mt-2">
            <h4 className="text-[13px] font-bold text-gray-900 mb-3">🎮 Games</h4>
            <div className="space-y-2">
                {visibleGames.map((g) => (
                    <div key={g.id || g.gameId} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                            {g.thumbnail ? (
                                <img src={normalizeImageUrl(g.thumbnail)} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                                <span>🎮</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 truncate">{g.name || g.title || 'Untitled Game'}</p>
                            <p className="text-[11px] text-gray-500">{g.type || 'Game'} {g.playCount ? `• ${g.playCount} plays` : ''}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                ))}
                {visibleGameCount < games.length && (
                    <button
                        type="button"
                        onClick={() => setVisibleGameCount((count) => count + GAME_BATCH_SIZE)}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                    >
                        Show more games
                    </button>
                )}
            </div>
        </div>
    );
};

export default SelectedUserGamesSection;
