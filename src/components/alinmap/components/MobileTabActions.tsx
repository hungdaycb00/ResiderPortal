import React from 'react';
import { Search, Plus, LogIn, LogOut } from 'lucide-react';

interface MobileTabActionsProps {
  mainTab: string;
  socialSubTab: string;
  user: any;
  isCreatingPost: boolean;
  isSheetExpanded: boolean;
  isLooterGameMode: boolean;
  onSearchClick: () => void;
  onCreatePostClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const MobileTabActions: React.FC<MobileTabActionsProps> = ({
  mainTab,
  socialSubTab,
  user,
  isCreatingPost,
  isSheetExpanded,
  isLooterGameMode,
  onSearchClick,
  onCreatePostClick,
  onLoginClick,
  onLogoutClick,
}) => {
  // Only show on mobile for tabs that need action buttons
  const showSearch = ['discover', 'friends', 'profile'].includes(mainTab);
  const showCreatePost = mainTab === 'friends' && socialSubTab === 'posts' && !isCreatingPost;
  const showAuth = mainTab === 'profile';

  if (isLooterGameMode || !showSearch) return null;

  return (
    <div
      className={`md:hidden fixed right-3 z-[500] flex items-center gap-2 transition-all duration-300 ${
        isSheetExpanded
          ? 'opacity-100 pointer-events-auto translate-y-0'
          : 'opacity-0 pointer-events-none translate-y-2'
      }`}
      style={{ bottom: '64px' }}
    >
      {/* Search Button */}
      {showSearch && (
        <button
          onClick={onSearchClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg text-gray-700 hover:text-blue-600 active:scale-95 transition-all"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* Create Post Button (Social tab) */}
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

      {/* Login/Logout Button (Profile tab) */}
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
  );
};

export default MobileTabActions;
