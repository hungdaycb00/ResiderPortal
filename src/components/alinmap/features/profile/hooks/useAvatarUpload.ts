import React, { useState, useRef } from 'react';
import { getBaseUrl } from '../../../../../services/externalApi';
import { PROFILE_AVATAR_PRESETS } from '../../../../../utils/avatarPresets';

interface UseAvatarUploadParams {
    user: any;
    ws: React.MutableRefObject<WebSocket | null>;
    setMyAvatarUrl: (v: string) => void;
    onUpdateAvatar?: (avatarUrl: string) => Promise<void> | void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    triggerAuth?: (callback: () => void) => void;
    externalApi: any;
}

export function useAvatarUpload({ user, ws, setMyAvatarUrl, onUpdateAvatar, showNotification, triggerAuth, externalApi }: UseAvatarUploadParams) {
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const persistAvatar = async (avatarUrl: string) => {
        if (!user) {
            triggerAuth?.(() => {});
            return false;
        }

        if (onUpdateAvatar) {
            await onUpdateAvatar(avatarUrl);
        } else {
            await externalApi.request('/api/update-profile', {
                method: 'POST',
                body: JSON.stringify({ avatarUrl }),
            });
        }

        try {
            const savedUserRaw = localStorage.getItem('user');
            if (savedUserRaw) {
                const savedUser = JSON.parse(savedUserRaw);
                localStorage.setItem('user', JSON.stringify({ ...savedUser, photoURL: avatarUrl }));
            }
        } catch {}

        setMyAvatarUrl(avatarUrl);
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: avatarUrl } }));
        }
        return true;
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) {
            triggerAuth?.(() => {});
            return;
        }
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 1024 * 1024) {
            showNotification?.('Anh tai len khong duoc vuot qua 1MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch(`${getBaseUrl()}/api/profile/upload-avatar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user?.uid || ''}` },
                body: formData,
            });
            const data = await res.json();
            const imageUrl = data.imageUrl || data.url;
            if (res.ok && imageUrl) {
                try {
                    await persistAvatar(imageUrl);
                    showNotification?.('Cap nhat anh dai dien thanh cong', 'success');
                } catch (profileErr) {
                    console.error(profileErr);
                    showNotification?.('Luu anh dai dien len server that bai', 'error');
                }
            } else {
                showNotification?.(data.error || 'Loi tai anh', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification?.('Loi ket noi khi tai anh', 'error');
        }
        setShowAvatarMenu(false);
    };

    const handleDefaultAvatar = async () => {
        try {
            const updated = await persistAvatar('');
            if (!updated) {
                setShowAvatarMenu(false);
                return;
            }
            showNotification?.('Da doi ve anh mac dinh', 'success');
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu anh mac dinh len server', 'error');
        }
        setShowAvatarMenu(false);
    };

    const handlePresetAvatarSelect = async (avatarUrl: string) => {
        try {
            const updated = await persistAvatar(avatarUrl);
            if (!updated) {
                setShowAvatarMenu(false);
                return;
            }
            showNotification?.('Da cap nhat avatar san co', 'success');
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu avatar san co', 'error');
        }
        setShowAvatarMenu(false);
    };

    return {
        showAvatarMenu,
        setShowAvatarMenu,
        avatarInputRef,
        presetAvatars: PROFILE_AVATAR_PRESETS,
        handleAvatarUpload,
        handleDefaultAvatar,
        handlePresetAvatarSelect,
    };
}
