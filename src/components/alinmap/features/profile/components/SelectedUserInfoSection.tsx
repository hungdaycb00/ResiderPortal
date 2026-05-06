import React from 'react';
import { UserPlus, MessageCircle, MapPin, Flag } from 'lucide-react';

interface SelectedUserInfoSectionProps {
    selectedUser: any;
    friends: any[];
    sentFriendRequests: any[];
    handleAddFriend: () => void;
    handleMessage: () => void;
    onLocateUser: (lat: number, lng: number) => void;
    isReporting: boolean;
    setIsReporting: (v: boolean) => void;
    reportStatus: string;
    reportReason: string;
    setReportReason: (v: string) => void;
    setReportStatus: (v: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
}

const SelectedUserInfoSection: React.FC<SelectedUserInfoSectionProps> = ({
    selectedUser,
    friends,
    sentFriendRequests,
    handleAddFriend,
    handleMessage,
    onLocateUser,
    isReporting,
    setIsReporting,
    reportStatus,
    reportReason,
    setReportReason,
    setReportStatus,
    ws,
    requireAuth,
}) => (
    <>
        <p className="text-gray-500 text-[13px] truncate mb-2">{selectedUser.status || 'Exploring the digital universe'}</p>
        <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
            {(selectedUser.tags || ['#GAMER', '#ALIN']).map((tag: string) => (
                <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                    {tag.toUpperCase()}
                </span>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pb-8">
            {!sentFriendRequests.includes(selectedUser.id) && !friends.some(f => f.id === selectedUser.id) && (
                <button onClick={handleAddFriend} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-[20px] font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                    <UserPlus className="w-5 h-5" /> Add Friend
                </button>
            )}
            <div className={`flex gap-3 ${sentFriendRequests.includes(selectedUser.id) || friends.some(f => f.id === selectedUser.id) ? 'col-span-2' : ''}`}>
                <button onClick={handleMessage} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold active:scale-95 transition-all shadow-sm">
                    <MessageCircle className="w-5 h-5" /> Message
                </button>
                <button onClick={() => { onLocateUser(selectedUser.lat, selectedUser.lng); }} className="px-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-blue-600 rounded-[20px] active:scale-95 transition-all shadow-sm">
                    <MapPin className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="mt-2 mb-6">
            {!isReporting ? (
                <button onClick={() => { if (requireAuth && !requireAuth('bao cao nguoi dung')) return; setIsReporting(true); }} className="flex items-center gap-2 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors px-2 py-1">
                    <Flag className="w-3.5 h-3.5" /> Report User
                </button>
            ) : (
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase font-bold text-red-500">Report Content/User</p>
                        {reportStatus && <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{reportStatus}</p>}
                    </div>
                    <textarea
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                        placeholder="Why are you reporting this user?"
                        className="w-full bg-white text-gray-900 border border-red-200 rounded-lg p-2 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 mb-2 resize-none h-16"
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setIsReporting(false); setReportReason(''); }} className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                        <button
                            onClick={() => {
                                if (requireAuth && !requireAuth('bao cao nguoi dung')) return;
                                if (ws.current?.readyState === WebSocket.OPEN && reportReason.trim()) {
                                    ws.current.send(JSON.stringify({ type: 'REPORT_USER', payload: { reportedId: selectedUser.id, reason: reportReason.trim() } }));
                                    setReportReason('');
                                    setReportStatus('Report submitted!');
                                    setTimeout(() => { setReportStatus(''); setIsReporting(false); }, 2000);
                                }
                            }}
                            className="px-3 py-1.5 text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                            disabled={!reportReason.trim()}
                        >
                            Submit Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    </>
);

export default SelectedUserInfoSection;
