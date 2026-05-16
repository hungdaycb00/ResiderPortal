import React from 'react';
import { Users, RefreshCw, MessageSquare } from 'lucide-react';
import { resolveAvatarSrc } from '../../utils/avatar';

export interface CommunityTabProps {
    fetchedFriends: any[];
    fetchExternalData: () => void;
}

const CommunityTab: React.FC<CommunityTabProps> = ({ fetchedFriends, fetchExternalData }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-400" />
                    Community Hub
                </h2>
                <button onClick={() => fetchExternalData()} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white" title="Refresh">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-400" />
                            Recent Discussions
                        </h3>
                        <div className="space-y-4">
                            {[
                                { title: "Best strategy for Galaxy Runners?", author: "SpaceCadet", replies: 24, time: "2h ago" },
                                { title: "New high score in Pixel Quest!", author: "RetroGamer", replies: 12, time: "5h ago" },
                                { title: "Looking for a team for Dungeon Delve", author: "Knight99", replies: 8, time: "1d ago" },
                            ].map((topic, i) => (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-700">
                                    <div>
                                        <h4 className="font-medium text-blue-400">{topic.title}</h4>
                                        <p className="text-xs text-gray-500">by {topic.author} • {topic.time}</p>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded-md">{topic.replies} replies</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6">
                        <h3 className="font-bold mb-4">Online Now</h3>
                        <div className="space-y-3">
                            {fetchedFriends.length > 0 ? (
                                fetchedFriends.map((friend, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={resolveAvatarSrc(friend.photoURL || friend.avatar_url || friend.avatarUrl, friend.displayName || friend.name || `User_${i}`)} className="w-8 h-8 rounded-full border border-gray-700" alt="User" />
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${friend.online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-[#1a1d24]`} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-300">{friend.displayName || friend.name || `User_${i}`}</span>
                                    </div>
                                ))
                            ) : (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={resolveAvatarSrc(null, `User_${i}`)} className="w-8 h-8 rounded-full border border-gray-700" alt="User" />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1d24]" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-300">User_{i}42</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityTab;
