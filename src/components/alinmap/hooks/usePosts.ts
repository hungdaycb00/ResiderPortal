import React, { useState, useEffect } from 'react';
import { getBaseUrl } from '../../../services/externalApi';

interface UsePostsParams {
  ws: React.MutableRefObject<WebSocket | null>;
  externalApi: any;
  myUserId: string | null;
  user: any;
  selectedUser: any;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  setGalleryActive: (v: boolean) => void;
  setGalleryTitle: (v: string) => void;
  setGalleryImages: (v: string[]) => void;
}

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const max = 1080;
        if (width > height && width > max) { height *= max / width; width = max; }
        else if (height > max) { width *= max / height; height = max; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }) : file);
        }, 'image/webp', 0.8);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export function usePosts({
  ws, externalApi, myUserId, user, selectedUser,
  showNotification, setGalleryActive, setGalleryTitle, setGalleryImages,
}: UsePostsParams) {
  const API_BASE = getBaseUrl();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  const fetchUserPosts = async (userId: string | null | undefined) => {
    if (!userId || (userId === 'saved' && !user)) return;
    try {
      const endpoint = userId === 'saved'
        ? `${API_BASE}/api/user/archived-posts`
        : `${API_BASE}/api/user/${userId}/posts`;
      const resp = await fetch(endpoint, { headers: { 'X-Device-Id': externalApi.getDeviceId() } });
      const data = await resp.json();
      if (data.success) {
        setUserPosts(data.posts);
        const starred = data.posts.find((p: any) => p.isStarred);
        if (starred) { setGalleryActive(true); setGalleryTitle(starred.title || ''); setGalleryImages(starred.images || []); }
        else { setGalleryActive(false); setGalleryTitle(''); setGalleryImages([]); }
      }
    } catch (err) { console.error('Fetch posts error:', err); }
  };

  const handleCreatePost = async (files: File[]) => {
    if (files.length === 0 && !postTitle.trim()) return;
    setIsSavingPost(true);
    try {
      const compressedFiles = files.length > 0 ? await Promise.all(files.map(f => compressImage(f))) : [];
      const validFiles = compressedFiles.filter(f => f.size <= 1024 * 1024);
      const formData = new FormData();
      validFiles.forEach(f => formData.append('images', f));
      formData.append('title', postTitle);
      const deviceId = externalApi.getDeviceId();
      const resp = await fetch(`${API_BASE}/api/user/post`, {
        method: 'POST', headers: { 'X-Device-Id': deviceId }, body: formData
      });
      const data = await resp.json();
      if (data.success) {
        setPostTitle('');
        setIsCreatingPost(false);
        fetchUserPosts(myUserId || user?.uid);
        ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' }));
        showNotification?.('Post created successfully!', 'success');
      } else { showNotification?.(data.error || 'Post creation failed', 'error'); }
    } catch (err) { console.error('Create post error:', err); }
    finally { setIsSavingPost(false); }
  };

  const handleStarPost = async (postId: string) => {
    const deviceId = externalApi.getDeviceId();
    try {
      const resp = await fetch(`${API_BASE}/api/user/post/${postId}/star`, { method: 'PUT', headers: { 'X-Device-Id': deviceId } });
      const data = await resp.json();
      if (data.success) { fetchUserPosts(myUserId || user?.uid); ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' })); }
    } catch (err) { console.error('Star post error:', err); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Xoá bài viết này?')) return;
    const deviceId = externalApi.getDeviceId();
    try {
      const resp = await fetch(`${API_BASE}/api/user/post/${postId}`, { method: 'DELETE', headers: { 'X-Device-Id': deviceId } });
      const data = await resp.json();
      if (data.success) { fetchUserPosts(myUserId || user?.uid); ws.current?.send(JSON.stringify({ type: 'UPDATE_GALLERY' })); }
    } catch (err) { console.error('Delete post error:', err); }
  };

  // Fetch user posts/games khi selectedUser thay đổi
  useEffect(() => {
    if (selectedUser) {
      setIsLoadingGames(true);
      setUserPosts([]);
      externalApi.getUserGames(selectedUser.id)
        .then((res: any) => { if (res.success) setUserGames(res.games); })
        .catch(console.error)
        .finally(() => setIsLoadingGames(false));
      const targetId = selectedUser.isSelf ? (myUserId || user?.uid) : selectedUser.id;
      fetchUserPosts(targetId);
    } else { setUserGames([]); }
  }, [selectedUser, externalApi]);

  return {
    userPosts, postTitle, setPostTitle,
    isCreatingPost, setIsCreatingPost,
    isSavingPost, userGames,
    handleCreatePost, fetchUserPosts,
    handleStarPost, handleDeletePost,
  };
}
