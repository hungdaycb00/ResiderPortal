import React from 'react';
import { X } from 'lucide-react';
import { normalizeImageUrl } from '../../../../../services/externalApi';

interface SelectedUserHeaderProps {
    selectedUser: any;
    setSelectedUser: (user: any) => void;
}

const SelectedUserHeader: React.FC<SelectedUserHeaderProps> = ({ selectedUser, setSelectedUser }) => (
    <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 bg-gray-100 rounded-[20px] overflow-hidden shrink-0 shadow-sm border border-gray-200 relative group/avatar">
            <img
                src={normalizeImageUrl(selectedUser.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`}
                alt="Avatar"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.username || 'U')}&background=3b82f6&color=fff&size=150&bold=true`; }}
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
                    onClick={() => setSelectedUser(null)}
                    className="shrink-0 p-2 -mr-2 -mt-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
);

export default SelectedUserHeader;
