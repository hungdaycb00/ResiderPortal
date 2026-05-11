import type React from 'react';

export type BottomSheetMainTab =
    | 'discover'
    | 'friends'
    | 'notifications'
    | 'profile'
    | 'creator'
    | 'backpack'
    | string;

export type BottomSheetActiveTab = 'info' | 'posts' | 'saved';
export type ExploreSubTab = 'games' | 'creator';
export type SocialSubTab = 'posts' | 'nearby';

export interface BottomSheetProps {
    isDesktop: boolean;
    isSheetExpanded: boolean;
    selectedUser: any;
    activeTab: BottomSheetActiveTab;
    mainTab: BottomSheetMainTab;
    nearbyUsers: any[];
    friends: any[];
    games: any[];
    userGames: any[];
    userPosts: any[];
    feedPosts: any[];
    myUserId: string | null;
    myDisplayName: string;
    myObfPos: { lat: number; lng: number } | null;
    user: any;
    searchTag: string;
    isCreatingPost: boolean;
    postTitle: string;
    postPrivacy: 'public' | 'friends' | 'private';
    postIsStarred: boolean;
    isSavingPost: boolean;
    galleryActive: boolean;
    currentProvince: string | null;
    radius: number;
    fetchUserPosts: (uid: string) => void;
    ws: React.MutableRefObject<WebSocket | null>;
    panX: any;
    panY: any;
    onLocateUser?: (lat: number, lng: number) => void;
    externalApi: any;
    onOpenChat?: (id: string, name: string, avatar?: string) => void;
    handlePlayGame?: (game: any) => void;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
    handleUpdateRadius: (v: number) => void;
    setIsSheetExpanded: (v: boolean) => void;
    setIsSearchOverlayOpen?: (v: boolean) => void;
    panelWidth: number;
    setPanelWidth: (v: number | ((prev: number) => number)) => void;
    setSelectedUser: (user: any) => void;
    setActiveTab: (tab: BottomSheetActiveTab) => void;
    setMainTab: (tab: any) => void;
    setSearchTag: (v: string) => void;
    setMyDisplayName: (v: string) => void;
    myAvatarUrl: string;
    setMyAvatarUrl: (v: string) => void;
    setIsCreatingPost: (v: boolean) => void;
    setPostTitle: (v: string) => void;
    setPostPrivacy: (v: 'public' | 'friends' | 'private') => void;
    setPostIsStarred: (v: boolean) => void;
    handleCreatePost: (files: File[]) => void;
    handleUpdatePostPrivacy: (postId: string, privacy: string) => void;
    handleStarPost: (postId: string) => void;
    handleDeletePost: (postId: string) => void;
    fetchFeedPosts: () => void;
    cloudflareUrl?: string;
    triggerAuth?: (callback: () => void) => void;
    requireAuth?: (actionLabel: string, afterLogin?: () => void) => boolean;
    logout?: () => void;
    externalOpenList?: boolean;
    onOpenListChange?: (v: boolean) => void;
    onPublishSuccess?: () => void;
    onPostClick?: (post: any) => void;
    requestLocation?: (
        forceInvisible?: boolean,
        wsRef?: React.MutableRefObject<WebSocket | null>,
        setIsVisibleOnMap?: (v: boolean) => void
    ) => void;
}
