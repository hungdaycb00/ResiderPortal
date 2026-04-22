const fs = require('fs');
const file = 'e:/Resider/resider-portal/src/components/AlinMap.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr1 = `                                        {/* User ID + Copy */}
                                        <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your User ID</p>
                                                <p className="text-[13px] font-mono font-bold text-gray-900 truncate">{myUserId || '...'}</p>
                                            </div>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(myUserId); alert("ID copied to clipboard!"); }}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>`;

code = code.replace(targetStr1, "");
code = code.replace(targetStr1.replace(/\n/g, "\r\n"), "");

fs.writeFileSync(file, code);
console.log("Removed UI block");
