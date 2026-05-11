import React from 'react';
import { Bookmark, Edit } from 'lucide-react';
import PostCard from './PostCard';

interface ProfilePostsSectionProps {
    posts: any[];
    visibleCount: number;
    onShowMore: () => void;
    showMoreLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyType: 'posts' | 'saved';
    onStar: (postId: string) => void;
    onDelete: (postId: string) => void;
    onUpdatePrivacy?: (postId: string, privacy: string) => void;
    externalApi: any;
    fetchUserPosts: (uid: string) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    onPostClick?: (post: any) => void;
}

const ProfilePostsSection: React.FC<ProfilePostsSectionProps> = ({
    posts,
    visibleCount,
    onShowMore,
    showMoreLabel,
    emptyTitle,
    emptyDescription,
    emptyType,
    onStar,
    onDelete,
    onUpdatePrivacy,
    externalApi,
    fetchUserPosts,
    requireAuth,
    onPostClick,
}) => {
    const visiblePosts = posts.slice(0, visibleCount);
    const isPostsMode = emptyType === 'posts';

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    {isPostsMode ? <Edit className="w-8 h-8 text-gray-200" /> : <Bookmark className="w-8 h-8 text-gray-200" />}
                </div>
                <p className="text-gray-400 text-sm">{emptyTitle}</p>
                <p className="text-[11px] text-gray-400 mt-1">{emptyDescription}</p>
            </div>
        );
    }

    return (
        <div className="pb-8">
            <div className="space-y-0">
                {visiblePosts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        isSelf={true}
                        onStar={onStar}
                        onDelete={onDelete}
                        onUpdatePrivacy={onUpdatePrivacy}
                        externalApi={externalApi}
                        fetchUserPosts={fetchUserPosts}
                        requireAuth={requireAuth}
                        onClick={onPostClick ? () => onPostClick(post) : undefined}
                    />
                ))}
                {visibleCount < posts.length && (
                    <button
                        type="button"
                        onClick={onShowMore}
                        className="w-full mt-2 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                    >
                        {showMoreLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProfilePostsSection;
