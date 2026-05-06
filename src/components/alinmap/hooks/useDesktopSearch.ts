import { useState, useEffect, useRef } from 'react';
import { EMPTY_SEARCH_RESULTS, fetchAlinSearch, type AlinSearchResults } from '../search';

export function useDesktopSearch(searchTag: string, isDesktop: boolean) {
  const [desktopSearchResults, setDesktopSearchResults] = useState<AlinSearchResults>(EMPTY_SEARCH_RESULTS);
  const [isSearchingDesktop, setIsSearchingDesktop] = useState(false);
  const [showDesktopResults, setShowDesktopResults] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchTag || searchTag.trim().length < 2 || !isDesktop) {
      setDesktopSearchResults(EMPTY_SEARCH_RESULTS);
      setShowDesktopResults(false);
      return;
    }
    setIsSearchingDesktop(true);
    setShowDesktopResults(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        setDesktopSearchResults(await fetchAlinSearch(searchTag.trim()));
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
