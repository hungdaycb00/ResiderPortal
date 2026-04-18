import { X, Grid, Play, Loader2, Zap, HelpCircle } from 'lucide-react';

export default function GameListModal({ isOpen, onClose, games, onPlayGame, serverStatus, serverError, cloudflareUrl, setCloudflareUrl, onCheckConnection }: { isOpen: boolean, onClose: () => void, games: any[], onPlayGame: (game: any) => void, serverStatus: string, serverError: string | null, cloudflareUrl: string, setCloudflareUrl: (url: string) => void, onCheckConnection: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Grid className="w-5 h-5 text-blue-400" />
            Game List
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 border-b border-gray-800">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Cloudflare Tunnel URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cloudflareUrl}
              onChange={(e) => setCloudflareUrl(e.target.value)}
              placeholder="https://your-tunnel.trycloudflare.com"
              className="flex-1 p-2 bg-gray-800 rounded-lg border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={onCheckConnection}
              disabled={serverStatus === 'checking'}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                serverStatus === 'online' ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30' :
                serverStatus === 'offline' ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {serverStatus === 'checking' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  Check Connection
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {games.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-4 lg:gap-5">
              {games.map((game) => (
                <div key={game.id} className="flex flex-col bg-[#252830] border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 group">
                  {/* Thumbnail Container */}
                  <div className="w-full aspect-video bg-gray-900 border-b border-gray-800 relative overflow-hidden">
                    {game.image ? (
                      <img 
                        src={game.image} 
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                        alt={game.title || game.name} 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-gray-800 to-gray-900">
                        <Grid className="w-8 h-8 text-gray-700 mb-2" />
                        <span className="text-[10px] text-gray-600 font-mono font-bold">{game.fileName?.split('.').pop()?.toUpperCase() || 'GAME'}</span>
                      </div>
                    )}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px]">
                      <button 
                        onClick={() => { onPlayGame(game); onClose(); }}
                        className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all"
                        title="Play now"
                      >
                        <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Info Section */}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-gray-100 truncate" title={game.title || game.name}>
                      {game.title || game.name || 'Untitled'}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-500 truncate max-w-[100px]" title={game.fileName}>
                        {game.fileName || 'web/index.html'}
                      </p>
                      <span className="text-[9px] font-mono font-bold text-blue-400/70 border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 rounded">
                        #{game.id}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              {serverStatus === 'checking' ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading game list from server...</p>
                </>
              ) : serverStatus === 'offline' ? (
                <>
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-red-200 mb-2">Connection Failed</h3>
                  <p className="text-sm text-red-400/80 max-w-xs mx-auto mb-4">
                    {serverError || 'Could not connect to server. Please check your Cloudflare Tunnel URL.'}
                  </p>
                  <button 
                    onClick={onCheckConnection}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold transition-all"
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <HelpCircle className="w-8 h-8 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No games found</p>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-[#252830]/50 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500 italic">Data fetched directly from server via Proxy</p>
        </div>
      </div>
    </div>
  );
}
