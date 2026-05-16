import { Users, UserPlus, UserMinus, Check, X, Mail, RefreshCw, Layout } from 'lucide-react';
import { externalApi } from '../services/externalApi';
import { resolveAvatarSrc } from '../utils/avatar';

export default function FriendsView({ friends, requests, onAddFriend, onAccept, onReject, onRemove, friendInput, setFriendInput, onRefresh }: { 
  friends: any[], 
  requests: any[], 
  onAddFriend: () => void, 
  onAccept: (id: string) => void, 
  onReject: (id: string) => void, 
  onRemove: (id: string) => void,
  friendInput: string,
  setFriendInput: (val: string) => void,
  onRefresh?: () => void
}) {
  return (
    <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="md:col-span-2 space-y-6">
        {/* Friends List */}
        <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-gray-800 bg-[#252830]/50 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Friends ({friends.length})
            </h2>
          </div>
          <div className="p-4">
            {friends.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-[#252830]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={resolveAvatarSrc(friend.photoURL || friend.avatar_url || friend.avatarUrl, friend.displayName || friend.display_name || friend.username || friend.id)} className="w-10 h-10 rounded-full border border-gray-700" alt="" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a1d24] rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{friend.display_name || friend.displayName || friend.id}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active now</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(friend.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remove Friend"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 opacity-50">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p>No friends yet. Add some now!</p>
              </div>
            )}
          </div>
        </div>

        {/* Friend Requests */}
        <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-gray-800 bg-[#252830]/50 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-yellow-400" />
              Friend Requests ({requests.length})
            </h2>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-4 space-y-3">
            {requests.length > 0 ? requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-[#252830]/50 border border-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <img src={resolveAvatarSrc(req.photoURL || req.avatar_url || req.avatarUrl, req.displayName || req.display_name || req.username || req.id)} className="w-10 h-10 rounded-full border border-gray-700" alt="" />
                  <div>
                    <p className="text-sm font-bold text-white">{req.display_name || req.displayName || req.id}</p>
                    <p className="text-[10px] text-gray-500">Wants to be your friend</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onAccept(req.id)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onReject(req.id)}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-gray-500 opacity-50">
                <p>No friend requests.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Add Friend Box */}
        <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-400" />
            Add Friend
          </h3>
          <p className="text-xs text-gray-400 mb-4">Enter the User ID you want to be friends with.</p>
          <div className="space-y-3">
            <input 
              type="text" 
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              placeholder="User ID (e.g. device_abc123)" 
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button 
              onClick={onAddFriend}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Send Request
            </button>
          </div>
        </div>

        {/* My ID Box */}
        <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-6 shadow-xl border-dashed">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your ID</h3>
          <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
            <code className="text-sm text-blue-400 font-mono">{externalApi.getDeviceId()}</code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(externalApi.getDeviceId());
              }}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
            >
              <Layout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
