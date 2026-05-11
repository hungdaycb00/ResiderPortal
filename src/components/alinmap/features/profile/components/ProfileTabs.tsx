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
    <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        <button
            onClick={() => {
                if (requireAuth && !requireAuth('xem bai viet cua ban')) return;
                setActiveTab('posts');
                fetchUserPosts('me');
            }}
            className={`min-w-0 py-2.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap text-center ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Posts
        </button>
        <button
            onClick={() => setActiveTab('info')}
            className={`min-w-0 py-2.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap text-center ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Friends
        </button>
        <button
            onClick={() => {
                if (requireAuth && !requireAuth('xem bai viet da luu')) return;
                setActiveTab('saved');
                fetchUserPosts('saved');
            }}
            className={`min-w-0 py-2.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap text-center ${activeTab === 'saved' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Saved
        </button>
    </div>
);

export default ProfileTabs;
