/**
 * Client-Side Routing Helpers
 * Maps between internal tab IDs and URL paths
 */

export type AppTab = 'home' | 'categories' | 'support' | 'chat' | 'friends' | 'creator' | 'alin' | 'discover' | 'social' | 'notifications' | 'profile' | 'backpack';

// Tabs that trigger AlinMap overlay
export const ALIN_MAP_TABS: string[] = ['alin', 'discover', 'friends', 'social', 'notifications', 'profile', 'creator', 'backpack'];

const PATH_TO_TAB: Record<string, AppTab> = {
    '': 'discover',
    'explore': 'discover',
    'social': 'friends',
    'profile': 'profile',
    'notifications': 'notifications',
    'creator': 'creator',
    'games': 'home',
    'support': 'support',
    'backpack': 'backpack',
};

const TAB_TO_PATH: Record<string, string> = {
    'discover': '/explore',
    'alin': '/explore',
    'friends': '/social',
    'social': '/social',
    'profile': '/profile',
    'notifications': '/notifications',
    'creator': '/creator',
    'home': '/games',
    'categories': '/games/categories',
    'support': '/support',
    'chat': '/social',
    'backpack': '/backpack',
};

/**
 * Derive the activeTab from the current URL pathname.
 * Unknown paths default to 'discover' (Explore / AlinMap).
 */
export function pathToTab(pathname: string): AppTab {
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) return 'discover';

    // Handle /games/categories
    if (segments[0] === 'games' && segments[1] === 'categories') return 'categories';

    // Handle /profile/:username — still shows profile tab
    if (segments[0] === 'profile') return 'profile';
    if (segments[0] === 'explore' && segments[1] === 'looter-game') return 'backpack';
    if (segments[0] === 'explore' || segments[0] === 'games') return segments[0] === 'games' ? 'home' : 'discover';
    
    return PATH_TO_TAB[segments[0]] || 'discover';
}

/**
 * Extract slug from URL path (e.g. /explore/slug or /games/slug)
 */
export function extractSlug(pathname: string): string | null {
    const segments = pathname.split('/').filter(Boolean);
    if ((segments[0] === 'explore' || segments[0] === 'games') && segments[1]) {
        return segments[1].toLowerCase();
    }
    return null;
}

/**
 * Extract sub-game from /explore/:game path
 */
export const extractExploreGame = extractSlug;

/**
 * Convert an internal tab ID to a URL path for navigation.
 */
export function tabToPath(tab: string): string {
    return TAB_TO_PATH[tab] || '/';
}

/**
 * Extract username from /profile/:username path, if present.
 */
export function extractProfileUsername(pathname: string): string | null {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] === 'profile' && segments[1]) {
        return decodeURIComponent(segments[1]);
    }
    return null;
}
