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

        {!isDesktop && isSheetExpanded && !shouldHideSearch && (
            <div className="px-4 pb-3 -mt-1 block md:hidden animate-in fade-in duration-300">
                <div className="flex bg-gray-100 rounded-full items-center px-4 py-2 border border-gray-200 shadow-inner">
                    <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                    <input
                        id="sheet-search-mobile"
                        type="text"
                        placeholder="Search..."
                        onFocus={(e) => {
                            e.target.blur();
                            setIsSearchOverlayOpen?.(true);
                        }}
                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans cursor-pointer"
                        value={searchTag}
                        readOnly
                    />
                    {searchTag && (
                        <button onClick={() => setSearchTag('')} className="p-1 hover:bg-gray-200 rounded-full ml-1">
                            <X className="w-3 h-3 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
);

export default SheetHeader;
