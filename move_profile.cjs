const fs = require('fs');
const path = 'e:/Resider/resider-portal/src/components/AlinMap.tsx';
let source = fs.readFileSync(path, 'utf8');

// I will extract the profileBlock!
// We know it starts with `{mainTab === 'profile' && !selectedUser && (` and ends with `)}`
const profileStartIdx = source.indexOf(`{mainTab === 'profile' && !selectedUser && (`);
if (profileStartIdx !== -1) {
    // The profile block ends at the `)}` that matches it.
    // I know it contains `</div>\n                                        )}` at the end
    const profileText = `                                {mainTab === 'profile' && !selectedUser && (\n` + source.substring(profileStartIdx + `                                {mainTab === 'profile' && !selectedUser && (\n`.length).split(`\n                                )} // END OF PROFILE`)[0];
    
    // Actually, it's easier to just take my profileBlock.txt and re-inject it!
    const profileBlock = fs.readFileSync('e:/Resider/resider-portal/profileBlock.txt', 'utf8');
    
    // Remove the current injected profile block by replacing the whole thing.
    // Wait, let's just do a clean cut!
    
    // Find where the friends block REALLY ends:
    let friendsTag = `                                        {/* Blocked Users */}`;
    let blockIdx = source.indexOf(friendsTag);
    let socialEndStr = `<p className="text-gray-400 text-xs font-medium">No blocked users</p>\n                                            </div>\n                                        )}\n                                    </div>\n                                )}`;
    let socialEndStrR = `<p className="text-gray-400 text-xs font-medium">No blocked users</p>\r\n                                            </div>\r\n                                        )}\r\n                                    </div>\r\n                                )}`;
    
    // Oh wait! In my AlinMap, `mainTab === 'profile'` is literally sitting right after `{socialSection === 'blocked' && ( ... )}` inside the `<div className="space-y-4 pt-4">` of `friends`!
    // Let's remove the profile block first.
    let startRemove = source.indexOf(`{mainTab === 'profile' && !selectedUser && (`);
    
    // The profile block ends with:
    let endStr1 = `Create your first post above!</p>\n                                                    </div>\n                                                )}\n                                            </div>\n                                        )}\n                                    </div>\n                                )}`;
    let endStr2 = `Create your first post above!</p>\r\n                                                    </div>\r\n                                                )}\r\n                                            </div>\r\n                                        )}\r\n                                    </div>\r\n                                )}`;
    
    let endRemove = source.indexOf(endStr1);
    if(endRemove === -1) endRemove = source.indexOf(endStr2);
    
    if(startRemove !== -1 && endRemove !== -1) {
        let actualEndOfProfile = endRemove + (endRemove === source.indexOf(endStr1) ? endStr1.length : endStr2.length);
        
        let cleanedSource = source.substring(0, startRemove) + source.substring(actualEndOfProfile);
        // Now it's clean (but missing the Close Profile modifications, which is fine, we can re-add them).
        
        // Let's append the profileBlock right after the friends block ends!
        let endOfFriends1 = `</p>\n                                            </div>\n                                        )}\n                                    </div>\n                                )}`;
        let endOfFriends2 = `</p>\r\n                                            </div>\r\n                                        )}\r\n                                    </div>\r\n                                )}`;
        
        // the string `No blocked users` is there!
        let searchFriendEnd = `<p className="text-gray-400 text-xs font-medium">No blocked users${endOfFriends1}`;
        let splitPoints = cleanedSource.split(searchFriendEnd);
        if(splitPoints.length < 2) {
            searchFriendEnd = `<p className="text-gray-400 text-xs font-medium">No blocked users${endOfFriends2}`;
            splitPoints = cleanedSource.split(searchFriendEnd);
        }
        
        if (splitPoints.length >= 2) {
            let finalNewSource = splitPoints[0] + searchFriendEnd + `\n` + profileBlock + `\n` + splitPoints[1];
            
            // Add the close button back to profileBlock implicitly!
            let closeBtnRepl = `                                            <div className="pt-4 pb-4">
                                                <button onClick={() => { setIsSheetExpanded(false); setMainTab('discover'); }} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-[20px] font-bold transition-all active:scale-95 shadow-sm">
                                                    <X className="w-5 h-5" /> Close Profile
                                                </button>
                                            </div>
                                            </>`;
            finalNewSource = finalNewSource.replace(`                                            </>`, closeBtnRepl);
            finalNewSource = finalNewSource.replace(`                                            </>`, closeBtnRepl); // just in case
            
            fs.writeFileSync(path, finalNewSource);
            console.log("SUCCESSFULLY MOVED PROFILE OUT OF FRIENDS!");
        } else {
            console.log("Failed to find end of friends block");
        }
    } else {
        console.log("Failed to find profile block to remove! start=" + startRemove + " end=" + endRemove);
    }
}
