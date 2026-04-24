import { useState } from 'react';
import { externalApi } from '../services/externalApi';

export function useFriendActions(
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void,
    fetchExternalData: () => void,
) {
    const [friendInput, setFriendInput] = useState('');
    const [isFriendsOpen, setIsFriendsOpen] = useState(false);

    const handleAddFriend = async (userId?: string) => {
        const targetId = userId || friendInput.trim();
        if (!targetId) return;
        try {
            await externalApi.addFriend(targetId);
            showNotification('Friend request sent!', 'success');
            setFriendInput('');
            fetchExternalData();
        } catch (err: any) { showNotification(err.message, 'error'); }
    };

    const handleAcceptFriend = async (targetId: string) => {
        try {
            await externalApi.acceptFriend(targetId);
            showNotification('Friend request accepted!', 'success');
            fetchExternalData();
        } catch (err: any) { showNotification(err.message, 'error'); }
    };

    const handleRejectFriend = async (targetId: string) => {
        try {
            await externalApi.rejectFriend(targetId);
            showNotification('Friend request rejected!', 'success');
            fetchExternalData();
        } catch (err: any) { showNotification(err.message, 'error'); }
    };

    const handleRemoveFriend = async (targetId: string) => {
        try {
            await externalApi.removeFriend(targetId);
            showNotification('Friend removed!', 'success');
            fetchExternalData();
        } catch (err: any) { showNotification(err.message, 'error'); }
    };

    return {
        friendInput, setFriendInput,
        isFriendsOpen, setIsFriendsOpen,
        handleAddFriend, handleAcceptFriend, handleRejectFriend, handleRemoveFriend,
    };
}
