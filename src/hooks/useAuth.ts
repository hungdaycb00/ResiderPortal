import { useState, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { externalApi, normalizeImageUrl } from '../services/externalApi';
import { User } from '../types';

const PROFILE_DISPLAY_NAME_KEY = 'alin_profile_display_name';

interface UseAuthReturn {
    user: User | null;
    setUser: Dispatch<SetStateAction<User | null>>;
    isAuthOpen: boolean;
    setIsAuthOpen: (v: boolean) => void;
    isAuthCallbackQueue: (() => void) | null;
    setAuthCallbackQueue: (fn: (() => void) | null) => void;
    handleLogin: () => void;
    login: () => void;
    logout: () => void;
    handleUpdateAvatar: (url: string) => Promise<void>;
    initializeGSI: () => void;
    handleCredentialResponse: (response: any) => Promise<void>;
}

export function useAuth(
    serverStatus: 'online' | 'offline' | 'checking',
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void,
): UseAuthReturn {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) return null;
        try {
            const parsed = JSON.parse(savedUser);
            const cachedDisplayName = localStorage.getItem(PROFILE_DISPLAY_NAME_KEY);
            if (cachedDisplayName && cachedDisplayName.trim() && parsed.displayName !== cachedDisplayName) {
                return { ...parsed, displayName: cachedDisplayName };
            }
            return parsed;
        } catch (e) {
            console.error("Failed to parse saved user", e);
            localStorage.removeItem('user');
            return null;
        }
    });
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isAuthCallbackQueue, setAuthCallbackQueue] = useState<(() => void) | null>(null);
    const gsiInitialized = useRef(false);

    useEffect(() => {
        if (user) localStorage.setItem('user', JSON.stringify(user));
    }, [user]);

    const handleCredentialResponse = useCallback(async (response: any) => {
        try {
            if (serverStatus !== 'online') {
                showNotification('Could not connect to server for login.', 'error');
                return;
            }
            const result = await externalApi.syncGoogleLogin(response.credential);
            if (result.success && result.user) {
                const loggedInUser: User = {
                    uid: result.user.id || result.user.uid,
                    email: result.user.email,
                    displayName: result.user.display_name || result.user.displayName,
                    photoURL: normalizeImageUrl(result.user.photoURL || result.user.avatar_url),
                    isAdmin: !!result.user.is_admin,
                };
                setUser(loggedInUser);
                localStorage.setItem('user', JSON.stringify(loggedInUser));
                if (!localStorage.getItem(PROFILE_DISPLAY_NAME_KEY) && loggedInUser.displayName) {
                    localStorage.setItem(PROFILE_DISPLAY_NAME_KEY, loggedInUser.displayName);
                }
                showNotification('Login successful!', 'success');
            }
        } catch (error: any) {
            showNotification('Login failed: ' + (error.message || 'Unknown error'), 'error');
        }
    }, [serverStatus, showNotification]);

    const initializeGSI = useCallback(() => {
        if (gsiInitialized.current) return;
        if (!(window as any).google?.accounts?.id) return;

        (window as any).google.accounts.id.initialize({
            client_id: '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com',
            callback: handleCredentialResponse,
            cancel_on_tap_outside: false
        });
        gsiInitialized.current = true;
        console.log('✅ GSI initialized once');
    }, [handleCredentialResponse]);

    const handleLogin = () => {
        if ((window as any).google?.accounts?.id) {
            initializeGSI();
            (window as any).google.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed()) {
                    const reason = notification.getNotDisplayedReason();
                    if (reason === 'origin_not_allowed') {
                        showNotification('Auth Error: Current URL is not whitelisted in Google Console.', 'error');
                    } else {
                        showNotification('Login popup blocked or not displayed. Try again later.', 'info');
                    }
                }
            });
        } else {
            showNotification('Google Sign-In not ready. Please reload the page.', 'error');
        }
    };

    const login = () => {
        showNotification('Please use the Sign In button in the profile.', 'info');
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY);
        localStorage.removeItem('alin_profile_user_id');
        localStorage.removeItem('alin_profile_status');
        externalApi.clearDeviceId();
        showNotification('Logged out successfully', 'info');
        window.location.reload();
    };

    const handleUpdateAvatar = async (url: string) => {
        if (!user) return;
        try {
            await externalApi.syncUser({
                uid: user.uid,
                displayName: user.displayName,
                photoURL: url,
                email: user.email
            });
            setUser(prev => prev ? { ...prev, photoURL: url } : null);
            showNotification('Avatar updated!', 'success');
        } catch (err) {
            showNotification('Failed to update avatar', 'error');
        }
    };

    return {
        user, setUser,
        isAuthOpen, setIsAuthOpen,
        isAuthCallbackQueue, setAuthCallbackQueue,
        handleLogin, login, logout, handleUpdateAvatar,
        initializeGSI, handleCredentialResponse,
    };
}
