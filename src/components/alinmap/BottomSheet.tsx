import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import BottomSheetContent from './bottom-sheet/BottomSheetContent';
import SheetHeader from './bottom-sheet/SheetHeader';
import SubTabSwitcher from './bottom-sheet/SubTabSwitcher';
import MobileSubTabBar from './components/MobileSubTabBar';

import { useLooterGame } from './looter-game/LooterGameContext';

import type { BottomSheetProps, ExploreSubTab, SocialSubTab } from './bottom-sheet/types';

export type { BottomSheetProps } from './bottom-sheet/types';

const BottomSheet: React.FC<BottomSheetProps> = (props) => {
    const {
        fetchUserPosts,
        fetchFeedPosts,
        isDesktop,
        isSheetExpanded,
        mainTab,
        searchTag,
        setIsSheetExpanded,
        setSearchTag,
        selectedUser,
        setSelectedUser,
        setIsSearchOverlayOpen,
        panelWidth,
        setPanelWidth,
        onPostClick,
    } = props;

    const [_exploreSubTab, _setExploreSubTab] = React.useState<ExploreSubTab>('games');
    const [_socialSubTab, _setSocialSubTab] = React.useState<SocialSubTab>('posts');
    const exploreSubTab = (props.exploreSubTab as ExploreSubTab) ?? _exploreSubTab;
    const socialSubTab = (props.socialSubTab as SocialSubTab) ?? _socialSubTab;
    const setExploreSubTab = props.onExploreSubTabChange ?? _setExploreSubTab;
    const setSocialSubTab = props.onSocialSubTabChange ?? _setSocialSubTab;
    const handleExploreSubTabChange = React.useCallback((value: string) => {
        setExploreSubTab(value as ExploreSubTab);
    }, [setExploreSubTab]);
    const handleSocialSubTabChange = React.useCallback((value: string) => {
        setSocialSubTab(value as SocialSubTab);
    }, [setSocialSubTab]);
    const lastSocialFeedRequestRef = React.useRef('');
    const shouldHideSearch = ['creator', 'backpack', 'discover', 'friends', 'profile'].includes(mainTab);
    const deferredSearchTag = React.useDeferredValue(searchTag);
    const shouldRenderSheetContent = isDesktop || isSheetExpanded || !!selectedUser || mainTab === 'backpack';
    const { isItemDragging } = useLooterGame();

    React.useEffect(() => {
        (window as any).collapseLooterTab = () => {
            setIsSheetExpanded(false);
        };
        (window as any).expandLooterTab = () => {
            setIsSheetExpanded(true);
        };
        return () => {
            delete (window as any).collapseLooterTab;
            delete (window as any).expandLooterTab;
        };
    }, [setIsSheetExpanded]);

    React.useEffect(() => {
        if (selectedUser || mainTab !== 'friends' || socialSubTab !== 'posts') {
            lastSocialFeedRequestRef.current = '';
            return;
        }
        const requestKey = `${mainTab}:${socialSubTab}`;
        if (lastSocialFeedRequestRef.current === requestKey) return;
        lastSocialFeedRequestRef.current = requestKey;
        fetchFeedPosts();
    }, [fetchFeedPosts, mainTab, socialSubTab, selectedUser]);

    const handleEnterWorld = React.useCallback(() => {
        setIsSheetExpanded(false);
    }, [setIsSheetExpanded]);

    const isWhiteBg = mainTab !== 'backpack';

    return (
        <div
            className={`absolute left-0 right-0 md:left-[72px] md:right-auto md:translate-x-0 pointer-events-none z-[140] ${isDesktop ? 'top-0 bottom-0 overflow-visible' : (mainTab === 'backpack' ? 'top-0 bottom-0 overflow-visible w-full' : 'top-0 bottom-0 overflow-hidden w-full')}`}
            style={isDesktop ? { width: panelWidth } : {}}
        >
            <motion.div
                className={`absolute top-0 left-0 right-0 h-full ${isWhiteBg ? 'bg-white' : 'bg-[#121417]'} rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[4px_0_24px_rgba(0,0,0,0.05)] md:border-r ${isWhiteBg ? 'border-gray-100' : 'border-white/5'} flex flex-col pointer-events-auto`}
                variants={{
                    full: {
                        y: (!isDesktop && mainTab === 'backpack') ? '55%' : 0,
                        x: 0,
                    },
                    collapsed: {
                        y: isDesktop ? 0 : '100%',
                        x: isDesktop ? '-100%' : 0,
                    },
                }}
                initial="collapsed"
                animate={isSheetExpanded ? 'full' : 'collapsed'}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                drag={isDesktop || isItemDragging || mainTab === 'backpack' ? false : 'y'}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.05}
                onDragEnd={(e, info) => {
                    if (isDesktop) return;
                    const threshold = 60;
                    if (!isSheetExpanded) {
                        if (info.offset.y < -threshold) {
                            setIsSheetExpanded(true);
                        }
                    } else if (info.offset.y > threshold && !isItemDragging) {
                        setIsSheetExpanded(false);
                        setSelectedUser(null);
                    }
                }}
            >
                <button
                    onClick={() => {
                        if (!isItemDragging) setIsSheetExpanded(!isSheetExpanded);
                    }}
                    className="hidden md:flex absolute top-1/2 -right-[23px] -translate-y-1/2 w-6 h-14 bg-white border border-l-0 border-gray-200 rounded-r-[10px] shadow-[4px_0_10px_rgba(0,0,0,0.05)] items-center justify-center cursor-pointer hover:bg-gray-50 z-50 text-gray-500 hover:text-gray-700 transition-colors"
                    title={isSheetExpanded ? 'Collapse panel' : 'Expand panel'}
                >
                    {isSheetExpanded ? <ChevronLeft className="w-4 h-4 ml-[-4px]" /> : <ChevronRight className="w-4 h-4 ml-[-4px]" />}
                </button>

                {isDesktop && isSheetExpanded && (
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0}
                        dragMomentum={false}
                        onDrag={(e, info) => {
                            setPanelWidth((prev) => Math.min(Math.max(320, prev + info.delta.x), 800));
                        }}
                        className="absolute top-0 right-[-4px] bottom-0 w-2 cursor-col-resize hover:bg-blue-500/30 z-[160] transition-colors"
                    />
                )}

                <SheetHeader
                    isDesktop={isDesktop}
                    isSheetExpanded={isSheetExpanded}
                    isWhiteBg={isWhiteBg}
                    mainTab={mainTab}
                    searchTag={searchTag}
                    shouldHideSearch={shouldHideSearch}
                    setIsSheetExpanded={setIsSheetExpanded}
                    setIsSearchOverlayOpen={setIsSearchOverlayOpen}
                    setSelectedUser={setSelectedUser}
                    setSearchTag={setSearchTag}
                />

                <BottomSheetContent
                    {...props}
                    deferredSearchTag={deferredSearchTag}
                    exploreSubTab={exploreSubTab}
                    socialSubTab={socialSubTab}
                    shouldHideSearch={shouldHideSearch}
                    shouldRenderSheetContent={shouldRenderSheetContent}
                    setExploreSubTab={setExploreSubTab}
                    setSocialSubTab={setSocialSubTab}
                    onSearchClick={() => setIsSearchOverlayOpen?.(true)}
                    onEnterWorld={handleEnterWorld}
                    onPostClick={onPostClick}
                />

                {/* Desktop: SubTabSwitcher inside sheet (static positioning) */}
                {isDesktop && isSheetExpanded && !selectedUser && mainTab === 'discover' && (
                    <SubTabSwitcher
                        value={exploreSubTab}
                        onChange={handleExploreSubTabChange}
                        options={[
                            { value: 'games', label: 'Games' },
                            { value: 'creator', label: 'Creator' },
                        ]}
                    />
                )}
                {isDesktop && isSheetExpanded && !selectedUser && mainTab === 'friends' && (
                    <SubTabSwitcher
                        value={socialSubTab}
                        onChange={handleSocialSubTabChange}
                        options={[
                            { value: 'posts', label: 'Posts' },
                            { value: 'nearby', label: 'Nearby' },
                        ]}
                    />
                )}
            </motion.div>

            {/* Mobile: subtab bar outside sheet, fixed positioning */}
            {!isDesktop && isSheetExpanded && !selectedUser && (
                <MobileSubTabBar
                    mainTab={mainTab}
                    exploreSubTab={exploreSubTab}
                    socialSubTab={socialSubTab}
                    isLooterGameMode={false}
                    onExploreSubTabChange={handleExploreSubTabChange}
                    onSocialSubTabChange={handleSocialSubTabChange}
                />
            )}
        </div>
    );
};

export default BottomSheet;
