import React from 'react';
import { Bell } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import { useSocial } from '../context/SocialContext';

interface NotificationsViewProps {
    externalApi: any;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ externalApi }) => {
    const { notifications, fetchNotifications } = useSocial();

    return (
        <div className="space-y-4 pt-16 md:pt-4">
            <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-lg font-black text-gray-900">Notifications</h3>
                {notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <button 
                        onClick={async () => {
                            const API_BASE = externalApi.getBaseUrl ? externalApi.getBaseUrl() : 'https://api.alin.city';
                            await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT', headers: { 'X-Device-Id': externalApi.getDeviceId() }});
                            if (fetchNotifications) fetchNotifications();
                        }} 
                        className="text-xs text-blue-600 font-bold hover:underline"
                    >
                        Mark all read
                    </button>
                )}
            </div>
            {notifications.length > 0 ? (
                <div className="divide-y divide-gray-50 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {notifications.map((n: any) => (
                        <div key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${!n.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                            <div className="relative shrink-0">
                                <img src={normalizeImageUrl(n.actor?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.actor?.name || 'User')}&background=random`} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
                                {!n.isRead && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm text-gray-900"><span className="font-bold">{n.actor?.name}</span> {n.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4"><Bell className="w-8 h-8 text-gray-300" /></div>
                    <p className="text-gray-500 font-bold text-sm">No notifications</p>
                    <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                </div>
            )}
        </div>
    );
};

export default NotificationsView;
