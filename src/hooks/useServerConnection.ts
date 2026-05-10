import { useState, useEffect, useCallback, useRef } from 'react';
import { externalApi, normalizeImageUrl } from '../services/externalApi';
import { initSocket, disconnectSocket, getSocket } from '../utils/socket';
import { setupSocketErrorHandlers } from '../utils/socketErrorHandler';

export function useServerConnection() {
    const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [serverError, setServerError] = useState<string | null>(null);
    const [cloudflareUrl, setCloudflareUrl] = useState(() => {
        const saved = localStorage.getItem('cloudflareUrl');
        if (window.location.hostname.endsWith('.trycloudflare.com')) {
            return window.location.origin;
        }
        return saved || import.meta.env.VITE_EXTERNAL_API_URL || 'http://localhost:3000';
    });
    const lastSocketUrlRef = useRef<string | null>(null);

    const checkServer = useCallback(async (url?: string) => {
        setServerStatus('checking');
        const result = await externalApi.checkStatus(url);
        setServerStatus(result.status);
        setServerError(result.message || null);
        if (result.status === 'offline' && result.message === 'Proxy unreachable' && cloudflareUrl && cloudflareUrl !== window.location.origin) {
            setCloudflareUrl('');
        }
    }, [cloudflareUrl]);

    // Persist cloudflareUrl
    useEffect(() => {
        localStorage.setItem('cloudflareUrl', cloudflareUrl);
        checkServer(cloudflareUrl);
    }, [cloudflareUrl]);

    // Tunnel detection
    useEffect(() => {
        if (window.location.hostname.endsWith('.trycloudflare.com') && cloudflareUrl !== window.location.origin) {
            setCloudflareUrl(window.location.origin);
        }

        checkServer(cloudflareUrl);
        const interval = setInterval(() => {
            checkServer(cloudflareUrl);
        }, 120000);
        return () => clearInterval(interval);
    }, [cloudflareUrl]);

    // Socket reconnect on URL change
    useEffect(() => {
        if (cloudflareUrl !== lastSocketUrlRef.current) {
            console.log(`🔌 URL Changed: ${lastSocketUrlRef.current} -> ${cloudflareUrl}. Re-initializing socket...`);
            lastSocketUrlRef.current = cloudflareUrl;
            disconnectSocket();
            initSocket();
            setupSocketErrorHandlers();
        }
    }, [cloudflareUrl]);

    return {
        serverStatus, serverError,
        cloudflareUrl, setCloudflareUrl,
        checkServer,
    };
}
