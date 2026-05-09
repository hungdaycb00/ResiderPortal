import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { getBaseUrl } from '../../../../../services/externalApi';
import { compressImage, sortNewestFirst } from './postUtils';

interface UseProfilePostsParams {
  ws: React.MutableRefObject<WebSocket | null>;
  externalApi: any;
  myUserId: string | null;
  user: any;
  selectedUser: any;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  setGalleryActive: (v: boolean) => void;
  setGalleryTitle: (v: string) => void;
  setGalleryImages: (v: string[]) => void;
  onPostsChanged?: () => void;
}

export function useProfilePosts({
  ws,
  externalApi,
  myUserId,
  user,
  selectedUser,
  showNotification,
  setGalleryActive,
  setGalleryTitle,
  setGalleryImages,
  onPostsChanged,
}: UseProfilePostsParams) {
  const API_BASE = getBaseUrl();
  const resolvedMyUserId = myUserId || localStorage.getItem('alin_profile_user_id') || null;
  const selfPostsIdentifier = resolvedMyUserId || 'me';

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [postIsStarred, setPostIsStarred] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  const activeProfileRequestRef = useRef(0);
  const activePostsSourceRef = useRef<string | null>(selfPostsIdentifier);

  const sendGallerySync = () => {
    const socket = ws.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
    return true;
  };

  const syncGalleryFromPosts = (posts: any[]) => {
    const starred = posts.find((p: any) => p.isStarred);
    if (starred) {
      setGalleryActive(true);
      setGalleryTitle(starred.title || '');
      setGalleryImages(starred.images || []);
    } else {
      setGalleryActive(false);
      setGalleryTitle('');
      setGalleryImages([]);
    }
  };

  const starPostRequest = async (postId: string) => {
    const deviceId = externalApi.getDeviceId();
    const resp = await fetch(`${API_BASE}/api/user/post/${postId}/star`, {
      method: 'PUT',
      headers: { 'X-Device-Id': deviceId },
    });
    return resp.json();
  };

  const fetchUserPosts = async (userId: string | null | undefined, requestId?: number) => {
    if (!userId || (userId === 'saved' && !user)) return;
    activePostsSourceRef.current = userId;

    try {
      const endpoint = userId === 'saved'
        ? `${API_BASE}/api/user/archived-posts`
        : `${API_BASE}/api/user/${userId}/posts`;

      const resp = await fetch(endpoint, { headers: { 'X-Device-Id': externalApi.getDeviceId() } });
      const data = await resp.json();
      if (requestId != null && activeProfileRequestRef.current !== requestId) return;

      if (data.success) {
        const posts = sortNewestFirst(Array.isArray(data.posts) ? data.posts : []);
        setUserPosts(posts);
        if (userId !== 'saved') {
          syncGalleryFromPosts(posts);
        }
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
    }
  };

  const handleCreatePost = async (files: File[]) => {
    if (files.length === 0 && !postTitle.trim()) return;
    if (!user) {
      showNotification?.('Dang nhap de dang bai viet.', 'info');
      return;
    }

    setIsSavingPost(true);
    try {
      const compressedFiles = files.length > 0 ? await Promise.all(files.map((f) => compressImage(f))) : [];
      const validFiles = compressedFiles.filter((f) => f.size <= 1024 * 1024);
      const formData = new FormData();
      validFiles.forEach((f) => formData.append('images', f));
      formData.append('title', postTitle);
      formData.append('privacy', postPrivacy);
      formData.append('isStarred', postIsStarred ? 'true' : 'false');

      const deviceId = externalApi.getDeviceId();
      const resp = await fetch(`${API_BASE}/api/user/post`, {
        method: 'POST',
        headers: { 'X-Device-Id': deviceId },
        body: formData,
      });
      const data = await resp.json();

      if (data.success) {
        const createdPostId = data.post?.id || data.postId || data.id;
        if (postIsStarred && createdPostId && !data.post?.isStarred) {
          try {
            await starPostRequest(createdPostId);
          } catch (err) {
            console.error('Star new post error:', err);
          }
        }

        setPostTitle('');
        setPostPrivacy('public');
        setPostIsStarred(false);
        setIsCreatingPost(false);
        fetchUserPosts(activePostsSourceRef.current || selfPostsIdentifier);
        onPostsChanged?.();
        sendGallerySync();
        showNotification?.('Post created successfully!', 'success');
      } else {
        showNotification?.(data.error || 'Post creation failed', 'error');
      }
    } catch (err) {
      console.error('Create post error:', err);
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleUpdatePostPrivacy = async (postId: string, newPrivacy: string) => {
    if (!user) return;
    const deviceId = externalApi.getDeviceId();
    try {
      const resp = await fetch(`${API_BASE}/api/user/post/${postId}/privacy`, {
        method: 'PUT',
        headers: { 'X-Device-Id': deviceId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: newPrivacy }),
      });
      const data = await resp.json();
      if (data.success) {
        setUserPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, privacy: newPrivacy } : p)));
        onPostsChanged?.();
        showNotification?.('Đã cập nhật quyền riêng tư', 'success');
      }
    } catch (err) {
      console.error('Update privacy error:', err);
    }
  };

  const handleStarPost = async (postId: string) => {
    if (!user) {
      showNotification?.('Dang nhap de chon billboard.', 'info');
      return;
    }

    try {
      const data = await starPostRequest(postId);
      if (data.success) {
        setUserPosts((prev) => {
          const clickedPost = prev.find((p) => p.id === postId);
          const nextStarred = !clickedPost?.isStarred;
          const nextPosts = prev.map((p) => ({ ...p, isStarred: p.id === postId ? nextStarred : false }));
          syncGalleryFromPosts(nextPosts);
          return nextPosts;
        });
        fetchUserPosts(activePostsSourceRef.current || selfPostsIdentifier);
        onPostsChanged?.();
        sendGallerySync();
      }
    } catch (err) {
      console.error('Star post error:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      showNotification?.('Dang nhap de xoa bai viet.', 'info');
      return;
    }
    if (!confirm('Xoá bài viết này?')) return;

    const deviceId = externalApi.getDeviceId();
    try {
      const resp = await fetch(`${API_BASE}/api/user/post/${postId}`, {
        method: 'DELETE',
        headers: { 'X-Device-Id': deviceId },
      });
      const data = await resp.json();
      if (data.success) {
        fetchUserPosts(activePostsSourceRef.current || selfPostsIdentifier);
        onPostsChanged?.();
        sendGallerySync();
      }
    } catch (err) {
      console.error('Delete post error:', err);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      const requestId = Date.now();
      activeProfileRequestRef.current = requestId;
      setIsLoadingGames(true);
      setUserPosts([]);
      setUserGames([]);

      const selectedUserGamesId = selectedUser.isSelf ? (resolvedMyUserId || selectedUser.id || null) : selectedUser.id;
      if (selectedUserGamesId) {
        externalApi.getUserGames(selectedUserGamesId)
          .then((res: any) => {
            if (activeProfileRequestRef.current !== requestId) return;
            if (res.success) setUserGames(res.games || []);
          })
          .catch(console.error)
          .finally(() => {
            if (activeProfileRequestRef.current === requestId) setIsLoadingGames(false);
          });
      } else {
        setIsLoadingGames(false);
      }

      const targetId = selectedUser.isSelf ? (resolvedMyUserId || selectedUser.id || 'me') : selectedUser.id;
      fetchUserPosts(targetId, requestId);
    } else if (resolvedMyUserId || user) {
      const requestId = Date.now();
      activeProfileRequestRef.current = requestId;
      setIsLoadingGames(false);
      setUserGames([]);
      fetchUserPosts(selfPostsIdentifier, requestId);
    } else {
      activeProfileRequestRef.current = Date.now();
      setIsLoadingGames(false);
      setUserGames([]);
      setUserPosts([]);
      setGalleryActive(false);
      setGalleryTitle('');
      setGalleryImages([]);
    }
  }, [selectedUser, externalApi, resolvedMyUserId, selfPostsIdentifier, user, setGalleryActive, setGalleryTitle, setGalleryImages]);

  return {
    userPosts,
    postTitle,
    setPostTitle,
    postPrivacy,
    setPostPrivacy,
    postIsStarred,
    setPostIsStarred,
    isCreatingPost,
    setIsCreatingPost,
    isSavingPost,
    userGames,
    handleCreatePost,
    fetchUserPosts,
    handleStarPost,
    handleDeletePost,
    handleUpdatePostPrivacy,
  };
}
