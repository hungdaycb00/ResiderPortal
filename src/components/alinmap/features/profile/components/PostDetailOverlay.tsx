import React, { useState } from 'react';
import { ArrowLeft, Heart, Star, Trash2, MessageCircle, Bookmark, Navigation, Globe, Users, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { normalizeImageUrl } from '../../../../../services/externalApi';

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
  fetchUserPosts,
}) => {
  const API_BASE = externalApi.getBaseUrl ? externalApi.getBaseUrl() : 'https://api.alin.city';
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [archived, setArchived] = useState(post.isArchived);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [newCmt, setNewCmt] = useState('');
  const [loadingCmt, setLoadingCmt] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

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
    } catch {}
  };

  const submitComment = async () => {
    if (!newCmt.trim()) return;
    if (requireAuth && !requireAuth('binh luan bai viet')) return;
    setLoadingCmt(true);
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
    } catch {}
    finally { setLoadingCmt(false); }
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

  return (
    <div
      className={`z-[400] bg-white flex flex-col animate-in fade-in duration-200 ${
        useDesktopPanel
          ? 'fixed top-0 bottom-0 rounded-l-[32px] shadow-[-4px_0_24px_rgba(0,0,0,0.05)] slide-in-from-left-2'
          : 'fixed inset-0 slide-in-from-bottom-2'
      }`}
      style={useDesktopPanel ? { left: 72, width: panelWidth } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[15px] font-bold text-gray-900">Bài viết</h2>
        </div>
        {isSelf && !post.isArchivedState && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onStar?.(post.id); }}
              className={`p-2 rounded-xl transition-all active:scale-90 ${post.isStarred ? 'bg-amber-50 text-amber-500' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
              title={post.isStarred ? 'Remove from Billboard' : 'Set as Billboard'}
            >
              <Star className={`w-4 h-4 ${post.isStarred ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(post.id); }}
              className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
              title="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto subtle-scrollbar">
        {/* Author Section */}
        <div className="px-4 pt-4 pb-2">
          <div
            onClick={() => onAuthorClick(post.author)}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -m-2 transition-colors active:scale-[0.98]"
          >
            <img
              src={normalizeImageUrl(post.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=random`}
              alt="author"
              loading="lazy"
              decoding="async"
              className="w-12 h-12 rounded-full object-cover shadow-sm bg-gray-100"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-bold text-gray-900">{post.author?.name || 'Unknown User'}</h3>
                {post.isStarred && !post.isArchivedState && <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); isSelf && setShowPrivacyPopup(!showPrivacyPopup); }}
                    className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isSelf ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer' : 'text-gray-400'}`}
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
                          className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-[120px]"
                        >
                          <button
                            onClick={() => handlePrivacyChange('public')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${post.privacy === 'public' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            <Globe className="w-3.5 h-3.5" /> Công khai
                          </button>
                          <button
                            onClick={() => handlePrivacyChange('friends')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${post.privacy === 'friends' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            <Users className="w-3.5 h-3.5" /> Bạn bè
                          </button>
                          <button
                            onClick={() => handlePrivacyChange('private')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${post.privacy === 'private' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            <Lock className="w-3.5 h-3.5" /> Riêng tư
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Title */}
        {post.title && (
          <div className="px-4 pb-3 text-[15px] text-gray-800 font-medium leading-relaxed">{post.title}</div>
        )}

        {/* Images */}
        {post.images?.length > 0 && (
          <div className="flex overflow-x-auto gap-1 px-1 pb-2 scrollbar-hide snap-x">
            {post.images.map((img: string, idx: number) => (
              <div key={idx} className={`snap-start shrink-0 bg-gray-900 overflow-hidden ${post.images.length === 1 ? 'w-full aspect-[4/5]' : 'w-[85%] aspect-[4/5]'} rounded-lg`}>
                <img src={normalizeImageUrl(img)} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="Post" />
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {(likeCount > 0 || commentCount > 0) && (
          <div className="px-4 py-2 flex justify-between items-center text-[12px] text-gray-500">
            <span className="flex items-center gap-1"><Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} /> {likeCount}</span>
            <span>{commentCount} bình luận</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mx-3 py-2 flex items-center justify-between border-t border-gray-100">
          <button onClick={toggleLike} className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[12px] font-bold rounded-lg transition-colors active:scale-95 ${liked ? 'text-red-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} /> Thích {likeCount > 0 && <span>({likeCount})</span>}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); if (!showComments) fetchAllComments(); }} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[12px] font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors active:scale-95">
            <MessageCircle className="w-5 h-5" /> Bình luận {commentCount > 0 && <span>({commentCount})</span>}
          </button>
          <button onClick={toggleArchive} className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[12px] font-bold rounded-lg transition-colors active:scale-95 ${archived ? 'text-blue-500' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Bookmark className={`w-5 h-5 ${archived ? 'fill-blue-500' : ''}`} /> Lưu trữ
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="px-4 py-4 bg-gray-50/50">
            <div className="max-h-[350px] overflow-y-auto space-y-3 mb-3 pr-1">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="flex gap-2">
                    <img src={normalizeImageUrl(c.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author?.name || 'User')}&background=random`} loading="lazy" decoding="async" alt="cmt-author" className="w-7 h-7 rounded-full bg-gray-200 mt-0.5 object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm inline-block max-w-full">
                        <p className="text-xs font-bold text-gray-900">{c.author?.name}</p>
                        <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{c.content}</p>
                      </div>
                      <p className="text-[9px] text-gray-400 px-2 mt-0.5">{new Date(c.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 relative">
              <input type="text" value={newCmt} onChange={e => setNewCmt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }} placeholder="Viết bình luận..." className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-blue-300 transition-colors" disabled={loadingCmt} onClick={(e) => e.stopPropagation()} />
              <button onClick={(e) => { e.stopPropagation(); submitComment(); }} disabled={!newCmt.trim() || loadingCmt} className={`w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-all active:scale-90 ${(!newCmt.trim() || loadingCmt) ? 'opacity-50' : 'hover:bg-blue-500'}`}>
                <Navigation className="w-4 h-4 rotate-45 -ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PostDetailOverlay);
