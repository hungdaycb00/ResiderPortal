import React from 'react';
import { useProfile } from '../context/ProfileContext';
import { useSocial } from '../../social/context/SocialContext';
import SelectedUserGamesSection from './SelectedUserGamesSection';
import SelectedUserHeader from './SelectedUserHeader';
import SelectedUserInfoSection from './SelectedUserInfoSection';
import SelectedUserPostsSection from './SelectedUserPostsSection';
import SelectedUserTabs from './SelectedUserTabs';

interface SelectedUserViewProps {
    selectedUser: any;
    setSelectedUser: (user: any) => void;
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    fetchUserPosts: (uid: string) => void;
    friends: any[];
    onLocateUser: (lat: number, lng: number) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    games: any[];
    userPosts: any[];
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    externalApi: any;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    onPostClick?: (post: any) => void;
}

const SelectedUserView: React.FC<SelectedUserViewProps> = ({
    selectedUser, setSelectedUser, activeTab, setActiveTab, fetchUserPosts,
    friends,
    onLocateUser, ws,
    games, userPosts, handleStarPost, handleDeletePost, externalApi, requireAuth, onPostClick
}) => {
    const { isReporting, setIsReporting, reportStatus, setReportStatus, reportReason, setReportReason } = useProfile();
    const { sentFriendRequests, handleAddFriend, handleMessage } = useSocial();

    return (
        <div className="pt-2 md:pt-6 pb-24 md:pb-6 px-2">
            <SelectedUserHeader selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
            <SelectedUserTabs activeTab={activeTab} setActiveTab={setActiveTab} selectedUser={selectedUser} fetchUserPosts={fetchUserPosts} />

            {activeTab === 'info' ? (
                <SelectedUserInfoSection
                    selectedUser={selectedUser}
                    friends={friends}
                    sentFriendRequests={sentFriendRequests}
                    handleAddFriend={handleAddFriend}
                    handleMessage={handleMessage}
                    onLocateUser={onLocateUser}
                    isReporting={isReporting}
                    setIsReporting={setIsReporting}
                    reportStatus={reportStatus}
                    reportReason={reportReason}
                    setReportReason={setReportReason}
                    setReportStatus={setReportStatus}
                    ws={ws}
                    requireAuth={requireAuth}
                />
            ) : (
                <>
                    <SelectedUserGamesSection games={games} />
                    <SelectedUserPostsSection
                        userPosts={userPosts}
                        handleStarPost={handleStarPost}
                        handleDeletePost={handleDeletePost}
                        externalApi={externalApi}
                        fetchUserPosts={fetchUserPosts}
                        requireAuth={requireAuth}
                        onPostClick={onPostClick}
                    />
                </>
            )}
        </div>
    );
};

export default React.memo(SelectedUserView);
