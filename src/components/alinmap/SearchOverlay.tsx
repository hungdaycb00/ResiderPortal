import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, Search, TrendingUp, X } from 'lucide-react';
import SheetSearchResults from './SheetSearchResults';
import { fetchAlinSearch } from './search';

const TRENDING_TOPICS = ['#looter', '#trading', 'Chợ phiên', '#chill', 'Săn rồng'];
const RECENT_SEARCHES_KEY = 'alin_recent_searches';

interface SearchOverlayProps {
  searchTag: string;
  setSearchTag: (v: string) => void;
  nearbyUsers: any[];
  setSelectedUser: (user: any) => void;
  setActiveTab: (tab: 'info' | 'posts' | 'saved') => void;
  setIsSheetExpanded: (v: boolean) => void;
  handlePlayGame?: (game: any) => void;
  onClose: () => void;
  isDesktop?: boolean;
  isSheetExpanded?: boolean;
  panelWidth?: number;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  searchTag,
  setSearchTag,
  nearbyUsers,
  setSelectedUser,
  setActiveTab,
  setIsSheetExpanded,
  handlePlayGame,
  onClose,
  isDesktop,
  isSheetExpanded,
  panelWidth,
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count?: number }>>([]);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = !isDesktop;
  const useDesktopPanel = isDesktop && isSheetExpanded;

  const focusSearchInput = React.useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  }, []);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      focusSearchInput();
      if (isMobile) {
        window.setTimeout(focusSearchInput, 120);
      }
    }, 50);

    return () => window.clearTimeout(focusTimer);
  }, [focusSearchInput, isMobile]);

  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      const visualHeight = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const inset = Math.max(0, Math.round(window.innerHeight - visualHeight - offsetTop));
      setKeyboardInset(inset);
    };

    updateKeyboardInset();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateKeyboardInset);
    viewport?.addEventListener('scroll', updateKeyboardInset);
    window.addEventListener('resize', updateKeyboardInset);

    return () => {
      viewport?.removeEventListener('resize', updateKeyboardInset);
      viewport?.removeEventListener('scroll', updateKeyboardInset);
      window.removeEventListener('resize', updateKeyboardInset);
    };
  }, [isMobile]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    void (async () => {
      try {
        const result = await fetchAlinSearch('', controller.signal);
        if (alive) {
          setTrendingTags(Array.isArray(result.tags) ? result.tags.slice(0, 8) : []);
        }
      } catch {
        if (alive) setTrendingTags([]);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(q => q !== trimmed)].slice(0, 10);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(q => q !== queryToRemove);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTag.trim()) {
      saveRecentSearch(searchTag);
    }
  };

  const handleResultClick = () => {
    if (searchTag.trim()) {
      saveRecentSearch(searchTag);
    }
    onClose();
  };

  const renderSearchResults = (mobile = false) => (
    <div className={`flex-1 min-h-0 overflow-y-auto subtle-scrollbar bg-gray-50 ${mobile ? 'pb-44' : ''}`} data-immersive-scroll>
      {searchTag.trim().length >= 2 ? (
        <div className="bg-white min-h-full">
          <SheetSearchResults
            searchTag={searchTag}
            nearbyUsers={nearbyUsers}
            setSelectedUser={setSelectedUser}
            setActiveTab={setActiveTab}
            setIsSheetExpanded={setIsSheetExpanded}
            setSearchTag={setSearchTag}
            handlePlayGame={handlePlayGame}
            onClose={handleResultClick}
          />
        </div>
      ) : (
        <div className="bg-white min-h-full px-4 py-4">
          {recentSearches.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Tìm kiếm gần đây</h3>
              </div>
              <div className="space-y-1">
                {recentSearches.map((query, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchTag(query);
                      saveRecentSearch(query);
                      window.setTimeout(focusSearchInput, 0);
                    }}
                    className="group flex w-full items-center justify-between rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        <Clock className="h-4 w-4" />
                      </div>
                      <span className="text-[15px] font-medium text-gray-700">{query}</span>
                    </div>
                    <div
                      onClick={(e) => removeRecentSearch(e, query)}
                      className="rounded-full p-2 text-gray-400 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 md:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSearchBar = (mobile = false) => (
    <div className={`flex items-center gap-2 ${mobile ? 'px-4 pt-2 pb-3' : 'px-3 py-3 bg-white'}`}>
      <button
        type="button"
        onClick={() => onClose()}
        className={`shrink-0 rounded-full text-gray-600 transition-colors active:scale-95 ${
          mobile
            ? 'inline-flex h-12 w-12 items-center justify-center border border-gray-200 bg-white shadow-sm hover:bg-gray-50'
            : 'p-2 hover:bg-gray-100'
        }`}
      >
        <ArrowLeft className={mobile ? 'h-[18px] w-[18px]' : 'h-5 w-5'} />
      </button>

      <form onSubmit={handleSearchSubmit} className="flex-1">
        <div className={`flex items-center rounded-full ${mobile ? 'border border-gray-200 bg-white px-4 py-3 shadow-sm' : 'bg-gray-100 px-4 py-2'}`}>
          <Search className={`mr-2 shrink-0 ${mobile ? 'h-4 w-4 text-gray-400' : 'h-4 w-4 text-gray-500'}`} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm kiếm bạn bè, game, bài viết..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            enterKeyHint="search"
            inputMode="search"
            spellCheck={false}
            autoFocus
            className="w-full border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-500"
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
          />
          {searchTag && (
            <button
              type="button"
              onClick={() => {
                setSearchTag('');
                window.setTimeout(focusSearchInput, 0);
              }}
              className="ml-1 rounded-full p-1 hover:bg-gray-200"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderMobileTrending = () => {
    if (searchTag.trim()) return null;

    const chips = trendingTags.length > 0
      ? trendingTags.map((item) => ({
          key: item.tag,
          label: item.tag,
          count: item.count,
        }))
      : TRENDING_TOPICS.map((topic) => ({
          key: topic,
          label: topic,
          count: undefined as number | undefined,
        }));

    return (
      <div className="px-4 pt-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">Xu hướng tìm kiếm</h3>
        </div>
        <div className="-mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 pr-8 scrollbar-hide">
          {chips.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSearchTag(item.label);
                saveRecentSearch(item.label);
                window.setTimeout(focusSearchInput, 0);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors active:scale-[0.98] hover:bg-blue-100"
            >
              <TrendingUp className="h-3 w-3" />
              <span className="whitespace-nowrap">{item.label}</span>
              {typeof item.count === 'number' ? <span className="text-[10px] text-blue-400">x{item.count}</span> : null}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`z-[400] flex flex-col overflow-hidden bg-white animate-in fade-in duration-200 ${
        useDesktopPanel
          ? 'fixed top-0 bottom-0 rounded-l-[32px] shadow-[-4px_0_24px_rgba(0,0,0,0.05)] slide-in-from-left-2'
          : 'fixed inset-0 slide-in-from-bottom-2'
      }`}
      style={
        useDesktopPanel
          ? { left: 72, width: panelWidth }
          : isMobile
            ? { top: 0, left: 0, right: 0, bottom: keyboardInset }
            : undefined
      }
    >
      {useDesktopPanel ? (
        <>
          <div className="border-b border-gray-100">{renderSearchBar(false)}</div>
          {renderSearchResults(false)}
        </>
      ) : (
        <>
          {renderSearchResults(true)}

          <div
            className="shrink-0 border-t border-gray-100 bg-white/96 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            {renderMobileTrending()}
            {renderSearchBar(true)}
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(SearchOverlay);

