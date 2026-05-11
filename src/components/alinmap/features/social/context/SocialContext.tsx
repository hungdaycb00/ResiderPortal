import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SocialContextType {
    sentFriendRequests: any[];
    setSentFriendRequests: React.Dispatch<React.SetStateAction<any[]>>;
    incomingFriendRequests: any[];
    fetchIncomingFriendRequests: () => Promise<void>;
    handleAcceptFriendRequest: (targetId: string) => Promise<void>;
    handleRejectFriendRequest: (targetId: string) => Promise<void>;
    friendIdInput: string;
    setFriendIdInput: React.Dispatch<React.SetStateAction<string>>;
    socialSection: 'friends' | 'nearby' | 'recent' | 'blocked';
    setSocialSection: React.Dispatch<React.SetStateAction<'friends' | 'nearby' | 'recent' | 'blocked'>>;
    notifications: any[];
    fetchNotifications: () => Promise<void>;
    handleAddFriend: (targetUser?: any) => Promise<void>;
    handleMessage: (targetUser?: any) => void;
    unreadCount: number;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

interface SocialProviderProps {
    children: ReactNode;
    user: any;
    externalApi: any;
    apiBase: string;
    showNotification?: (msg: string, type: 'success' | 'error' | 'info') => void;
    requireAuth: (actionLabel: string, afterLogin?: () => void) => boolean;
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    selectedUser?: any;
}

export const SocialProvider: React.FC<SocialProviderProps> = ({
    children,
    user,
    externalApi,
    apiBase,
    showNotification,
    requireAuth,
    onOpenChat,
    selectedUser
}) => {
    const [sentFriendRequests, setSentFriendRequests] = useState<any[]>([]);
    const [incomingFriendRequests, setIncomingFriendRequests] = useState<any[]>([]);
    const [friendIdInput, setFriendIdInput] = useState('');
    const [socialSection, setSocialSection] = useState<'friends' | 'nearby' | 'recent' | 'blocked'>('friends');
    const [notifications, setNotifications] = useState<any[]>([]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const resp = await fetch(`${apiBase}/api/notifications`, { headers: { 'X-Device-Id': externalApi.getDeviceId() }});
            const data = await resp.json();
            if (data.success) setNotifications(data.notifications);
        } catch (err) { console.error('Fetch notifications error:', err); }
    }, [apiBase, externalApi, user]);

    const handleAddFriend = async (targetUser?: any) => {
        if (!requireAuth('ket ban')) return;
        const userToAdd = targetUser || selectedUser;
        if (!userToAdd || !userToAdd.id) return;
        try {
            const resp = await fetch(`${apiBase}/api/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: externalApi.getDeviceId(), targetId: userToAdd.id }),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to send friend request.');
            setSentFriendRequests(prev => prev.some(r => r.id === userToAdd.id) ? prev : [...prev, userToAdd]);
            showNotification?.(`Friend request sent to ${userToAdd.username || userToAdd.id}!`, 'success');
        } catch (err: any) {
            const msg = String(err.message ?? '');
            if (msg.includes('409') || msg.toLowerCase().includes('already')) {
                showNotification?.("Request already sent or you are already friends!", 'info');
            } else { showNotification?.(err.message || "Failed to send friend request.", 'error'); }
        }
    };

    const handleMessage = (targetUser?: any) => {
        if (!requireAuth('nhan tin')) return;
        const userToMsg = targetUser || selectedUser;
        if (!userToMsg || !onOpenChat) return;
        onOpenChat(userToMsg.id, userToMsg.username || 'User', userToMsg.avatar_url || userToMsg.photoURL || '');
    };

    const fetchIncomingFriendRequests = useCallback(async () => {
        try {
            const resp = await fetch(`${apiBase}/api/friends`, {
                headers: { 'X-Device-Id': externalApi.getDeviceId() },
            });
            const data = await resp.json();
            if (data.requests) setIncomingFriendRequests(data.requests);
        } catch (err) {
            console.error('Fetch friend requests error:', err);
        }
    }, [apiBase, externalApi]);

    const handleAcceptFriendRequest = async (targetId: string) => {
        try {
            const resp = await fetch(`${apiBase}/api/friends/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId }),
            });
            if (resp.ok) {
                setIncomingFriendRequests(prev => prev.filter(r => r.id !== targetId));
                showNotification?.('Đã chấp nhận lời mời kết bạn!', 'success');
            }
        } catch (err: any) {
            showNotification?.('Không thể chấp nhận lời mời', 'error');
        }
    };

    const handleRejectFriendRequest = async (targetId: string) => {
        try {
            const resp = await fetch(`${apiBase}/api/friends/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId }),
            });
            if (resp.ok) {
                setIncomingFriendRequests(prev => prev.filter(r => r.id !== targetId));
                showNotification?.('Đã từ chối lời mời kết bạn', 'info');
            }
        } catch (err: any) {
            showNotification?.('Không thể từ chối lời mời', 'error');
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <SocialContext.Provider value={{
            sentFriendRequests,
            setSentFriendRequests,
            incomingFriendRequests,
            fetchIncomingFriendRequests,
            handleAcceptFriendRequest,
            handleRejectFriendRequest,
            friendIdInput,
            setFriendIdInput,
            socialSection,
            setSocialSection,
            notifications,
            fetchNotifications,
            handleAddFriend,
            handleMessage,
            unreadCount
        }}>
            {children}
        </SocialContext.Provider>
    );
};

export const useSocial = () => {
    const context = useContext(SocialContext);
    if (context === undefined) {
        throw new Error('useSocial must be used within a SocialProvider');
    }
    return context;
};
