import React from 'react';

interface ProfileTabsProps {
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    fetchUserPosts: (uid: string) => void;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
    activeTab,
    setActiveTab,
    requireAuth,
    fetchUserPosts,
}) => (
    <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
        <button
            onClick={() => {
                if (requireAuth && !requireAuth('xem bai viet cua ban')) return;
                setActiveTab('posts');
                fetchUserPosts('me');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Posts
        </button>
        <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Friends
        </button>
        <button
            onClick={() => {
                if (requireAuth && !requireAuth('xem bai viet da luu')) return;
                setActiveTab('saved');
                fetchUserPosts('saved');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'saved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Saved
        </button>
    </div>
);

export default ProfileTabs;
