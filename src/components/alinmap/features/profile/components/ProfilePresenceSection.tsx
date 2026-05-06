import React from 'react';
import { Edit, Plus, X } from 'lucide-react';

interface ProfilePresenceSectionProps {
    myStatus: string;
    statusInput: string;
    setStatusInput: (v: string) => void;
    isEditingStatus: boolean;
    setIsEditingStatus: (v: boolean) => void;
    isAddingTag: boolean;
    setIsAddingTag: (v: boolean) => void;
    tagInput: string;
    setTagInput: (v: string) => void;
    parsedTags: string[];
    onSaveStatus: () => void;
    onAddTag: (rawTag: string) => void;
    onRemoveTag: (tag: string) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
}

const ProfilePresenceSection: React.FC<ProfilePresenceSectionProps> = ({
    myStatus,
    statusInput,
    setStatusInput,
    isEditingStatus,
    setIsEditingStatus,
    isAddingTag,
    setIsAddingTag,
    tagInput,
    setTagInput,
    parsedTags,
    onSaveStatus,
    onAddTag,
    onRemoveTag,
    requireAuth,
}) => (
    <div className="px-1 mt-2">
        {isEditingStatus ? (
            <div className="bg-gray-100/80 p-3 rounded-xl border border-gray-200 shadow-inner">
                <div className="flex gap-2">
                    <input
                        autoFocus
                        type="text"
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void onSaveStatus(); }}
                        placeholder="Update your status..."
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 w-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                        onClick={() => { void onSaveStatus(); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                    >
                        Save
                    </button>
                </div>
            </div>
        ) : (
            <div
                className="group/status inline-flex items-center gap-2 cursor-pointer mb-2"
                onClick={() => {
                    if (requireAuth && !requireAuth('cap nhat trang thai')) return;
                    setStatusInput(myStatus);
                    setIsEditingStatus(true);
                }}
            >
                <p className="text-gray-500 text-[13px] truncate">{myStatus || 'Tap to add status...'}</p>
                <Edit className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover/status:opacity-100 transition-opacity" />
            </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2 mb-4 items-center">
            {parsedTags.map((tag) => (
                <span
                    key={tag}
                    className="group/tag relative text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1 transition-all hover:bg-blue-100"
                >
                    {tag.toUpperCase()}
                    <button
                        onClick={() => { void onRemoveTag(tag.replace('#', '')); }}
                        className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500"
                    >
                        <X className="w-2.5 h-2.5" />
                    </button>
                </span>
            ))}

            {isAddingTag ? (
                <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-full px-2 py-0.5 shadow-sm animate-in fade-in zoom-in duration-200">
                    <span className="text-blue-500 text-[10px] font-bold">#</span>
                    <input
                        autoFocus
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagInput.trim()) void onAddTag(tagInput);
                            else if (e.key === 'Escape') setIsAddingTag(false);
                        }}
                        onBlur={() => { if (!tagInput.trim()) setIsAddingTag(false); }}
                        className="w-16 bg-transparent border-none outline-none text-[10px] font-bold text-gray-900 placeholder:text-gray-300"
                        placeholder="tag..."
                    />
                </div>
            ) : (
                <button
                    onClick={() => setIsAddingTag(true)}
                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-400 flex items-center justify-center transition-all active:scale-90 border border-gray-200"
                    title="Thêm tag"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    </div>
);

export default ProfilePresenceSection;
