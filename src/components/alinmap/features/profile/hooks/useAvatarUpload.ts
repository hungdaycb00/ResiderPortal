import React, { useState, useRef } from 'react';
import { getBaseUrl } from '../../../../../services/externalApi';

interface UseAvatarUploadParams {
    user: any;
    ws: React.MutableRefObject<WebSocket | null>;
    setMyAvatarUrl: (v: string) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    externalApi: any;
}

export function useAvatarUpload({ user, ws, setMyAvatarUrl, showNotification, externalApi }: UseAvatarUploadParams) {
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const syncAvatarToServer = async (avatarUrl: string) => {
        await externalApi.request('/api/update-profile', {
            method: 'POST',
            body: JSON.stringify({ avatarUrl }),
        });
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) {
            showNotification?.('Dang nhap de cap nhat avatar', 'info');
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
                    await syncAvatarToServer(imageUrl);
                    setMyAvatarUrl(imageUrl);
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: imageUrl } }));
                    }
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
        if (!user) {
            showNotification?.('Dang nhap de cap nhat avatar', 'info');
            return;
        }
        try {
            await syncAvatarToServer('');
            setMyAvatarUrl('');
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: '' } }));
            }
            showNotification?.('Da doi ve anh mac dinh', 'success');
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu anh mac dinh len server', 'error');
        }
        setShowAvatarMenu(false);
    };

    return {
        showAvatarMenu,
        setShowAvatarMenu,
        avatarInputRef,
        handleAvatarUpload,
        handleDefaultAvatar,
    };
}
