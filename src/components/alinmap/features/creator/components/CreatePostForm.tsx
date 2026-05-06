import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, Image as ImageIcon, Lock, Plus, Smile, Star, Users, X } from 'lucide-react';

interface CreatePostFormProps {
    isCreatingPost: boolean;
    setIsCreatingPost: (v: boolean) => void;
    postTitle: string;
    setPostTitle: (v: string) => void;
    postPrivacy: 'public' | 'friends' | 'private';
    setPostPrivacy: (v: 'public' | 'friends' | 'private') => void;
    postIsStarred?: boolean;
    setPostIsStarred?: (v: boolean) => void;
    isSavingPost: boolean;
    handleCreatePost: (files: File[]) => void;
}

const QUICK_EMOJIS = ['🎮', '🔥', '✨', '😂', '😎', '💀', '💯', '❤️', '🎉', '🌟'];
const POPULAR_TAGS = ['#game', '#shop', '#chill', '#event', '#trading', '#friends'];
const PRIVACY_OPTIONS = [
    { value: 'public' as const, label: 'Công khai', icon: Globe },
    { value: 'friends' as const, label: 'Bạn bè', icon: Users },
    { value: 'private' as const, label: 'Riêng tư', icon: Lock },
];

const CreatePostForm: React.FC<CreatePostFormProps> = ({
    isCreatingPost, setIsCreatingPost, postTitle, setPostTitle,
    postPrivacy, setPostPrivacy, postIsStarred = false, setPostIsStarred,
    isSavingPost, handleCreatePost,
}) => {
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
    const privacyMenuRef = useRef<HTMLDivElement | null>(null);

    const selectedPrivacy = PRIVACY_OPTIONS.find((option) => option.value === postPrivacy) ?? PRIVACY_OPTIONS[0];

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!privacyMenuRef.current?.contains(event.target as Node)) {
                setShowPrivacyMenu(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const insertEmoji = (emoji: string) => {
        setPostTitle(postTitle + emoji);
        setShowEmojiPicker(false);
    };

    const insertTag = (tag: string) => {
        setPostTitle(postTitle + (postTitle.endsWith(' ') || postTitle.length === 0 ? '' : ' ') + tag + ' ');
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            setSelectedImages(prev => [...prev, ...files]);
            const urls = files.map((file: File) => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...urls]);
        }
    };

    const handleCancel = () => {
        setIsCreatingPost(false);
        setPostTitle('');
        setPostPrivacy('public');
        setPostIsStarred?.(false);
        setSelectedImages([]);
        setPreviewUrls([]);
        setShowEmojiPicker(false);
        setShowPrivacyMenu(false);
    };

    const handleSubmit = () => {
        handleCreatePost(selectedImages);
        setSelectedImages([]);
        setPreviewUrls([]);
        setShowEmojiPicker(false);
        setShowPrivacyMenu(false);
    };

    if (!isCreatingPost) {
        return (
            <button
                onClick={() => {
                    setPostPrivacy('public');
                    setPostIsStarred?.(false);
                    setShowEmojiPicker(false);
                    setShowPrivacyMenu(false);
                    setIsCreatingPost(true);
                }}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                aria-label="Create post"
                title="Create post"
            >
                <Plus className="w-5 h-5" />
            </button>
        );
    }

    return (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between gap-3 mb-1 px-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Post</span>

                <div className="flex items-center gap-2" ref={privacyMenuRef}>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowPrivacyMenu((value) => !value)}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/60 active:scale-[0.99]"
                        >
                            <selectedPrivacy.icon className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-bold">{selectedPrivacy.label}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showPrivacyMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showPrivacyMenu && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                                {PRIVACY_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = option.value === postPrivacy;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setPostPrivacy(option.value);
                                                setShowPrivacyMenu(false);
                                            }}
                                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="flex-1 font-medium">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setPostIsStarred?.(!postIsStarred)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all active:scale-[0.99] ${postIsStarred ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:border-amber-200 hover:bg-amber-50/60'}`}
                        aria-label="Show as billboard"
                        title="Show as billboard"
                    >
                        <Star className={`w-4 h-4 ${postIsStarred ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}`} />
                    </button>
                </div>
            </div>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Post title..."
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value.substring(0, 50))}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                />
                <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-amber-500 transition-colors"
                >
                    <Smile className="w-5 h-5" />
                </button>

                {showEmojiPicker && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-2 z-50 flex flex-wrap gap-1 w-[200px]">
                        {QUICK_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => insertEmoji(emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5 px-1">
                {POPULAR_TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => insertTag(tag)}
                        className="text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 px-2.5 py-1 rounded-md transition-colors"
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {previewUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2 px-1">
                    {previewUrls.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200">
                            <img src={url} className="w-full h-full object-cover" alt="preview" />
                            <button
                                onClick={() => {
                                    const newImages = [...selectedImages];
                                    newImages.splice(i, 1);
                                    setSelectedImages(newImages);
                                    const newUrls = [...previewUrls];
                                    URL.revokeObjectURL(newUrls[i]);
                                    newUrls.splice(i, 1);
                                    setPreviewUrls(newUrls);
                                }}
                                className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[10px] text-right text-gray-400">{postTitle.length}/50</p>

            <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 border border-gray-200">
                    <ImageIcon className="w-4 h-4" /> Add Photos
                    <input type="file" hidden accept="image/png,image/jpeg,image/webp" multiple onChange={handleImageSelect} />
                </label>
            </div>

            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200/60">
                <button onClick={handleCancel} className="flex-1 text-gray-500 hover:bg-gray-200 bg-gray-100 rounded-xl text-xs font-bold py-2.5 transition-colors">
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!postTitle.trim() && selectedImages.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                    {isSavingPost ? 'Posting...' : 'Post'}
                </button>
            </div>
        </div>
    );
};

export default CreatePostForm;
