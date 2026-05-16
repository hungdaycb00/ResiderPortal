import React from 'react';
import { Edit, Copy } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { resolveAvatarSrc } from '../../../../../utils/avatar';

const PROFILE_DISPLAY_NAME_KEY = 'alin_profile_display_name';

interface ProfileHeaderProps {
    myUserId: string | null;
    userEmail?: string | null;
    myDisplayName: string;
    myAvatarUrl: string;
    currentProvince: string | null;
    setMyDisplayName: (v: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    showAvatarMenu: boolean;
    setShowAvatarMenu: (v: boolean) => void;
    avatarInputRef: React.RefObject<HTMLInputElement>;
    presetAvatars: readonly string[];
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDefaultAvatar: () => void;
    handlePresetAvatarSelect: (avatarUrl: string) => void;
    externalApi: any;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    myUserId, userEmail, myDisplayName, myAvatarUrl, currentProvince,
    setMyDisplayName,
    ws, showNotification, showAvatarMenu, setShowAvatarMenu,
    avatarInputRef, presetAvatars, handleAvatarUpload, handleDefaultAvatar, handlePresetAvatarSelect, externalApi, requireAuth,
}) => {
    const { isEditingName, setIsEditingName, nameInput, setNameInput } = useProfile();

    const saveName = async () => {
        if (requireAuth && !requireAuth('doi ten hien thi')) return;
        const nextName = nameInput.trim();
        if (!nextName) return;
        try {
            await externalApi.request('/api/update-profile', {
                method: 'POST',
                body: JSON.stringify({ displayName: nextName }),
            });
            try {
                const savedUserRaw = localStorage.getItem('user');
                if (savedUserRaw) {
                    const savedUser = JSON.parse(savedUserRaw);
                    const nextUser = { ...savedUser, displayName: nextName };
                    localStorage.setItem('user', JSON.stringify(nextUser));
                }
            } catch {}
            localStorage.setItem(PROFILE_DISPLAY_NAME_KEY, nextName);
            setMyDisplayName(nextName);
            setIsEditingName(false);
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nextName } }));
            }
            showNotification?.('Da luu ten hien thi', 'success');
        } catch (err) {
            console.error(err);
            showNotification?.('Khong the luu ten len server', 'error');
        }
    };

    const currentAvatar = resolveAvatarSrc(myAvatarUrl, myDisplayName, { background: '3b82f6', color: 'fff', size: 150 });

    return (
        <div className="relative mb-6 flex items-start gap-4 px-1">
            <div
                className="group/avatar relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-[20px] border border-gray-200 bg-gray-100 shadow-sm"
                onClick={() => {
                    if (requireAuth && !requireAuth('cap nhat avatar')) return;
                    setShowAvatarMenu(!showAvatarMenu);
                }}
            >
                <img
                    src={currentAvatar}
                    alt="Avatar"
                    className="h-full w-full object-cover transition-transform group-hover/avatar:scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).src = resolveAvatarSrc(null, myDisplayName, { background: '3b82f6', color: 'fff', size: 150 }); }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                    <Edit className="h-6 w-6 text-white drop-shadow-md" />
                </div>
            </div>

            {showAvatarMenu && (
                <div className="absolute left-1 top-20 z-50 w-[286px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-200">
                    <div className="px-1.5 py-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Chon avatar co san</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-1.5">
                        {presetAvatars.map((avatarUrl) => {
                            const normalizedAvatar = resolveAvatarSrc(avatarUrl, myDisplayName, { background: '3b82f6', color: 'fff', size: 150 });
                            const isSelected = resolveAvatarSrc(myAvatarUrl, myDisplayName, { background: '3b82f6', color: 'fff', size: 150 }) === normalizedAvatar;
                            return (
                                <button
                                    key={avatarUrl}
                                    type="button"
                                    onClick={() => { void handlePresetAvatarSelect(avatarUrl); }}
                                    className={`relative aspect-square overflow-hidden rounded-xl border transition-all active:scale-95 ${
                                        isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                    title="Chon avatar nay"
                                >
                                    <img
                                        src={normalizedAvatar}
                                        alt="Avatar preset"
                                        className="h-full w-full object-cover bg-gray-50"
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <div className="my-1 h-px bg-gray-100" />
                    <button onClick={() => avatarInputRef.current?.click()} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">Tai anh len</button>
                    <button onClick={handleDefaultAvatar} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50">Anh mac dinh</button>
                </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />

            <div className="min-w-0 flex-1 pt-1">
                {isEditingName ? (
                    <div className="mb-2 flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); }}
                            className="w-full rounded-lg border border-blue-500 bg-gray-100 px-2 py-1 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-blue-500"
                        />
                        <button onClick={() => { void saveName(); }} className="rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-500">Save</button>
                    </div>
                ) : (
                    <div className="mb-1">
                        <div
                            className="group/name inline-flex cursor-pointer items-center gap-2"
                            onClick={() => {
                                if (requireAuth && !requireAuth('doi ten hien thi')) return;
                                setNameInput(myDisplayName);
                                setIsEditingName(true);
                            }}
                        >
                            <h3 className="truncate text-2xl font-black tracking-tight text-gray-900">{myDisplayName}</h3>
                            <Edit className="h-4 w-4 text-blue-500 opacity-40 transition-opacity group-hover/name:opacity-100" />
                        </div>
                        {currentProvince && (
                            <p className="text-sm font-medium text-gray-500">{"\u{1F4CD}"} {currentProvince}</p>
                        )}
                    </div>
                )}

                <div
                    className="group/id mt-2 inline-flex max-w-full cursor-pointer items-start gap-1.5 rounded-md bg-gray-100/80 px-2 py-1 transition-colors hover:bg-blue-50"
                    onClick={() => {
                        if (!myUserId) {
                            requireAuth?.('lay User ID');
                            return;
                        }
                        navigator.clipboard.writeText(myUserId);
                        showNotification?.('ID copied to clipboard!', 'success');
                    }}
                >
                    <span className="break-all text-[10px] font-bold text-gray-500 group-hover/id:text-blue-600">ID: {myUserId}</span>
                    <Copy className="mt-0.5 h-3 w-3 shrink-0 text-gray-400 group-hover/id:text-blue-500" />
                </div>
                {userEmail && (
                    <p className="mt-1 max-w-[220px] truncate text-[10px] font-semibold text-gray-400">
                        Gmail: {userEmail}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProfileHeader;
