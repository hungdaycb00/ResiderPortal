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
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Load recent searches
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to parse recent searches', err);
    }

    // Handle back button
    window.history.pushState({ searchOverlay: true }, '');
    
    const handlePopState = (e: PopStateEvent) => {
      onCloseRef.current();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Auto focus
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up history if we close without going back (e.g. clicking a result)
      if (window.history.state?.searchOverlay) {
        window.history.back();
      }
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
    // Lịch sử state đã được dọn dẹp trong useEffect cleanup
    window.history.back(); // Gọi window.history.back() thay vì onClose trực tiếp, vì popstate event sẽ trigger onClose
  };

  return (
    <div className="fixed inset-0 z-[400] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white">
        <button 
          onClick={() => window.history.back()} 
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
      <div className="flex-1 overflow-y-auto subtle-scrollbar bg-gray-50">
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
                {TRENDING_TOPICS.map((topic, idx) => (
                  <button
                    key={idx}
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
