import React, { useState, useRef } from 'react';
import { getBaseUrl } from '../../../../../services/externalApi';

interface UseAvatarUploadParams {
    user: any;
    ws: React.MutableRefObject<WebSocket | null>;
    setMyAvatarUrl: (v: string) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useAvatarUpload({ user, ws, setMyAvatarUrl, showNotification }: UseAvatarUploadParams) {
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) {
            showNotification?.("Dang nhap de cap nhat avatar", "info");
            return;
        }
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 1024 * 1024) {
            showNotification?.("Ảnh tải lên không được vượt quá 1MB", "error");
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch(`${getBaseUrl()}/api/profile/upload-avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user?.uid || ''}` },
                body: formData
            });
            const data = await res.json();
            const imageUrl = data.imageUrl || data.url;
            if (res.ok && imageUrl) {
                setMyAvatarUrl(imageUrl);
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: imageUrl } }));
                }
                showNotification?.("Cập nhật ảnh đại diện thành công", "success");
            } else {
                showNotification?.(data.error || "Lỗi tải ảnh", "error");
            }
        } catch (err) {
            console.error(err);
            showNotification?.("Lỗi kết nối khi tải ảnh", "error");
        }
        setShowAvatarMenu(false);
    };

    const handleDefaultAvatar = () => {
        if (!user) {
            showNotification?.("Dang nhap de cap nhat avatar", "info");
            return;
        }
        setMyAvatarUrl('');
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { avatar_url: '' } }));
        }
        showNotification?.("Đã đổi về ảnh mặc định", "success");
        setShowAvatarMenu(false);
    };

    return {
        showAvatarMenu, setShowAvatarMenu,
        avatarInputRef,
        handleAvatarUpload, handleDefaultAvatar,
    };
}
