import React from 'react';
import { X } from 'lucide-react';
import { resolveAvatarSrc } from '../../../../../utils/avatar';

interface SelectedUserHeaderProps {
    selectedUser: any;
    setSelectedUser: (user: any) => void;
}

const SelectedUserHeader: React.FC<SelectedUserHeaderProps> = ({ selectedUser, setSelectedUser }) => (
    <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar">
            <img
                src={resolveAvatarSrc(selectedUser.avatar_url || selectedUser.photoURL || selectedUser.avatarUrl, selectedUser.username || selectedUser.displayName || 'U')}
                alt="Avatar"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveAvatarSrc(null, selectedUser.username || selectedUser.displayName || 'U'); }}
            />
        </div>
        <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-black text-gray-900 truncate tracking-tight mb-1">{selectedUser.username || 'Mysterious User'}</h3>
                    {selectedUser.province && (
                        <p className="text-xs text-gray-500 font-medium">📍 {selectedUser.province}</p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 active:scale-95"
                    aria-label="Đóng hồ sơ user"
                    title="Đóng"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    </div>
);

export default SelectedUserHeader;
