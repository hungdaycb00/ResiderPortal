import React from 'react';
import { Plus, Search } from 'lucide-react';

interface MobileSubTabBarProps {
  mainTab: string;
  exploreSubTab: string;
  socialSubTab: string;
  isLooterGameMode: boolean;
  onExploreSubTabChange: (v: string) => void;
  onSocialSubTabChange: (v: string) => void;
  onSearchClick?: () => void;
  onCreatePostClick?: () => void;
  showCreatePostAction?: boolean;
}

const MobileSubTabBar: React.FC<MobileSubTabBarProps> = ({
  mainTab,
  exploreSubTab,
  socialSubTab,
  isLooterGameMode,
  onExploreSubTabChange,
  onSocialSubTabChange,
  onSearchClick,
  onCreatePostClick,
  showCreatePostAction = false,
}) => {
  if (isLooterGameMode) return null;

  let tabs: { value: string; label: string }[] | null = null;
  let activeValue: string | null = null;
  let onTabChange: ((v: string) => void) | null = null;

  if (mainTab === 'discover') {
    tabs = [
      { value: 'games', label: 'Games' },
      { value: 'creator', label: 'Creator' },
    ];
    activeValue = exploreSubTab;
    onTabChange = onExploreSubTabChange;
  } else if (mainTab === 'friends') {
    tabs = [
      { value: 'posts', label: 'Posts' },
      { value: 'nearby', label: 'Nearby' },
    ];
    activeValue = socialSubTab;
    onTabChange = onSocialSubTabChange;
  }

  if (!tabs) return null;

  const showSearchAction = !!onSearchClick;

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-[190] px-4 pb-4 pointer-events-none">
      <div className="flex w-full items-center gap-3">
        <div className="flex flex-1 justify-center min-w-0">
          <div className="flex bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 p-1 gap-0.5 pointer-events-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange?.(tab.value)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all active:scale-95 ${
                  activeValue === tab.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {(showSearchAction || showCreatePostAction) && (
          <div className="flex shrink-0 items-center gap-2 pointer-events-auto">
            {showSearchAction && (
              <button
                type="button"
                onClick={onSearchClick}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg backdrop-blur-md transition-all active:scale-95 hover:bg-white"
                aria-label="Search"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            {showCreatePostAction && (
              <button
                type="button"
                onClick={onCreatePostClick}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 hover:bg-blue-500"
                aria-label="Create post"
                title="Create post"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSubTabBar;
