import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SocialContextType {
    sentFriendRequests: string[];
    setSentFriendRequests: React.Dispatch<React.SetStateAction<string[]>>;
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
    const [sentFriendRequests, setSentFriendRequests] = useState<string[]>([]);
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
        if (!userToAdd) return;
        try {
            const resp = await fetch(`${apiBase}/api/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: externalApi.getDeviceId(), targetId: userToAdd.id }),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to send friend request.');
            setSentFriendRequests(prev => prev.includes(userToAdd.id) ? prev : [...prev, userToAdd.id]);
            showNotification?.(`Friend request sent to ${userToAdd.username || userToAdd.id}!`, 'success');
        } catch (err: any) {
            if (err.message.includes('409') || err.message.toLowerCase().includes('already')) {
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

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <SocialContext.Provider value={{
            sentFriendRequests,
            setSentFriendRequests,
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
