import { useState, useEffect } from 'react';
import { Grid, Play, Trash2, Shield, RefreshCw, Image as ImageIcon, Check, Save, Anchor, User, Search, RotateCcw } from 'lucide-react';
import { externalApi } from '../services/externalApi';
export default function AdminView({ games, onDeleteGame, onPlayGame, onRefresh }: {
  games: any[],
  onDeleteGame: (id: string | number) => void,
  onPlayGame: (game: any) => void,
  onRefresh?: () => Promise<void> | void
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string | number, number>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string | number, 'idle' | 'saving' | 'success'>>({});
  const [activeTab, setActiveTab] = useState<'games' | 'sea'>('games');
  const [seaPlayers, setSeaPlayers] = useState<any[]>([]);
  const [seaSearch, setSeaSearch] = useState('');
  const [isResetting, setIsResetting] = useState<Record<string | number, boolean>>({});

  const fetchSeaPlayers = async () => {
    try {
      const res = await externalApi.adminSea.listPlayers({ search: seaSearch });
      if (res.success) {
        setSeaPlayers(res.data.players || []);
      }
    } catch (err) {
      console.error('Failed to fetch sea players:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'sea') {
      fetchSeaPlayers();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (activeTab === 'games' && onRefresh) {
        await onRefresh();
      } else if (activeTab === 'sea') {
        await fetchSeaPlayers();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetSea = async (saveId: string | number) => {
    if (!confirm('Bạn có chắc chắn muốn reset toàn bộ tiến trình Sea Game của người dùng này?')) return;
    
    setIsResetting(prev => ({ ...prev, [saveId]: true }));
    try {
      const res = await externalApi.adminSea.resetPlayer(saveId);
      if (res.success) {
        alert('Reset thành công!');
        fetchSeaPlayers();
      }
    } catch (err: any) {
      alert('Reset thất bại: ' + err.message);
    } finally {
      setIsResetting(prev => ({ ...prev, [saveId]: false }));
    }
  };

  const handleResetAllSea = async () => {
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn reset dữ liệu Sea Game của TẤT CẢ người dùng? Hành động này không thể hoàn tác!')) return;
    
    setIsRefreshing(true);
    try {
      const res = await externalApi.adminSea.resetAllPlayers();
      if (res.success) {
        alert('Đã reset tất cả người dùng thành công!');
        fetchSeaPlayers();
      }
    } catch (err: any) {
      alert('Reset thất bại: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleScoreChange = (gameId: string | number, value: string) => {
    const num = parseInt(value) || 0;
    setEditingScores(prev => ({ ...prev, [gameId]: num }));
    setSavingStatus(prev => ({ ...prev, [gameId]: 'idle' }));
  };

  const handleSaveScore = async (gameId: string | number) => {
    const score = editingScores[gameId];
    if (score === undefined) return;

    setSavingStatus(prev => ({ ...prev, [gameId]: 'saving' }));
    try {
      await externalApi.updateGameScore(gameId, score);
      setSavingStatus(prev => ({ ...prev, [gameId]: 'success' }));
      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [gameId]: 'idle' }));
      }, 2000);
    } catch (err) {
      console.error('Failed to update score:', err);
      setSavingStatus(prev => ({ ...prev, [gameId]: 'idle' }));
      alert('Error updating score');
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          Admin
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1d24] p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab('games')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'games' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Games
            </button>
            <button
              onClick={() => setActiveTab('sea')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sea' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Anchor className="w-3.5 h-3.5" />
              Sea Game
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-full transition-all active:scale-95 ${
              isRefreshing 
                ? "text-blue-400 bg-blue-400/10 cursor-not-allowed" 
                : "text-gray-400 hover:text-white hover:bg-gray-800 active:bg-gray-700"
            }`}
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {activeTab === 'games' ? (
        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-gray-800 bg-[#252830]/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-200 flex items-center gap-2">
              <Grid className="w-4 h-4 text-gray-400" />
                Game List ({games.length})
              </h3>
            </div>
            <div className="p-4">
              {games.length > 0 ? (
                <div className="space-y-3">
                  {games.map((game) => {
                    const currentScore = editingScores[game.id] ?? game.score ?? 0;
                    const status = savingStatus[game.id] || 'idle';
                    const isChanged = editingScores[game.id] !== undefined && editingScores[game.id] !== game.score;

                    return (
                      <div key={game.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#252830]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
                            {game.image ? (
                              <img src={game.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate">{game.title || game.name}</p>
                            <p className="text-xs text-gray-500 truncate">ID: {game.id} • {game.fileName || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                          <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg border border-gray-700/50">
                            <span className="text-[10px] uppercase font-bold text-gray-500 ml-2">Score</span>
                            <input
                              type="number"
                              value={currentScore}
                              onChange={(e) => handleScoreChange(game.id, e.target.value)}
                              className="w-16 bg-transparent text-sm font-bold text-center focus:outline-none text-blue-400"
                            />
                            <button
                              onClick={() => handleSaveScore(game.id)}
                              disabled={!isChanged || status === 'saving'}
                              className={`p-1.5 rounded-md transition-all ${
                                status === 'success' 
                                  ? "bg-green-500/20 text-green-400" 
                                  : isChanged && status !== 'saving'
                                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                    : "text-gray-600 cursor-not-allowed"
                              }`}
                            >
                              {status === 'saving' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : status === 'success' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1 border-l border-gray-800 pl-2">
                            <button 
                              onClick={() => onPlayGame(game)}
                              className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                              title="Play Game"
                            >
                              <Play className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => onDeleteGame(game.id)}
                              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Delete Game"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 opacity-50">
                  <Grid className="w-12 h-12 mx-auto mb-2" />
                  <p>No games found on server.</p>
                </div>
              )}
            </div>
          </div>
      ) : (
        <div className="bg-[#1a1d24] border border-gray-800 rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-gray-800 bg-[#252830]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-gray-200 flex items-center gap-2">
              <Anchor className="w-4 h-4 text-blue-500" />
              Sea Game Players ({seaPlayers.length})
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetAllSea}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg"
              >
                <RotateCcw className="w-3 h-3" />
                RESET ALL
              </button>
              
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm user..."
                  value={seaSearch}
                  onChange={(e) => setSeaSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSeaPlayers()}
                  className="bg-black/20 border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          <div className="p-4">
            {seaPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {seaPlayers.map((player) => (
                  <div key={player.saveId} className="p-4 bg-[#252830]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden border border-gray-700">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate text-sm">{player.displayName || 'Anonymous'}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          Tier {player.worldTier} • {player.seaGold} Gold • {player.distance}m
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleResetSea(player.saveId)}
                      disabled={isResetting[player.saveId]}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isResetting[player.saveId] ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      RESET
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 opacity-50">
                <Anchor className="w-12 h-12 mx-auto mb-2" />
                <p>No Sea Game players found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
