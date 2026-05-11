import React from 'react';

interface SelectedUserTabsProps {
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    selectedUser: any;
    fetchUserPosts: (uid: string) => void;
}

const SelectedUserTabs: React.FC<SelectedUserTabsProps> = ({ activeTab, setActiveTab, selectedUser, fetchUserPosts }) => (
    <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        <button
            onClick={() => {
                setActiveTab('posts');
                fetchUserPosts(selectedUser.isSelf ? (selectedUser.id || 'me') : selectedUser.id);
            }}
            className={`min-w-0 py-2.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap text-center ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Posts {selectedUser.gallery?.active && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
        </button>
        <button
            onClick={() => setActiveTab('info')}
            className={`min-w-0 py-2.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap text-center ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Info
        </button>
    </div>
);

export default SelectedUserTabs;
