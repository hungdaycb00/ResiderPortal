const fs = require('fs');

const alinMapPath = 'E:/Resider/resider-portal/src/components/AlinMap.tsx';
let content = fs.readFileSync(alinMapPath, 'utf-8');

// Replace Top Search Bar classes and structure
const topSearchRegex = /<div className=\{`absolute top-12 left-4 right-4 z-\[180\] flex gap-2 transition-all duration-300 \$\{isDesktop && isSheetExpanded \? 'md:top-0 md:left-\[72px\] md:w-\[400px\] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-\[88px\] md:top-6 md:w-\[384px\]'\}`\}>\s*<div className=\{`flex-1 backdrop-blur-xl rounded-full flex items-center px-4 py-3 overflow-hidden transition-all duration-300 \$\{isDesktop && isSheetExpanded \? 'bg-white border border-gray-200 shadow-none' : 'bg-white\/90 shadow-\[0_4px_20px_rgba\(0,0,0,0\.15\)\]'\}`\}>\s*<Search className="w-5 h-5 text-gray-500 mr-2 shrink-0" \/>\s*<input\s*type="text"\s*placeholder="Search..."\s*onFocus=\{\(\) => setIsSheetExpanded\((true|!isSheetExpanded)\)\}\s*className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"\s*value=\{searchTag\}\s*onChange=\{\(e\) => setSearchTag\(e\.target\.value\)\}\s*\/>/;

const replacement1 = `<div className={\`absolute top-12 left-4 right-4 z-[180] flex gap-2 transition-all duration-300 \${isDesktop && isSheetExpanded ? 'md:top-0 md:left-[72px] md:w-[400px] md:bg-white md:pt-5 md:pb-2 md:px-4' : 'md:left-[88px] md:top-6 md:w-[384px]'} \${!isDesktop && isSheetExpanded ? 'opacity-0 pointer-events-none translate-y-[-10px]' : 'opacity-100'}\`}>
                <div className={\`flex-1 backdrop-blur-xl rounded-full flex items-center px-4 py-3 overflow-hidden transition-all duration-300 \${isDesktop && isSheetExpanded ? 'bg-white border border-gray-200 shadow-none' : 'bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'}\`}>
                    <Search className="w-5 h-5 text-gray-500 mr-2 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        onFocus={() => {
                            setIsSheetExpanded(true);
                            if (!isDesktop) {
                                setTimeout(() => document.getElementById('sheet-search-mobile')?.focus(), 50);
                            }
                        }}
                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />`;

content = content.replace(topSearchRegex, replacement1);

// Replace the Header Part in the mobile Sheet to add the Inner Search Bar
const headerRegex = /\{\/\* Hover Area \/ Handle \(Mobile Only\) \*\/\}\s*<div className="w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer active:bg-gray-50 transition-colors shadow-\[0_-2px_8px_rgba\(0,0,0,0\.02\)\]" onClick=\{\(\) => setIsSheetExpanded\(!isSheetExpanded\)\}>\s*<div className="w-10 h-1 bg-gray-300 rounded-full mb-1" \/>\s*<div className="text-gray-400">\s*\{isSheetExpanded \? <ChevronDown className="w-4 h-4" \/> : <ChevronUp className="w-4 h-4" \/>\}\s*<\/div>\s*<\/div>/;

const replacement2 = `{/* Hover Area / Handle (Mobile Only) */}
                        <div className="w-full flex md:hidden flex-col items-center pt-2 pb-1 cursor-pointer active:bg-gray-50 transition-colors shadow-[0_-2px_8px_rgba(0,0,0,0.02)]" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
                            <div className="text-gray-400">
                                {isSheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </div>
                        </div>

                        {/* MOBILE Search Bar inside Sheet */}
                        {!isDesktop && isSheetExpanded && (
                            <div className="px-4 pb-3 -mt-1 block md:hidden animate-in fade-in duration-300">
                                <div className="flex bg-gray-100 rounded-full items-center px-4 py-2 border border-gray-200 shadow-inner">
                                    <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                                    <input
                                        id="sheet-search-mobile"
                                        type="text"
                                        placeholder="Search..."
                                        className="bg-transparent border-none outline-none text-gray-900 text-sm w-full placeholder:text-gray-500 font-medium font-sans"
                                        value={searchTag}
                                        onChange={(e) => setSearchTag(e.target.value)}
                                    />
                                    {searchTag && (
                                        <button onClick={() => setSearchTag('')} className="p-1 hover:bg-gray-200 rounded-full ml-1">
                                            <X className="w-3 h-3 text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}`;

content = content.replace(headerRegex, replacement2);

fs.writeFileSync(alinMapPath, content, 'utf-8');
console.log('AlinMap.tsx successfully updated!');
