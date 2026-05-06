import React from 'react';

interface CreatorTabHeaderProps {
    subTab: 'creator' | 'manager';
    setSubTab: (tab: 'creator' | 'manager') => void;
    requireCreatorAuth: (actionLabel: string, afterLogin?: () => void) => boolean;
    onManageGamesClick: () => void;
}

const CreatorTabHeader: React.FC<CreatorTabHeaderProps> = ({
    subTab,
    setSubTab,
    requireCreatorAuth,
    onManageGamesClick,
}) => (
    <div className="p-4 pb-0 border-b border-gray-800 bg-[#1a1d24] shrink-0">
        <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
            Game Studio
        </h3>
        <p className="text-xs text-gray-400 mb-4">Upload and manage your games on Alin Map</p>

        <div className="flex gap-4">
            <button
                onClick={() => setSubTab('creator')}
                className={`pb-2 text-sm font-bold border-b-2 transition-colors ${subTab === 'creator' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                Creator
            </button>
            <button
                onClick={() => {
                    if (!requireCreatorAuth('quan ly game')) return;
                    onManageGamesClick();
                    setSubTab('manager');
                }}
                className={`pb-2 text-sm font-bold border-b-2 transition-colors ${subTab === 'manager' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                Game Manager
            </button>
        </div>
    </div>
);

export default CreatorTabHeader;
