import React, { useState } from 'react';
import { ArrowLeft, Heart, Star, Trash2, MessageCircle, Bookmark, Navigation, Globe, Users, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { normalizeImageUrl } from '../../../../../services/externalApi';
import { resolveAvatarSrc } from '../../../../../utils/avatar';

interface PostDetailOverlayProps {
  post: any;
  isSelf: boolean;
  onClose: () => void;
  onAuthorClick: (author: any) => void;
  isDesktop: boolean;
  isSheetExpanded: boolean;
  panelWidth: number;
  externalApi: any;
  requireAuth: (actionLabel: string) => boolean;
  onStar?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onUpdatePrivacy?: (postId: string, privacy: string) => void;
  fetchUserPosts?: (uid: string) => void;
}

const normalizeAuthor = (author: any) => ({
  ...author,
  id: author?.id || author?.uid || author?.user_id || author?.author_id || null,
  displayName: author?.displayName || author?.name || author?.username || 'User',
  username: author?.username || author?.displayName || author?.name || 'User',
  avatar_url: author?.avatar_url || author?.photoURL || author?.avatarUrl || null,
  photoURL: author?.photoURL || author?.avatar_url || author?.avatarUrl || null,
  status: author?.status || '',
  province: author?.province || '',
  lat: author?.lat ?? null,
  lng: author?.lng ?? null,
  isSelf: author?.isSelf ?? false,
});

const PostDetailOverlay: React.FC<PostDetailOverlayProps> = ({
  post,
  isSelf,
  onClose,
  onAuthorClick,
  isDesktop,
  isSheetExpanded,
  panelWidth,
  externalApi,
  requireAuth,
  onStar,
  onDelete,
  onUpdatePrivacy,
}) => {
  const API_BASE = externalApi.getBaseUrl ? externalApi.getBaseUrl() : 'https://api.alin.city';
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [archived, setArchived] = useState(post.isArchived);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [newCmt, setNewCmt] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

  const stopOverlayEvent = (e: React.SyntheticEvent) => e.stopPropagation();

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const nativeEvent = e.nativeEvent as MouseEvent & { stopImmediatePropagation?: () => void };
    nativeEvent.stopImmediatePropagation?.();
    onClose();
  };

  const handleAuthorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const nativeEvent = e.nativeEvent as MouseEvent & { stopImmediatePropagation?: () => void };
    nativeEvent.stopImmediatePropagation?.();
    onAuthorClick(normalizeAuthor(post.author));
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requireAuth && !requireAuth('thich bai viet')) return;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      await fetch(`${API_BASE}/api/user/post/${post.id}/like`, { method: 'POST', headers: { 'X-Device-Id': externalApi.getDeviceId() } });
    } catch {
      setLiked(liked);
      setLikeCount(likeCount);
    }
  };

  const toggleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requireAuth && !requireAuth('luu bai viet')) return;
    setArchived(!archived);
    try {
      await fetch(`${API_BASE}/api/user/post/${post.id}/archive`, { method: 'POST', headers: { 'X-Device-Id': externalApi.getDeviceId() } });
    } catch {
      setArchived(archived);
    }
  };

  const fetchAllComments = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/user/post/${post.id}/comments`);
      const d = await r.json();
      if (d.success) setComments(d.comments);
    } catch {
      // noop
    }
  };

  const submitComment = async () => {
    if (!newCmt.trim()) return;
    if (requireAuth && !requireAuth('binh luan bai viet')) return;
    setIsCommentSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/api/user/post/${post.id}/comment`, {
        method: 'POST',
        headers: { 'X-Device-Id': externalApi.getDeviceId(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newCmt }),
      });
      const d = await r.json();
      if (d.success) {
        setComments([...comments, d.comment]);
        setCommentCount(commentCount + 1);
        setNewCmt('');
      }
    } catch {
      // noop
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handlePrivacyChange = (newPrivacy: string) => {
    onUpdatePrivacy?.(post.id, newPrivacy);
    setShowPrivacyPopup(false);
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'friends': return <Users className="w-3 h-3" />;
      case 'private': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case 'friends': return 'Bạn bè';
      case 'private': return 'Riêng tư';
      default: return 'Công khai';
    }
  };

  const useDesktopPanel = isDesktop && isSheetExpanded;

  if (post.isDeleted) {
    return (
      <div className="fixed inset-0 z-[400] flex flex-col bg-white animate-in fade-in duration-200" onPointerDown={stopOverlayEvent} onClick={stopOverlayEvent}>
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onPointerDown={stopOverlayEvent} onClick={handleCloseClick} className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-[15px] font-bold text-gray-900">Bài viết</h2>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="px-4 text-center">
            <p className="text-base font-bold text-red-500">Bài viết đã bị xóa bởi quản trị viên</p>
            <p className="mt-1 text-sm text-gray-400">Nội dung này không còn khả dụng</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`z-[400] flex flex-col bg-white animate-in fade-in duration-200 ${useDesktopPanel ? 'fixed top-0 bottom-0 rounded-l-[32px] shadow-[-4px_0_24px_rgba(0,0,0,0.05)] slide-in-from-left-2' : 'fixed inset-0 slide-in-from-bottom-2'}`}
      style={useDesktopPanel ? { left: 72, width: panelWidth } : undefined}
      onPointerDown={stopOverlayEvent}
      onClick={stopOverlayEvent}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onPointerDown={stopOverlayEvent} onClick={handleCloseClick} className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[15px] font-bold text-gray-900">Bài viết</h2>
        </div>
        {isSelf && !post.isArchivedState && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onStar?.(post.id); }} className={`rounded-xl p-2 transition-all active:scale-90 ${post.isStarred ? 'bg-amber-50 text-amber-500' : 'text-gray-300 hover:bg-amber-50 hover:text-amber-400'}`} title={post.isStarred ? 'Remove from Billboard' : 'Set as Billboard'}>
              <Star className={`w-4 h-4 ${post.isStarred ? 'fill-amber-400' : ''}`} />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete?.(post.id); }} className="rounded-xl p-2 text-gray-300 transition-all active:scale-90 hover:bg-red-50 hover:text-red-500" title="Delete post">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto subtle-scrollbar">
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onPointerDown={stopOverlayEvent}
            onClick={handleAuthorClick}
            className="w-full min-w-0 cursor-pointer rounded-xl p-2 -m-2 text-left transition-colors active:scale-[0.98] hover:bg-gray-50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={resolveAvatarSrc(post.author?.avatar || post.author?.avatar_url || post.author?.photoURL, post.author?.name || post.author?.username || 'User')}
                alt="author"
                loading="lazy"
                decoding="async"
                className="h-12 w-12 rounded-full bg-gray-100 object-cover shadow-sm"
              />
              <div className="flex min-w-0 flex-col">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 className="truncate text-[15px] font-bold text-gray-900">{post.author?.name || 'Unknown User'}</h3>
                  {post.isStarred && !post.isArchivedState && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-[11px] text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="relative" onPointerDown={stopOverlayEvent}>
                    <button
                      type="button"
                      onPointerDown={stopOverlayEvent}
                      onClick={(e) => { e.stopPropagation(); if (isSelf) setShowPrivacyPopup((v) => !v); }}
                      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isSelf ? 'cursor-pointer bg-gray-100 text-gray-500 hover:bg-gray-200' : 'text-gray-400'}`}
                    >
                      {getPrivacyIcon(post.privacy)}
                      {getPrivacyLabel(post.privacy)}
                    </button>

                    <AnimatePresence>
                      {showPrivacyPopup && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowPrivacyPopup(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            className="absolute left-0 top-full z-50 mt-1 flex w-[120px] flex-col gap-1 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
                          >
                            <button type="button" onClick={() => handlePrivacyChange('public')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold transition-all ${post.privacy === 'public' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                              <Globe className="h-3.5 w-3.5" /> Công khai
                            </button>
                            <button type="button" onClick={() => handlePrivacyChange('friends')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold transition-all ${post.privacy === 'friends' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                              <Users className="h-3.5 w-3.5" /> Bạn bè
                            </button>
                            <button type="button" onClick={() => handlePrivacyChange('private')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold transition-all ${post.privacy === 'private' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                              <Lock className="h-3.5 w-3.5" /> Riêng tư
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {post.title && <div className="px-4 pb-3 text-[15px] font-medium leading-relaxed text-gray-800">{post.title}</div>}

        {post.images?.length > 0 && (
          <div className="flex snap-x gap-1 overflow-x-auto px-1 pb-2 scrollbar-hide">
            {post.images.map((img: string, idx: number) => (
              <div key={idx} className={`snap-start shrink-0 overflow-hidden bg-gray-900 ${post.images.length === 1 ? 'w-full aspect-[4/5] rounded-lg' : 'w-[85%] aspect-[4/5] rounded-lg'}`}>
                <img src={normalizeImageUrl(img)} loading="lazy" decoding="async" className="h-full w-full object-cover" alt="Post" />
              </div>
            ))}
          </div>
        )}

        {(likeCount > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between px-4 py-2 text-[12px] text-gray-500">
            <span className="flex items-center gap-1"><Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} /> {likeCount}</span>
            <span>{commentCount} bình luận</span>
          </div>
        )}

        <div className="mx-3 flex items-center justify-between border-t border-gray-100 py-2">
          <button type="button" onClick={toggleLike} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold transition-colors active:scale-95 ${liked ? 'text-red-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} /> Thích {likeCount > 0 && <span>({likeCount})</span>}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowComments((v) => { if (!v) fetchAllComments(); return !v; }); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold text-gray-500 transition-colors active:scale-95 hover:bg-gray-50">
            <MessageCircle className="w-5 h-5" /> Bình luận {commentCount > 0 && <span>({commentCount})</span>}
          </button>
          <button type="button" onClick={toggleArchive} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold transition-colors active:scale-95 ${archived ? 'text-blue-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Bookmark className={`w-5 h-5 ${archived ? 'fill-blue-500' : ''}`} /> Lưu trữ
          </button>
        </div>

        {showComments && (
          <div className="bg-gray-50/50 px-4 py-4">
            <div className="mb-3 max-h-[350px] space-y-3 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="flex gap-2">
                    <img src={resolveAvatarSrc(c.author?.avatar || c.author?.avatar_url || c.author?.photoURL, c.author?.name || c.author?.username || 'User')} loading="lazy" decoding="async" alt="cmt-author" className="mt-0.5 h-7 w-7 rounded-full bg-gray-200 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2">
                        <p className="text-xs font-bold text-gray-900">{c.author?.name}</p>
                        <p className="break-words whitespace-pre-wrap text-sm text-gray-800">{c.content}</p>
                      </div>
                      <p className="mt-0.5 px-2 text-[9px] text-gray-400">{new Date(c.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={newCmt}
                onChange={(e) => setNewCmt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    submitComment();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Viết bình luận..."
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm transition-colors focus:border-blue-300 focus:outline-none"
                disabled={isCommentSubmitting}
              />
              <button type="button" onClick={(e) => { e.stopPropagation(); submitComment(); }} disabled={!newCmt.trim() || isCommentSubmitting} className={`flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-all active:scale-90 ${(!newCmt.trim() || isCommentSubmitting) ? 'opacity-50' : 'hover:bg-blue-500'}`}>
                <Navigation className="w-4 h-4 -ml-0.5 rotate-45" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PostDetailOverlay);
