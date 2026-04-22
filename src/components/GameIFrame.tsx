import React from 'react';
import { Play } from 'lucide-react';

export interface GameIFrameProps {
    playingGame: { title: string, gameUrl: string } | null;
    setPlayingGame: (game: null) => void;
    isGameLoading: boolean;
    setGameStartTime: (time: number) => void;
    showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const GameIFrame: React.FC<GameIFrameProps> = ({
    playingGame,
    setPlayingGame,
    isGameLoading,
    setGameStartTime,
    showNotification
}) => {
    return (
        <>
            {/* Loading Overlay */}
            {isGameLoading && (
                <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="w-20 h-20 relative mb-6">
                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-8 h-8 text-blue-500 ml-1" fill="currentColor" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Loading game...</h3>
                    <p className="text-gray-400 text-sm animate-pulse">Please wait a moment</p>
                </div>
            )}

            {/* Fullscreen Game Iframe Overlay */}
            {playingGame && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-300">
                    <iframe
                        src={playingGame.gameUrl}
                        className="w-full flex-1 border-none bg-black"
                        title={playingGame.title}
                        sandbox="allow-scripts allow-pointer-lock allow-forms allow-popups allow-same-origin"
                        allowFullScreen
                        onLoad={() => setGameStartTime(Date.now())}
                        onError={() => {
                            showNotification('An error occurred while loading the game. File might be missing.', 'error');
                            setPlayingGame(null);
                        }}
                    ></iframe>
                </div>
            )}
        </>
    );
};

export default GameIFrame;
