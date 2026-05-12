/**
 * Cache Buster Utility
 * Tự động dọn cache trình duyệt theo phiên bản build mới.
 */

const STORAGE_KEY = 'APP_BUILD_VERSION';
const CACHE_KEY_MATCHERS = [/asset/i, /vite/i, /workbox/i, /game/i, /alin/i, /resider/i];
const PRESERVED_LOCAL_STORAGE_KEYS = ['cloudflareUrl', 'deviceId', 'accessToken', 'user'];

async function clearServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(
            registrations.map((registration) => registration.unregister()),
        );
    } catch (error) {
        console.warn('[CacheBuster] Failed to unregister service workers:', error);
    }
}

async function clearCacheStorage() {
    if (!('caches' in window)) return;

    try {
        const keys = await caches.keys();
        await Promise.allSettled(
            keys
                .filter((cacheKey) => CACHE_KEY_MATCHERS.some((matcher) => matcher.test(cacheKey)))
                .map((cacheKey) => caches.delete(cacheKey)),
        );
    } catch (error) {
        console.warn('[CacheBuster] Failed to clear Cache Storage:', error);
    }
}

export async function checkAppVersion(currentVersion: string): Promise<boolean> {
    try {
        const storedVersion = localStorage.getItem(STORAGE_KEY);
        if (storedVersion === currentVersion) {
            return false;
        }

        console.warn(`[CacheBuster] Build changed: ${storedVersion ?? 'none'} -> ${currentVersion}`);

        const preservedEntries = PRESERVED_LOCAL_STORAGE_KEYS.reduce<Record<string, string>>((acc, key) => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                acc[key] = value;
            }
            return acc;
        }, {});

        localStorage.clear();
        sessionStorage.clear();

        Object.entries(preservedEntries).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        localStorage.setItem(STORAGE_KEY, currentVersion);

        await Promise.all([
            clearServiceWorkers(),
            clearCacheStorage(),
        ]);

        if (storedVersion) {
            window.location.reload();
            return true;
        }

        return false;
    } catch (error) {
        console.error('[CacheBuster] Failed to check version:', error);
        return false;
    }
}
