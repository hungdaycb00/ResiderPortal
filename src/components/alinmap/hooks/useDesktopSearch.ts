import { useState, useEffect, useRef } from 'react';
import { getBaseUrl } from '../../../services/externalApi';

export function useDesktopSearch(searchTag: string, isDesktop: boolean) {
  const API_BASE = getBaseUrl();
  const [desktopSearchResults, setDesktopSearchResults] = useState<{ posts: any[], users: any[] }>({ posts: [], users: [] });
  const [isSearchingDesktop, setIsSearchingDesktop] = useState(false);
  const [showDesktopResults, setShowDesktopResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchTag || searchTag.trim().length < 2 || !isDesktop) {
      setDesktopSearchResults({ posts: [], users: [] });
      setShowDesktopResults(false);
      return;
    }
    setIsSearchingDesktop(true);
    setShowDesktopResults(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchTag.trim())}`);
        const data = await resp.json();
        if (data.success) {
          setDesktopSearchResults({ posts: data.posts, users: data.users });
        }
      } catch (err) { console.error('[Desktop Search]', err); }
      setIsSearchingDesktop(false);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTag, isDesktop]);

  return {
    desktopSearchResults, isSearchingDesktop,
    showDesktopResults, setShowDesktopResults,
  };
}
