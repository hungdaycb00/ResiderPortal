import React from 'react';

interface SelectedUserTabsProps {
    activeTab: 'info' | 'posts' | 'saved';
    setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
    selectedUser: any;
    fetchUserPosts: (uid: string) => void;
}

const SelectedUserTabs: React.FC<SelectedUserTabsProps> = ({ activeTab, setActiveTab, selectedUser, fetchUserPosts }) => (
    <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
        <button
            onClick={() => {
                setActiveTab('posts');
                fetchUserPosts(selectedUser.isSelf ? (selectedUser.id || 'me') : selectedUser.id);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Posts {selectedUser.gallery?.active && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 animate-pulse" />}
        </button>
        <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
            Info
        </button>
    </div>
);

export default SelectedUserTabs;
