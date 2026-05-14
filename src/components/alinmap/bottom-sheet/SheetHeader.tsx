import type React from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface SheetHeaderProps {
    isDesktop: boolean;
    isSheetExpanded: boolean;
    isWhiteBg: boolean;
    mainTab: string;
    searchTag: string;
    shouldHideSearch: boolean;
    setIsSheetExpanded: (v: boolean) => void;
    setIsSearchOverlayOpen?: (v: boolean) => void;
    setSelectedUser: (user: any) => void;
    setSearchTag: (v: string) => void;
}

const SheetHeader: React.FC<SheetHeaderProps> = ({
    isDesktop,
    isSheetExpanded,
    isWhiteBg,
    mainTab,
    searchTag,
    shouldHideSearch,
    setIsSheetExpanded,
    setIsSearchOverlayOpen,
    setSelectedUser,
    setSearchTag,
}) => (
    <div className={`backdrop-blur-md sticky top-0 z-[110] shrink-0 border-b ${isWhiteBg ? 'bg-white/80 border-gray-100' : 'bg-[#121417]/80 border-white/5'}`}>
        {!isDesktop && mainTab !== 'backpack' && (
            <div
                className={`w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer transition-colors ${isWhiteBg ? 'active:bg-gray-50' : 'active:bg-white/5'}`}
                onClick={() => {
                    if (!isSheetExpanded) {
                        setIsSheetExpanded(true);
                    } else {
                        setIsSheetExpanded(false);
                        setSelectedUser(null);
                    }
                }}
            >
                <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                <div className="text-gray-400">
                    {isSheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </div>
        )}

        {isSheetExpanded && !shouldHideSearch && (
            <div className="px-4 pb-3 -mt-1 animate-in fade-in duration-300">
                <div className={`flex rounded-full items-center px-4 py-2 border shadow-inner ${isWhiteBg ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                    <Search className={`w-4 h-4 mr-2 shrink-0 ${isWhiteBg ? 'text-gray-500' : 'text-white/40'}`} />
                    <input
                        id="sheet-search-input"
                        type="text"
                        placeholder="Tìm kiếm..."
                        onFocus={(e) => {
                            if (!isDesktop) {
                                e.target.blur();
                                setIsSearchOverlayOpen?.(true);
                            }
                        }}
                        className={`bg-transparent border-none outline-none text-sm w-full font-medium font-sans ${isWhiteBg ? 'text-gray-900 placeholder:text-gray-500' : 'text-white placeholder:text-white/30'}`}
                        value={searchTag}
                        onChange={(e) => isDesktop && setSearchTag(e.target.value)}
                        readOnly={!isDesktop}
                        onClick={() => !isDesktop && setIsSearchOverlayOpen?.(true)}
                    />
                    {searchTag && (
                        <button onClick={() => setSearchTag('')} className={`p-1 rounded-full ml-1 ${isWhiteBg ? 'hover:bg-gray-200' : 'hover:bg-white/10'}`}>
                            <X className="w-3 h-3 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
);

export default SheetHeader;
