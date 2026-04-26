import React from 'react';
import { externalApi, getServerVpsBaseUrl } from '../../../services/externalApi';
import { NAME_REGEX } from '../constants';

interface UseGameManagerParams {
  user: any;
  cloudflareUrl: string;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPublishSuccess: () => void;
  triggerAuth: (callback: () => void) => void;
  // State setters
  setServerGames: (games: any[]) => void;
  setIsMyGamesListOpen: (open: boolean) => void;
  setUpdatingGameId: (id: string | null) => void;
  setGameName: (name: string) => void;
  setSelectedCategories: (cats: string[]) => void;
  setThumbnailPreview: (url: string | null) => void;
  setEditingGame: (game: any) => void;
  setEditGameName: (name: string) => void;
  setEditNameError: (err: string) => void;
  setEditCategories: (cats: string[]) => void;
  setViewingFeedbackGame: (game: any) => void;
  setFeedbacks: (feedbacks: any[]) => void;
  setIsLoadingFeedbacks: (loading: boolean) => void;
  setIsPublishing: (publishing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setPublishStatus: (status: string | null) => void;
  setPublishStatusType: (type: 'info' | 'success' | 'error') => void;
  setIsPreviewingOnServer: (previewing: boolean) => void;
  setServerPreviewUrl: (url: string | null) => void;
  setIsDownloadingDoc: (downloading: boolean) => void;
  setShowDocOptionsModal: (show: boolean) => void;
  // File processor helpers
  createZipBlob: (files: File[], baseDir: string) => Promise<Blob>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function useGameManager(params: UseGameManagerParams) {
  const {
    user, cloudflareUrl, showNotification, onPublishSuccess, triggerAuth,
    setServerGames, setIsMyGamesListOpen, setUpdatingGameId, setGameName,
    setSelectedCategories, setThumbnailPreview, setEditingGame, setEditGameName,
    setEditNameError, setEditCategories, setViewingFeedbackGame, setFeedbacks,
    setIsLoadingFeedbacks, setIsPublishing, setUploadProgress, setPublishStatus,
    setPublishStatusType, setIsPreviewingOnServer, setServerPreviewUrl,
    setIsDownloadingDoc, setShowDocOptionsModal,
    createZipBlob, fileInputRef,
  } = params;

  const processGames = (games: any[]) => {
    const baseUrl = cloudflareUrl.endsWith('/') ? cloudflareUrl.slice(0, -1) : cloudflareUrl;
    return games.map((g: any) => ({
      ...g,
      image: g.thumbnail_url || g.image,
      normalizedImage: (g.thumbnail_url || g.image)?.startsWith('http') || (g.thumbnail_url || g.image)?.startsWith('data:')
        ? (g.thumbnail_url || g.image)
        : `${baseUrl}${(g.thumbnail_url || g.image)?.startsWith('/') ? '' : '/'}${g.thumbnail_url || g.image}`
    }));
  };

  const fetchMyGames = () => {
    const identifier = user?.email || user?.uid;

    if (identifier) {
      externalApi.getUserGames(identifier).then(res => {
        if (res.success) {
          setServerGames(processGames(res.games || []));
        }
      }).catch(err => {
        console.error('Failed to load user games:', err);
      });
    } else {
      setServerGames([]);
    }
  };

  const handleDeleteMyGame = async (gameId: string | number) => {
    try {
      await externalApi.deleteGame(gameId);
      showNotification('Game deleted successfully!', 'success');
      fetchMyGames();
    } catch (err: any) {
      showNotification('Error deleting game: ' + err.message, 'error');
    }
  };

  const handleUpdateMyGame = (game: any) => {
    setUpdatingGameId(game.id);
    setGameName(game.name || game.title);

    // Pre-fill categories
    if (game.category) {
      const cats = game.category.split(',').map((c: string) => c.trim().toLowerCase());
      setSelectedCategories(cats);
    } else {
      setSelectedCategories([]);
    }

    // Pre-fill thumbnail preview
    if (game.normalizedImage) {
      setThumbnailPreview(game.normalizedImage);
    }

    setIsMyGamesListOpen(false);
    showNotification(`Đang chuẩn bị cập nhật: ${game.name || game.title}. Vui lòng chọn folder code mới.`, 'info');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleEditInfoClick = (game: any) => {
    setEditingGame(game);
    setEditGameName(game.name || game.title);
    setEditNameError('');
    setEditCategories(game.category ? game.category.split(',').map((c: string) => c.trim().toLowerCase()) : []);
  };

  const handleEditSubmit = async (e: React.FormEvent, editingGame: any, editGameName: string, editCategories: string[]) => {
    e.preventDefault();
    setEditNameError('');
    if (!editGameName) {
      setEditNameError('Tên game không được để trống.');
      return;
    }
    if (!NAME_REGEX.test(editGameName)) {
      setEditNameError('Tên game không được chứa ký tự đặc biệt.');
      return;
    }
    try {
      await externalApi.updateGameMetadata(editingGame.id, {
        title: editGameName,
        category: editCategories.join(',')
      });
      showNotification('Cập nhật thông tin thành công.', 'success');
      setEditingGame(null);
      fetchMyGames();
    } catch (err: any) {
      showNotification('Lỗi: ' + err.message, 'error');
    }
  };

  const handleViewFeedbackClick = async (game: any) => {
    setViewingFeedbackGame(game);
    setIsLoadingFeedbacks(true);
    setFeedbacks([]);
    try {
      const res = await externalApi.getGameReviews(game.id);
      setFeedbacks(res.reviews || []);
    } catch (err: any) {
      showNotification('Lỗi tải đánh giá: ' + err.message, 'error');
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const handleServerPreview = async (
    selectedFiles: File[] | null,
    gameBaseDir: string,
    inlinePreview: boolean = false
  ) => {
    if (!selectedFiles) return;

    const cfUrl = localStorage.getItem('cloudflareUrl') || (import.meta.env.VITE_EXTERNAL_API_URL as string) || '';
    if (!cfUrl) {
      showNotification('⚠️ Please configure Cloudflare Tunnel URL in Settings before previewing.', 'error');
      return;
    }

    setIsPreviewingOnServer(true);
    setServerPreviewUrl(null);
    try {
      const zipBlob = await createZipBlob(selectedFiles, gameBaseDir);

      const formData = new FormData();
      formData.append('gameZip', zipBlob, 'preview.zip');
      if (user?.email) formData.append('email', user.email);
      if (user?.uid) formData.append('userId', user.uid);

      const res = await externalApi.previewZip(formData);

      if (res.success && (res.previewUrl || res.id)) {
        const p_url = res.previewUrl || `/api/preview/${res.id}/`;
        const baseUrl = cfUrl.endsWith('/') ? cfUrl.slice(0, -1) : cfUrl;
        const fullUrl = `${baseUrl}${p_url}`;

        if (inlinePreview) {
          setServerPreviewUrl(fullUrl);
          showNotification('Server preview ready!', 'success');
        } else {
          window.open(fullUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('Server preview error:', err);
      showNotification('Error running server preview.', 'error');
    } finally {
      setIsPreviewingOnServer(false);
    }
  };

  const handlePublish = async (
    gameName: string,
    selectedFiles: File[] | null,
    gameBaseDir: string,
    selectedCategories: string[],
    gameThumbnail: File | null,
    updatingGameId: string | null
  ) => {
    if (!user) {
      showNotification('Dang nhap de publish game.', 'info');
      triggerAuth(() => {});
      return;
    }
    if (!gameName) {
      showNotification('Please enter game title.', 'error');
      return;
    }
    if (!NAME_REGEX.test(gameName)) {
      showNotification('Tên game không được chứa ký tự đặc biệt.', 'error');
      return;
    }
    if (selectedCategories.length === 0) {
      showNotification('Please select at least 1 category.', 'error');
      return;
    }

    setIsPublishing(true);
    setUploadProgress(0);
    setPublishStatusType('info');
    setPublishStatus('Compressing files...');

    try {
      const zipBlob = selectedFiles ? await createZipBlob(selectedFiles, gameBaseDir) : new Blob();

      const formData = new FormData();
      formData.append('gameZip', zipBlob, `${gameName}.zip`);
      formData.append('title', gameName);
      formData.append('category', selectedCategories.join(','));
      if (updatingGameId) formData.append('gameId', updatingGameId);

      if (user?.email) formData.append('email', user.email);
      if (user?.uid) formData.append('userId', user.uid);
      if (gameThumbnail) formData.append('thumbnail', gameThumbnail);

      setPublishStatus('Uploading to server...');
      await externalApi.uploadZip(formData, (percent) => {
        setUploadProgress(percent);
        setPublishStatus(`Uploading: ${percent}%`);
      });

      setPublishStatus('Published successfully!');
      setPublishStatusType('success');
      showNotification('Successfully published game to server!', 'success');
      onPublishSuccess();
      setUpdatingGameId(null);
      fetchMyGames();

      // Reset status after a delay
      setTimeout(() => setPublishStatus(null), 5000);
    } catch (error: any) {
      let msg = error instanceof Error ? error.message : 'Please check your server connection.';

      // Check if it's a duplicate game rejection (409)
      if (msg.includes('đã tồn tại') || msg.includes('đã có game')) {
        setPublishStatus('⚠️ Game đã tồn tại');
        setPublishStatusType('error');
        showNotification('⚠️ ' + msg, 'error');
      // Check if it's a security rejection (422)
      } else if (msg.includes('vi phạm bảo mật') || msg.includes('bảo mật')) {
        setPublishStatus('🛡️ Game rejected for security reasons');
        setPublishStatusType('error');
        showNotification('🛡️ ' + msg, 'error');
      } else {
        setPublishStatus('Error: ' + msg);
        setPublishStatusType('error');
        showNotification('Publish failed: ' + msg, 'error');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!user) {
      triggerAuth(() => setShowDocOptionsModal(true));
    } else {
      setShowDocOptionsModal(true);
    }
  };

  const handleDocDownloadConfirm = async (docGraphics: '2d' | '3d', docMode: 'offline' | 'multiplayer') => {
    setShowDocOptionsModal(false);
    setIsDownloadingDoc(true);
    try {
      const deviceId = externalApi.getDeviceId();
      const baseUrl = getServerVpsBaseUrl();
      const safeBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Chỉ check TURN config cho multiplayer
      if (docMode === 'multiplayer') {
        try {
          const configRes = await fetch(`${safeBaseUrl}/api/creator/turn-config?deviceId=${encodeURIComponent(deviceId)}`, {
            headers: { 'X-Device-Id': deviceId },
          });
          const configCheck = await configRes.json().catch(() => null);
          if (configCheck && !configCheck.hasConfig) {
            if (configCheck.hasCredentials) {
              showNotification('⏳ Đang khởi tạo cấu hình P2P, vui lòng đợi...', 'info');
            }
          }
        } catch (_) { /* bỏ qua */ }
      }

      const res = await fetch(`${safeBaseUrl}/api/creator/download-spec?graphics=${docGraphics}&mode=${docMode}`, {
        headers: { 'X-Device-Id': deviceId }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Không thể tải tài liệu' }));
        throw new Error(errData.error || 'Server error');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = `${docGraphics.toUpperCase()}-${docMode === 'multiplayer' ? 'Multi' : 'Offline'}`;
      a.download = `Alin.city-Game-${suffix}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showNotification(`✅ Tải Document ${suffix} thành công!`, 'success');
    } catch (err: any) {
      showNotification('❌ ' + err.message, 'error');
    } finally {
      setIsDownloadingDoc(false);
    }
  };

  return {
    fetchMyGames,
    handleDeleteMyGame,
    handleUpdateMyGame,
    handleEditInfoClick,
    handleEditSubmit,
    handleViewFeedbackClick,
    handleServerPreview,
    handlePublish,
    handleDownloadDoc,
    handleDocDownloadConfirm,
  };
}
