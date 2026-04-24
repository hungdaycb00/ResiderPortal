import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Play } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ImageGeneratorModal from './ImageGeneratorModal';
import GameListModal from './GameListModal';
import ReviewModal from './ReviewModal';
import AuthModal from './AuthModal';
import RoomListModal from './RoomListModal';
import ChatRoom from './ChatRoom';
import FriendsModal from './FriendsModal';

interface AppModalsProps {
    isConfirmOpen: boolean;
    setIsConfirmOpen: (v: boolean) => void;
    confirmDeleteGame: () => void;
    isModalOpen: boolean;
    setIsModalOpen: (v: boolean) => void;
    isGameListOpen: boolean;
    setIsGameListOpen: (v: boolean) => void;
    fetchedGames: any[];
    serverStatus: string;
    serverError: string | null;
    handlePlayGame: (game: any, bypassLobby?: boolean) => void;
    cloudflareUrl: string;
    setCloudflareUrl: (url: string) => void;
    checkServer: (url?: string) => void;
    showReviewModal: boolean;
    setShowReviewModal: (v: boolean) => void;
    reviewGameId: string | null;
    gameStartTime: number;
    showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
    isGameLoading: boolean;
    isAuthOpen: boolean;
    setIsAuthOpen: (v: boolean) => void;
    setAuthCallbackQueue: (fn: (() => void) | null) => void;
    setUser: (u: any) => void;
    fetchExternalData: () => void;
    isAuthCallbackQueue: (() => void) | null;
    isRoomModalOpen: boolean;
    selectedRoomGame: any;
    setIsRoomModalOpen: (v: boolean) => void;
    user: any;
    setCurrentJoinedRoomId: (id: string) => void;
    setPlayingGame: (v: any) => void;
    externalApi: any;
    isChatOpen: boolean;
    setIsChatOpen: (v: boolean) => void;
    chatTargetUser: any;
    fetchedFriends: any[];
    isFriendsOpen: boolean;
    setIsFriendsOpen: (v: boolean) => void;
    friendRequests: any[];
    handleAddFriend: (id: string) => Promise<void>;
    handleAcceptFriend: (id: string) => Promise<void>;
    handleRejectFriend: (id: string) => Promise<void>;
    handleRemoveFriend: (id: string) => Promise<void>;
}

