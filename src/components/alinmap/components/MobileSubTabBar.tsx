import React from 'react';

interface MobileSubTabBarProps {
  mainTab: string;
  exploreSubTab: string;
  socialSubTab: string;
  isLooterGameMode: boolean;
  isSheetExpanded: boolean;
  onExploreSubTabChange: (v: string) => void;
  onSocialSubTabChange: (v: string) => void;
}

const MobileSubTabBar: React.FC<MobileSubTabBarProps> = () => {
  return null;
};

export default MobileSubTabBar;
