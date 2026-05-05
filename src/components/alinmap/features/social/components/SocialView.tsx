import React from 'react';
import { Navigation, Compass, Edit } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import CreatePostForm from '../../creator/components/CreatePostForm';
import PostCard from '../../profile/components/PostCard';

interface SocialViewProps {
    myUserId: string | null;
    myObfPos: { lat: number; lng: number } | null;
    friends: any[];
    nearbyUsers: any[];
    setSelectedUser: (user: any) => void;
    radius: number;
    handleUpdateRadius: (radius: number) => void;
    isVisibleOnMap: boolean;
    setIsVisibleOnMap: (v: boolean) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    requestLocation?: (forceInvisible?: boolean, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    userPosts: any[];
    isCreatingPost: boolean;
    setIsCreatingPost: (v: boolean) => void;
    postTitle: string;
    setPostTitle: (v: string) => void;
    postPrivacy: 'public' | 'friends' | 'private';
    setPostPrivacy: (v: 'public' | 'friends' | 'private') => void;
    isSavingPost: boolean;
    handleCreatePost: (files: File[]) => void;
    handleUpdatePostPrivacy: (postId: string, privacy: string) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    fetchUserPosts: (uid: string) => void;
    externalApi: any;
    galleryActive: boolean;
    user: any;
    socialSubTab: 'posts' | 'nearby';
}

const INITIAL_POST_LIMIT = 8;
const POST_BATCH_SIZE = 8;
const INITIAL_NEARBY_LIMIT = 32;
const NEARBY_BATCH_SIZE = 32;

const SocialView: React.FC<SocialViewProps> = ({
    myUserId, myObfPos, nearbyUsers,
    setSelectedUser, radius, handleUpdateRadius,
    isVisibleOnMap, setIsVisibleOnMap, requireAuth, requestLocation, ws,
    userPosts, isCreatingPost, setIsCreatingPost, postTitle, setPostTitle,
    postPrivacy, setPostPrivacy, isSavingPost, handleCreatePost,
    handleUpdatePostPrivacy, handleStarPost, handleDeletePost, fetchUserPosts,
    externalApi, socialSubTab,
}) => {
    const [visiblePostCount, setVisiblePostCount] = React.useState(INITIAL_POST_LIMIT);
    const [visibleNearbyCount, setVisibleNearbyCount] = React.useState(INITIAL_NEARBY_LIMIT);

    React.useEffect(() => {
        setVisiblePostCount(INITIAL_POST_LIMIT);
    }, [socialSubTab, userPosts]);

    React.useEffect(() => {
        setVisibleNearbyCount(INITIAL_NEARBY_LIMIT);
    }, [socialSubTab, radius, nearbyUsers]);

    const nearbyUsersInRange = React.useMemo(() => nearbyUsers.filter((u) => {
        if (!myObfPos || typeof u?.lat !== 'number' || typeof u?.lng !== 'number') return true;
        const dLat = u.lat - myObfPos.lat;
        const dLng = u.lng - myObfPos.lng;
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
        return distKm <= radius;
    }), [nearbyUsers, myObfPos, radius]);

    const visiblePosts = React.useMemo(() => (
        userPosts.slice(0, visiblePostCount)
    ), [userPosts, visiblePostCount]);

    const visibleNearbyUsers = React.useMemo(() => (
        nearbyUsersInRange.slice(0, visibleNearbyCount)
    ), [nearbyUsersInRange, visibleNearbyCount]);

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                <h3 className="text-lg font-black text-gray-900 px-1">Social</h3>

                {socialSubTab === 'posts' ? (
                    <div className="space-y-4">
                        <div className="mb-4">
                            <CreatePostForm
                                isCreatingPost={isCreatingPost}
                                setIsCreatingPost={setIsCreatingPost}
                                postTitle={postTitle}
                                setPostTitle={setPostTitle}
                                postPrivacy={postPrivacy}
                                setPostPrivacy={setPostPrivacy}
                                isSavingPost={isSavingPost}
                                handleCreatePost={handleCreatePost}
                            />
                        </div>
                        {userPosts.length > 0 ? (
                            <div className="space-y-0">
                                {visiblePosts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        isSelf={post.user_id === myUserId}
                                        onStar={handleStarPost}
                                        onDelete={handleDeletePost}
                                        onUpdatePrivacy={handleUpdatePostPrivacy}
                                        externalApi={externalApi}
                                        fetchUserPosts={fetchUserPosts}
                                        requireAuth={requireAuth}
                                    />
                                ))}
                                {visiblePostCount < userPosts.length && (
                                    <button
                                        type="button"
                                        onClick={() => setVisiblePostCount((count) => count + POST_BATCH_SIZE)}
                                        className="w-full mt-2 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                                    >
                                        Show more posts
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <Edit className="w-7 h-7 text-gray-200" />
                                </div>
                                <p className="text-gray-400 text-sm">No posts yet</p>
                                <p className="text-[10px] text-gray-400 mt-1">Check back later or share something!</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5 pt-1">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 content-auto">
                            <h4 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Compass className="w-4 h-4 text-blue-500" /> Privacy & Location
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[11px] font-bold text-gray-500">Obfuscation Radius</span>
                                        <span className="text-[11px] font-bold text-blue-600">{radius} km</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10000"
                                        step="10"
                                        value={radius}
                                        onChange={(e) => {
                                            if (requireAuth && !requireAuth('update privacy settings')) return;
                                            handleUpdateRadius(parseInt(e.target.value, 10));
                                        }}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
                                    <div>
                                        <span className="text-[11px] font-bold text-gray-700 block">Visible on Map</span>
                                        <span className="text-[9px] font-medium text-gray-400">{isVisibleOnMap ? 'Others can see you' : 'Ghost mode'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="relative inline-flex items-center cursor-pointer"
                                        onClick={() => {
                                            if (requireAuth && !requireAuth('update map visibility')) return;
                                            const newVal = !isVisibleOnMap;
                                            if (newVal && requestLocation) {
                                                requestLocation(false, ws, setIsVisibleOnMap);
                                                return;
                                            }
                                            setIsVisibleOnMap(newVal);
                                            if (ws.current?.readyState === WebSocket.OPEN) {
                                                ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: newVal } }));
                                            }
                                        }}
                                    >
                                        <span className={`block w-9 h-5 rounded-full transition-colors ${isVisibleOnMap ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                            <span className={`block w-4 h-4 bg-white rounded-full mt-0.5 ml-0.5 transition-transform shadow-sm ${isVisibleOnMap ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider">
                                Nearby People ({nearbyUsersInRange.length})
                            </h4>
                            {nearbyUsersInRange.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {visibleNearbyUsers.map((u) => (
                                        <button
                                            type="button"
                                            key={u.id}
                                            onClick={() => setSelectedUser(u)}
                                            className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-2xl px-2 transition-colors cursor-pointer group text-left content-auto"
                                        >
                                            <span className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 relative">
                                                <img
                                                    src={normalizeImageUrl(u.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}`}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover"
                                                    alt={u.username || ''}
                                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || 'U')}&background=3b82f6&color=fff&size=100`; }}
                                                />
                                                {u.gallery?.active && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse" />}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-900 text-sm truncate">{u.username || 'Mysterious User'}</span>
                                                    {u.isSelf && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">You</span>}
                                                </span>
                                                <span className="block text-[11px] text-gray-400 truncate">{u.status || 'Exploring digital world'}</span>
                                            </span>
                                            <span className="text-[10px] text-gray-300 font-bold uppercase group-hover:text-blue-500 transition-colors">View</span>
                                        </button>
                                    ))}
                                    {visibleNearbyCount < nearbyUsersInRange.length && (
                                        <button
                                            type="button"
                                            onClick={() => setVisibleNearbyCount((count) => count + NEARBY_BATCH_SIZE)}
                                            className="w-full mt-3 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                                        >
                                            Show more people
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 text-center bg-gray-50 rounded-[32px]">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <Navigation className="w-6 h-6 text-gray-200" />
                                    </div>
                                    <p className="text-gray-400 text-xs font-medium">No active users found nearby</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(SocialView);
