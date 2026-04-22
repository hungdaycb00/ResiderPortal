import os

file_path = r'e:\Resider\resider-portal\src\components\alinmap\BottomSheet.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports = """import DiscoverView from './views/DiscoverView';
import SocialView from './views/SocialView';
import NotificationsView from './views/NotificationsView';
import MyProfileView from './views/MyProfileView';
import SelectedUserView from './views/SelectedUserView';
"""
if 'DiscoverView' not in content:
    content = content.replace("import { motion } from 'framer-motion';", "import { motion } from 'framer-motion';\n" + imports)

# Remove PostCard Component
# PostCard starts at "const PostCard = ({ post" and ends before "const BottomSheet: React.FC<BottomSheetProps>"
import re
postcard_pattern = r'const PostCard = \(\{ post.*?^};'
content = re.sub(postcard_pattern, '', content, flags=re.MULTILINE | re.DOTALL)

# Replace the views block
start_marker = "                        {selectedUser ? ("
start_idx = content.find(start_marker)

if start_idx != -1:
    # Find matching closing bracket
    brace_count = 0
    end_idx = -1
    for i in range(start_idx + 24, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            if brace_count == 0:
                end_idx = i + 1 # include the closing brace
                break
            brace_count -= 1

    if end_idx != -1:
        # We need to find the trailing `)` after `}` if it's `{selectedUser ? (...) : (...)}`
        # But wait, the structure is `{selectedUser ? ( <SelectedUserView> ) : ( <div> ... </div> )}`
        # The start_marker is `{selectedUser ? (`. The matching closing for `{` is at the very end.
        
        # Let's write a brace matcher that matches the `{` before `selectedUser`
        start_brace_idx = content.rfind('{', 0, start_idx + 25)
        
        brace_count = 0
        end_idx = -1
        for i in range(start_brace_idx, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        if end_idx != -1:
            replacement = """{selectedUser ? (
                            <SelectedUserView
                                selectedUser={selectedUser} setSelectedUser={setSelectedUser} activeTab={activeTab as any} setActiveTab={setActiveTab as any}
                                fetchUserPosts={fetchUserPosts} sentFriendRequests={sentFriendRequests} friends={friends}
                                handleAddFriend={handleAddFriend} handleMessage={handleMessage} myObfPos={myObfPos}
                                panX={panX} panY={panY} scale={scale} isReporting={isReporting} setIsReporting={setIsReporting}
                                reportStatus={reportStatus} setReportStatus={setReportStatus} reportReason={reportReason}
                                setReportReason={setReportReason} ws={ws} games={games} userPosts={userPosts}
                                handleStarPost={handleStarPost} handleDeletePost={handleDeletePost} externalApi={externalApi}
                            />
                        ) : (
                            <div className="pt-2">
                                {mainTab === 'discover' && (
                                    <DiscoverView games={games} nearbyUsers={nearbyUsers} setSearchTag={setSearchTag} />
                                )}
                                {mainTab === 'friends' && (
                                    <SocialView
                                        myUserId={myUserId} friendIdInput={friendIdInput} setFriendIdInput={setFriendIdInput}
                                        ws={ws} setSentFriendRequests={setSentFriendRequests as any} socialSection={socialSection}
                                        setSocialSection={setSocialSection} friends={friends} nearbyUsers={nearbyUsers}
                                        setSelectedUser={setSelectedUser} setActiveTab={setActiveTab as any} onOpenChat={onOpenChat}
                                    />
                                )}
                                {mainTab === 'notifications' && (
                                    <NotificationsView notifications={notifications} externalApi={externalApi} fetchNotifications={fetchNotifications} />
                                )}
                                {mainTab === 'profile' && !selectedUser && (
                                    <MyProfileView
                                        myUserId={myUserId} myDisplayName={myDisplayName} myAvatarUrl={myAvatarUrl} myStatus={myStatus} currentProvince={currentProvince}
                                        activeTab={activeTab as any} setActiveTab={setActiveTab as any} galleryActive={galleryActive} isEditingName={isEditingName}
                                        setIsEditingName={setIsEditingName} nameInput={nameInput} setNameInput={setNameInput} setMyDisplayName={setMyDisplayName}
                                        isEditingStatus={isEditingStatus} setIsEditingStatus={setIsEditingStatus} statusInput={statusInput} setStatusInput={setStatusInput}
                                        setMyStatus={setMyStatus} radius={radius} handleUpdateRadius={handleUpdateRadius} isVisibleOnMap={isVisibleOnMap}
                                        setIsVisibleOnMap={setIsVisibleOnMap} games={games} userPosts={userPosts} isCreatingPost={isCreatingPost}
                                        setIsCreatingPost={setIsCreatingPost} postTitle={postTitle} setPostTitle={setPostTitle} isSavingPost={isSavingPost}
                                        ws={ws} myObfPos={myObfPos} user={user} showNotification={showNotification} setIsSheetExpanded={setIsSheetExpanded}
                                        setMainTab={setMainTab} handleCreatePost={handleCreatePost} handleStarPost={handleStarPost} handleDeletePost={handleDeletePost}
                                        fetchUserPosts={fetchUserPosts} externalApi={externalApi} showAvatarMenu={showAvatarMenu} setShowAvatarMenu={setShowAvatarMenu}
                                        avatarInputRef={avatarInputRef} handleAvatarUpload={handleAvatarUpload} handleDefaultAvatar={handleDefaultAvatar}
                                    />
                                )}
                            </div>
                        )}"""
            
            content = content[:start_brace_idx] + replacement + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully rewrote BottomSheet.tsx")
