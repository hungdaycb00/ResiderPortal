import React from 'react';
import { LogIn, LogOut, Plus, Search } from 'lucide-react';

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
  user?: any;
  triggerAuth?: (callback: () => void) => void;
  logout?: () => void;
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
  user,
  triggerAuth,
  logout,
}) => {
  if (isLooterGameMode) return null;

  let tabs: { value: string; label: string }[] | null = null;
  let activeValue: string | null = null;
  let onTabChange: ((v: string) => void) | null = null;

  if (mainTab === 'discover') {
    tabs = [
      { value: 'games', label: 'Trò chơi' },
      { value: 'creator', label: 'Sáng tạo' },
    ];
    activeValue = exploreSubTab;
    onTabChange = onExploreSubTabChange;
  } else if (mainTab === 'friends') {
    tabs = [
      { value: 'posts', label: 'Bài viết' },
      { value: 'nearby', label: 'Gần đây' },
    ];
    activeValue = socialSubTab;
    onTabChange = onSocialSubTabChange;
  } else if (mainTab === 'profile') {
    tabs = null;
  }

  if (!tabs && mainTab !== 'profile') return null;

  const showSearchAction = !!onSearchClick;
  const showAuthAction = mainTab === 'profile';

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-[190] px-4 pb-4 pointer-events-none">
      <div className="relative flex w-full items-center min-h-10">
        {tabs && tabs.length > 0 && (
          <div
            className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 p-1 gap-0.5"
            style={{ maxWidth: 'calc(100vw - 144px)' }}
          >
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
        )}

        {(showSearchAction || showCreatePostAction || showAuthAction) && (
          <div className="pointer-events-auto absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {showAuthAction && (
              <>
                {user ? (
                  <button
                    onClick={() => logout?.()}
                    className="flex items-center gap-1.5 h-10 px-4 bg-red-50/90 hover:bg-red-100 text-red-600 text-xs font-bold rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 border border-red-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Đăng xuất
                  </button>
                ) : (
                  <button
                    onClick={() => triggerAuth?.(() => {})}
                    className="flex items-center gap-1.5 h-10 px-4 bg-blue-50/90 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 border border-blue-100"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Đăng nhập
                  </button>
                )}
              </>
            )}

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
