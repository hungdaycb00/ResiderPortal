import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Clock, Search, TrendingUp, X } from 'lucide-react';
import SheetSearchResults from './SheetSearchResults';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    void (async () => {
      try {
        const { fetchAlinSearch } = await import('./search');
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

  const useDesktopPanel = isDesktop && isSheetExpanded;

  return (
    <div
      className={`z-[400] bg-white flex flex-col animate-in fade-in duration-200 ${
        useDesktopPanel
          ? 'fixed top-0 bottom-0 rounded-l-[32px] shadow-[-4px_0_24px_rgba(0,0,0,0.05)] slide-in-from-left-2'
          : 'fixed inset-0 slide-in-from-bottom-2'
      }`}
      style={useDesktopPanel ? { left: 72, width: panelWidth } : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={() => onClose()}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
            <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm bạn bè, game, bài viết..."
              className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
            />
            {searchTag && (
              <button
                type="button"
                onClick={() => {
                  setSearchTag('');
                  inputRef.current?.focus();
                }}
                className="p-1 hover:bg-gray-200 rounded-full ml-1"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto subtle-scrollbar bg-gray-50" data-immersive-scroll>
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
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Tìm kiếm gần đây</h3>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchTag(query);
                        saveRecentSearch(query);
                      }}
                      className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[15px] text-gray-700 font-medium">{query}</span>
                      </div>
                      <div
                        onClick={(e) => removeRecentSearch(e, query)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending / Suggested */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Xu hướng tìm kiếm</h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.length > 0 ? trendingTags.map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => {
                      setSearchTag(item.tag);
                      saveRecentSearch(item.tag);
                    }}
                    className="inline-flex items-center gap-2 bg-blue-50/50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    {item.tag}
                    {item.count ? <span className="text-[10px] text-blue-400">x{item.count}</span> : null}
                  </button>
                )) : TRENDING_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSearchTag(topic);
                      saveRecentSearch(topic);
                    }}
                    className="inline-flex items-center gap-2 bg-blue-50/50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(SearchOverlay);