export const AppModals: React.FC<AppModalsProps> = ({
    isConfirmOpen, setIsConfirmOpen, confirmDeleteGame,
    isModalOpen, setIsModalOpen,
    isGameListOpen, setIsGameListOpen, fetchedGames, serverStatus, serverError,
    handlePlayGame, cloudflareUrl, setCloudflareUrl, checkServer,
    showReviewModal, setShowReviewModal, reviewGameId, gameStartTime, showNotification,
    isGameLoading,
    isAuthOpen, setIsAuthOpen, setAuthCallbackQueue, setUser, fetchExternalData, isAuthCallbackQueue,
    isRoomModalOpen, selectedRoomGame, setIsRoomModalOpen, user, setCurrentJoinedRoomId, setPlayingGame, externalApi,
    isChatOpen, setIsChatOpen, chatTargetUser, fetchedFriends,
    isFriendsOpen, setIsFriendsOpen, friendRequests,
    handleAddFriend, handleAcceptFriend, handleRejectFriend, handleRemoveFriend,
}) => {
    return (
        <>
            <FriendsModal
                isOpen={isFriendsOpen}
                onClose={() => setIsFriendsOpen(false)}
                friends={fetchedFriends}
                requests={friendRequests}
                onAddFriend={async (targetId) => {
                    await handleAddFriend(targetId);
                    return { success: true, message: 'Friend request sent!' };
                }}
                onAccept={handleAcceptFriend}
                onReject={handleRejectFriend}
                onRemove={handleRemoveFriend}
                onRefresh={fetchExternalData}
            />

            <AnimatePresence>
                {isChatOpen && (
                    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsChatOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl h-[80vh] bg-[#1a1d24] border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-6 right-6 z-10">
                                <button
                                    onClick={() => setIsChatOpen(false)}
                                    className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors text-white backdrop-blur-md"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <ChatRoom
                                deviceId={externalApi.getDeviceId()}
                                currentUserId={user?.uid}
                                userName={user?.displayName || ''}
                                userAvatar={user?.photoURL || ''}
                                targetUser={chatTargetUser}
                                friends={fetchedFriends}
                                onClose={() => setIsChatOpen(false)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeleteGame}
                title="Confirm Delete"
                message="Are you sure you want to delete this game? This action cannot be undone."
            />
            <ImageGeneratorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <GameListModal
                isOpen={isGameListOpen}
                onClose={() => setIsGameListOpen(false)}
                games={fetchedGames}
                serverStatus={serverStatus as any}
                serverError={serverError}
                onPlayGame={handlePlayGame}
                cloudflareUrl={cloudflareUrl}
                setCloudflareUrl={setCloudflareUrl}
                onCheckConnection={() => checkServer(cloudflareUrl)}
            />

            <ReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                reviewGameId={reviewGameId}
                gameStartTime={gameStartTime}
                showNotification={showNotification}
            />

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

            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => {
                    setIsAuthOpen(false);
                    setAuthCallbackQueue(null);
                }}
                onSuccess={(u) => {
                    setUser(u);
                    localStorage.setItem('user', JSON.stringify(u));
                    fetchExternalData();
                    if (isAuthCallbackQueue) {
                        isAuthCallbackQueue();
                        setAuthCallbackQueue(null);
                    }
                }}
            />

            <AnimatePresence>
                {isRoomModalOpen && selectedRoomGame && (
                    <RoomListModal
                        game={selectedRoomGame}
                        user={user}
                        onClose={() => setIsRoomModalOpen(false)}
                        onCreateRoom={async (roomData) => {
                            try {
                                const res = await externalApi.createP2PRoom({
                                    ...roomData,
                                    gameId: selectedRoomGame.id.toString(),
                                    hostId: user?.uid || externalApi.getDeviceId(),
                                    hostName: user?.displayName || 'Guest'
                                });

                                if (res.success) {
                                    setIsRoomModalOpen(false);
                                    setCurrentJoinedRoomId(res.roomId);

                                    const deviceId = externalApi.getDeviceId();
                                    const targetUrl = cloudflareUrl || import.meta.env.VITE_EXTERNAL_API_URL || '';
                                    const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                                    const gamePath = selectedRoomGame.fileName || `${selectedRoomGame.id}/index.html`;

                                    const launchUrl = `${baseUrl}/games/${gamePath}?deviceId=${encodeURIComponent(deviceId)}&room=${res.roomId}&isHost=true&id=${selectedRoomGame.id}`;

                                    setPlayingGame({
                                        title: selectedRoomGame.title || selectedRoomGame.name,
                                        gameUrl: launchUrl
                                    });
                                }
                            } catch (err: any) {
                                showNotification(err.message, 'error');
                            }
                        }}
                        onJoinRoom={async (room, password) => {
                            try {
                                const res = await externalApi.joinP2PRoom(room.id, {
                                    playerId: user?.uid || externalApi.getDeviceId(),
                                    playerName: user?.displayName || 'Guest',
                                    password
                                });

                                if (res.success) {
                                    setIsRoomModalOpen(false);
                                    setCurrentJoinedRoomId(room.id);

                                    const deviceId = externalApi.getDeviceId();
                                    const targetUrl = cloudflareUrl || import.meta.env.VITE_EXTERNAL_API_URL || '';
                                    const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                                    const gamePath = selectedRoomGame.fileName || `${selectedRoomGame.id}/index.html`;

                                    const launchUrl = `${baseUrl}/games/${gamePath}?deviceId=${encodeURIComponent(deviceId)}&room=${room.id}&isHost=false&id=${selectedRoomGame.id}`;

                                    setPlayingGame({
                                        title: selectedRoomGame.title || selectedRoomGame.name,
                                        gameUrl: launchUrl
                                    });
                                }
                            } catch (err: any) {
                                showNotification(err.message, 'error');
                            }
                        }}
                        onLoginRequest={() => {
                            setIsAuthOpen(true);
                        }}
                        onPlaySolo={() => {
                            if (selectedRoomGame) {
                                setIsRoomModalOpen(false);
                                handlePlayGame(selectedRoomGame, true);
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
