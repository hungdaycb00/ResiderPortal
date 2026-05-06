import React from 'react';
import { Edit } from 'lucide-react';
import PostCard from './PostCard';

interface SelectedUserPostsSectionProps {
    userPosts: any[];
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    externalApi: any;
    fetchUserPosts: (uid: string) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
}

const INITIAL_POST_LIMIT = 8;
const POST_BATCH_SIZE = 8;

const SelectedUserPostsSection: React.FC<SelectedUserPostsSectionProps> = ({
    userPosts,
    handleStarPost,
    handleDeletePost,
    externalApi,
    fetchUserPosts,
    requireAuth,
}) => {
    const [visiblePostCount, setVisiblePostCount] = React.useState(INITIAL_POST_LIMIT);

    React.useEffect(() => {
        setVisiblePostCount(INITIAL_POST_LIMIT);
    }, [userPosts]);

    const visiblePosts = React.useMemo(() => userPosts.slice(0, visiblePostCount), [userPosts, visiblePostCount]);

    if (userPosts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Edit className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 text-sm">No posts yet</p>
                <p className="text-[11px] text-gray-400 mt-1">This user hasn't posted anything.</p>
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
                        isSelf={false}
                        onStar={handleStarPost}
                        onDelete={handleDeletePost}
                        externalApi={externalApi}
                        fetchUserPosts={fetchUserPosts}
                        requireAuth={requireAuth}
                    />
                ))}
                {visiblePostCount < userPosts.length && (
                    <button
                        type="button"
                        onClick={() => setVisiblePostCount((count) => count + POST_BATCH_SIZE)}
                        className="w-full mt-2 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                    >
                        Show more posts
                    </button>
                )}
            </div>
        </div>
    );
};

export default SelectedUserPostsSection;
