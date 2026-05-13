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
    <div className="fixed bottom-[64px] left-0 right-0 z-[190] px-6 pb-4 pointer-events-none">
      <div className="flex justify-center">
        <div className="flex bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 p-1 gap-0.5 pointer-events-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
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
    </div>
  );
};

export default MobileSubTabBar;
