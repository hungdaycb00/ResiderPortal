import React from 'react';

interface MobileSubTabBarProps {
  mainTab: string;
  exploreSubTab: string;
  socialSubTab: string;
  isLooterGameMode: boolean;
  onExploreSubTabChange: (v: string) => void;
  onSocialSubTabChange: (v: string) => void;
}

const MobileSubTabBar: React.FC<MobileSubTabBarProps> = ({
  mainTab,
  exploreSubTab,
  socialSubTab,
  isLooterGameMode,
  onExploreSubTabChange,
  onSocialSubTabChange,
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

  return (
    <div className="flex justify-center pt-3 pb-2">
      <div className="flex bg-gray-100 rounded-full p-1 gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange?.(tab.value)}
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all active:scale-95 ${
              activeValue === tab.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileSubTabBar;
