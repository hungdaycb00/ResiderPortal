import React from 'react';
import { Search } from 'lucide-react';

interface MobileSubTabBarProps {
  mainTab: string;
  exploreSubTab: string;
  socialSubTab: string;
  isLooterGameMode: boolean;
  onExploreSubTabChange: (v: string) => void;
  onSocialSubTabChange: (v: string) => void;
  onSearchClick?: () => void;
}

const MobileSubTabBar: React.FC<MobileSubTabBarProps> = ({
  mainTab,
  exploreSubTab,
  socialSubTab,
  isLooterGameMode,
  onExploreSubTabChange,
  onSocialSubTabChange,
  onSearchClick,
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

  const showSearchAction = mainTab === 'discover' && !!onSearchClick;

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-[190] px-4 pb-4 pointer-events-none">
      <div className="relative flex items-center justify-center">
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

        {showSearchAction && (
          <button
            type="button"
            onClick={onSearchClick}
            className="absolute right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg backdrop-blur-md transition-all active:scale-95 hover:bg-white pointer-events-auto"
            aria-label="Search"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileSubTabBar;
