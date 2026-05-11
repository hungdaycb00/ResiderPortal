import React from 'react';
import { Edit } from 'lucide-react';
import CreatePostForm from '../../creator/components/CreatePostForm';
import PostCard from '../../profile/components/PostCard';

interface SocialPostsSectionProps {
    myUserId: string | null;
    feedPosts: any[];
    isCreatingPost: boolean;
    setIsCreatingPost: (v: boolean) => void;
    postTitle: string;
    setPostTitle: (v: string) => void;
    postPrivacy: 'public' | 'friends' | 'private';
    setPostPrivacy: (v: 'public' | 'friends' | 'private') => void;
    postIsStarred: boolean;
    setPostIsStarred: (v: boolean) => void;
    isSavingPost: boolean;
    handleCreatePost: (files: File[]) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    handleUpdatePostPrivacy: (postId: string, privacy: string) => void;
    fetchUserPosts: (uid: string) => void;
    externalApi: any;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    onPostClick?: (post: any) => void;
    onAuthorClick?: (author: any) => void;
}

const SocialPostsSection: React.FC<SocialPostsSectionProps> = ({
    myUserId,
    feedPosts,
    isCreatingPost,
    setIsCreatingPost,
    postTitle,
    setPostTitle,
    postPrivacy,
    setPostPrivacy,
    postIsStarred,
    setPostIsStarred,
    isSavingPost,
    handleCreatePost,
    handleStarPost,
    handleDeletePost,
    handleUpdatePostPrivacy,
    fetchUserPosts,
    externalApi,
    requireAuth,
    onPostClick,
    onAuthorClick,
}) => {
    const [visiblePostCount, setVisiblePostCount] = React.useState(8);

    React.useEffect(() => {
        setVisiblePostCount(8);
    }, [feedPosts]);

    const visiblePosts = React.useMemo(() => feedPosts.slice(0, visiblePostCount), [feedPosts, visiblePostCount]);

    return (
        <div className="space-y-4">
            {isCreatingPost && (
                <div className="mb-4">
                    <CreatePostForm
                        isCreatingPost={isCreatingPost}
                        setIsCreatingPost={setIsCreatingPost}
                        postTitle={postTitle}
                        setPostTitle={setPostTitle}
                        postPrivacy={postPrivacy}
                        setPostPrivacy={setPostPrivacy}
                        postIsStarred={postIsStarred}
                        setPostIsStarred={setPostIsStarred}
                        isSavingPost={isSavingPost}
                        handleCreatePost={handleCreatePost}
                    />
                </div>
            )}

            {feedPosts.length > 0 ? (
                <div className="space-y-0">
                    {visiblePosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            isSelf={post.author?.id === myUserId || post.user_id === myUserId}
                            onStar={handleStarPost}
                            onDelete={handleDeletePost}
                            onUpdatePrivacy={handleUpdatePostPrivacy}
                            externalApi={externalApi}
                            fetchUserPosts={fetchUserPosts}
                            requireAuth={requireAuth}
                            onClick={onPostClick ? () => onPostClick(post) : undefined}
                            onAuthorClick={onAuthorClick}
                        />
                    ))}
                    {visiblePostCount < feedPosts.length && (
                        <button
                            type="button"
                            onClick={() => setVisiblePostCount((count) => count + 8)}
                            className="w-full mt-2 rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-600 active:scale-[0.99]"
                        >
                            Show more posts
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <Edit className="w-7 h-7 text-gray-200" />
                    </div>
                    <p className="text-gray-400 text-sm">No posts yet</p>
                    <p className="text-[10px] text-gray-400 mt-1">Check back later or share something!</p>
                </div>
            )}
        </div>
    );
};

export default SocialPostsSection;
