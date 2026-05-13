import React from 'react';
import { Search, Plus, LogIn, LogOut } from 'lucide-react';

interface MobileSubTabBarProps {
  mainTab: string;
  exploreSubTab: string;
  socialSubTab: string;
  isLooterGameMode: boolean;
  isSheetExpanded: boolean;
  isCreatingPost: boolean;
  user: any;
  onExploreSubTabChange: (v: string) => void;
  onSocialSubTabChange: (v: string) => void;
  onSearchClick?: () => void;
  onCreatePostClick?: () => void;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
}

const MobileSubTabBar: React.FC<MobileSubTabBarProps> = ({
  mainTab,
  exploreSubTab,
  socialSubTab,
  isLooterGameMode,
  isSheetExpanded,
  isCreatingPost,
  user,
  onExploreSubTabChange,
  onSocialSubTabChange,
  onSearchClick,
  onCreatePostClick,
  onLoginClick,
  onLogoutClick,
}) => {
  if (isLooterGameMode) return null;

  let subtabs: { value: string; label: string }[] | null = null;
  let activeValue: string | null = null;
  let onTabChange: ((v: string) => void) | null = null;

  if (mainTab === 'discover') {
    subtabs = [
      { value: 'games', label: 'Games' },
      { value: 'creator', label: 'Creator' },
    ];
    activeValue = exploreSubTab;
    onTabChange = onExploreSubTabChange;
  } else if (mainTab === 'friends') {
    subtabs = [
      { value: 'posts', label: 'Posts' },
      { value: 'nearby', label: 'Nearby' },
    ];
    activeValue = socialSubTab;
    onTabChange = onSocialSubTabChange;
  }

  // Action buttons
  const showSearch = ['discover', 'friends', 'profile'].includes(mainTab);
  const showCreatePost = mainTab === 'friends' && socialSubTab === 'posts' && !isCreatingPost;
  const showAuth = mainTab === 'profile';

  if (!subtabs && !showSearch && !showAuth) return null;

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-[190] px-4 pb-4 pointer-events-none">
      <div className="flex items-center justify-between">
        {/* Left spacer */}
        <div className="flex-1" />

        {/* Center: subtab pills */}
        {subtabs ? (
          <div className="flex bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 p-1 gap-0.5 pointer-events-auto">
            {subtabs.map((tab) => (
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
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: action buttons */}
        <div className="flex-1 flex justify-end gap-2 pointer-events-auto">
          {showSearch && (
            <button
              onClick={onSearchClick}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg text-gray-700 hover:text-blue-600 active:scale-95 transition-all"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {showCreatePost && (
            <button
              onClick={onCreatePostClick}
              className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white h-9 w-9 rounded-full shadow-lg active:scale-95 transition-all"
              aria-label="Create post"
              title="Tao bai viet"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          {showAuth && (
            user ? (
              <button
                onClick={onLogoutClick}
                className="flex items-center gap-1.5 px-3 h-9 bg-red-50 hover:bg-red-100 text-red-600 rounded-full shadow-lg active:scale-95 transition-all text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Dang xuat
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-1.5 px-3 h-9 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full shadow-lg active:scale-95 transition-all text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                Dang nhap
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSubTabBar;
