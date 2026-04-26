import React from 'react';
import { Edit, Copy } from 'lucide-react';
import { normalizeImageUrl } from '../../../services/externalApi';

interface ProfileHeaderProps {
    myUserId: string | null;
    userEmail?: string | null;
    myDisplayName: string;
    myAvatarUrl: string;
    currentProvince: string | null;
    isEditingName: boolean;
    setIsEditingName: (v: boolean) => void;
    nameInput: string;
    setNameInput: (v: string) => void;
    setMyDisplayName: (v: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    showAvatarMenu: boolean;
    setShowAvatarMenu: (v: boolean) => void;
    avatarInputRef: React.RefObject<HTMLInputElement>;
    handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDefaultAvatar: () => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    myUserId, userEmail, myDisplayName, myAvatarUrl, currentProvince,
    isEditingName, setIsEditingName, nameInput, setNameInput, setMyDisplayName,
    ws, showNotification, showAvatarMenu, setShowAvatarMenu,
    avatarInputRef, handleAvatarUpload, handleDefaultAvatar, requireAuth,
}) => {
    const saveName = () => {
        if (requireAuth && !requireAuth('doi ten hien thi')) return;
        setMyDisplayName(nameInput);
        setIsEditingName(false);
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { displayName: nameInput } }));
        }
    };

    return (
        <div className="flex items-start gap-4 mb-6 px-1 relative">
            <div
                className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar cursor-pointer"
                onClick={() => {
                    if (requireAuth && !requireAuth('cap nhat avatar')) return;
                    setShowAvatarMenu(!showAvatarMenu);
                }}
            >
                <img
                    src={normalizeImageUrl(myAvatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`}
                    alt="Avatar"
                    className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myDisplayName)}&background=3b82f6&color=fff&size=150&bold=true`; }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity justify-center items-center flex">
                    <Edit className="w-6 h-6 text-white drop-shadow-md" />
                </div>
            </div>

            {/* Avatar Menu */}
            {showAvatarMenu && (
                <div className="absolute top-20 left-1 bg-white shadow-xl rounded-xl border border-gray-200 p-1.5 z-50 flex flex-col min-w-[140px] animate-in fade-in zoom-in duration-200">
                    <button onClick={() => avatarInputRef.current?.click()} className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">Tải ảnh lên</button>
                    <button onClick={handleDefaultAvatar} className="text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">Ảnh mặc định</button>
                </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />

            <div className="flex-1 min-w-0 pt-1">
                {isEditingName ? (
                    <div className="flex gap-2 mb-2">
                        <input
                            autoFocus type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
                            className="bg-gray-100 border border-blue-500 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 w-full outline-none focus:border-blue-500 transition-colors"
                        />
                        <button onClick={saveName} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg text-xs font-bold transition-colors">Save</button>
                    </div>
                ) : (
                    <div className="mb-1">
                        <div
                            className="group/name inline-flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                                if (requireAuth && !requireAuth('doi ten hien thi')) return;
                                setNameInput(myDisplayName);
                                setIsEditingName(true);
                            }}
                        >
                            <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight">{myDisplayName}</h3>
                            <Edit className="w-4 h-4 text-blue-500 opacity-40 group-hover/name:opacity-100 transition-opacity" />
                        </div>
                        {currentProvince && (
                            <p className="text-sm text-gray-500 font-medium">📍 {currentProvince}</p>
                        )}
                    </div>
                )}

                {/* ID Copy */}
                <div className="group/id inline-flex items-center gap-1.5 bg-gray-100/80 hover:bg-blue-50 px-2 py-1 rounded-md cursor-pointer transition-colors mt-2" onClick={() => {
                    if (!myUserId) {
                        requireAuth?.('lay User ID');
                        return;
                    }
                    navigator.clipboard.writeText(myUserId);
                    showNotification?.("ID copied to clipboard!", "success");
                }}>
                    <span className="text-[10px] font-bold text-gray-500 group-hover/id:text-blue-600 truncate max-w-[120px]">ID: {myUserId}</span>
                    <Copy className="w-3 h-3 text-gray-400 group-hover/id:text-blue-500" />
                </div>
                {userEmail && (
                    <p className="text-[10px] font-semibold text-gray-400 mt-1 truncate max-w-[220px]">
                        Gmail: {userEmail}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProfileHeader;
