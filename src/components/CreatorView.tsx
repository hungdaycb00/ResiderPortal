import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { Download, Play, X, Loader2, Send, Folder, Trash2, Edit, Monitor, Tablet, Smartphone, RotateCcw, Database, Image, Camera, Brain, Sword, Shield, Zap, Trophy, Users, Layout, Gamepad2, Book, Plus, Star, MessageSquare, Settings, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { externalApi } from '../services/externalApi';

export default function CreatorView({ 
  user, 
  showNotification, 
  onPublishSuccess, 
  onPlayGame, 
  cloudflareUrl, 
  triggerAuth,
  externalOpenList = false,
  onOpenListChange
}: { 
  user: any, 
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void, 
  onPublishSuccess: () => void, 
  onPlayGame: (game: any) => void, 
  cloudflareUrl: string, 
  triggerAuth: (callback: () => void) => void,
  externalOpenList?: boolean,
  onOpenListChange?: (open: boolean) => void
}) {
  const [localGameUrl, setLocalGameUrl] = useState<string | null>(null);
  const [serverPreviewUrl, setServerPreviewUrl] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [gameBaseDir, setGameBaseDir] = useState<string>('');
  const [gameName, setGameName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewingOnServer, setIsPreviewingOnServer] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [serverGames, setServerGames] = useState<any[]>([]);
  const [isMyGamesListOpen, setIsMyGamesListOpen] = useState(false);
  
  // Sync external open request
  useEffect(() => {
    if (externalOpenList) {
      setIsMyGamesListOpen(true);
      fetchMyGames();
    }
  }, [externalOpenList]);

  // Sync back to external if list is closed internally
  useEffect(() => {
    if (!isMyGamesListOpen && onOpenListChange) {
      onOpenListChange(false);
    }
  }, [isMyGamesListOpen]);
  const [deviceType, setDeviceType] = useState<'pc' | 'tablet' | 'mobile'>('pc');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishStatusType, setPublishStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [gameThumbnail, setGameThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);
  
  // Vite Build Guard State
  const [showOutdatedModal, setShowOutdatedModal] = useState(false);
  const [outdatedDetails, setOutdatedDetails] = useState<{ sourceTime: string, buildTime: string } | null>(null);

  // Modals for enhancement
  const [editingGame, setEditingGame] = useState<any>(null);
  const [editGameName, setEditGameName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [updatingGameId, setUpdatingGameId] = useState<string | null>(null);
  
  const [viewingFeedbackGame, setViewingFeedbackGame] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  // Category Selection State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  
  const [showPasteCodeModal, setShowPasteCodeModal] = useState(false);
  const [pastedCode, setPastedCode] = useState('');

  // Document Options Modal State
  const [showDocOptionsModal, setShowDocOptionsModal] = useState(false);
  const [docGraphics, setDocGraphics] = useState<'2d' | '3d'>('2d');
  const [docMode, setDocMode] = useState<'offline' | 'multiplayer'>('offline');
  
  const handlePasteCodeSubmit = () => {
    if (!pastedCode.trim()) {
      showNotification('Vui lòng dán mã HTML vào.', 'error');
      return;
    }
    try {
      const file = new File([pastedCode], 'index.html', { type: 'text/html' });
      Object.defineProperty(file, 'webkitRelativePath', { value: 'game/index.html' });
      setServerPreviewUrl(null);
      setLocalGameUrl(null);
      setGameBaseDir('game/');
      if (!gameName) setGameName('Single File Game');
      setSelectedFiles([file]);
      setShowPasteCodeModal(false);
      setPastedCode('');
    } catch (e: any) {
      showNotification('Lỗi khi tạo file: ' + e.message, 'error');
    }
  };
  
  const AVAILABLE_CATEGORIES = [
    { id: 'puzzle', name: 'Puzzle', icon: <Brain className="w-3 h-3" /> },
    { id: 'action', name: 'Action', icon: <Sword className="w-3 h-3" /> },
    { id: 'strategy', name: 'Strategy', icon: <Shield className="w-3 h-3" /> },
    { id: 'racing', name: 'Racing', icon: <Zap className="w-3 h-3" /> },
    { id: 'rpg', name: 'RPG', icon: <Trophy className="w-3 h-3" /> },
    { id: 'multiplayer', name: 'Multiplayer', icon: <Users className="w-3 h-3" /> },
    { id: 'simulation', name: 'Simulation', icon: <Layout className="w-3 h-3" /> },
    { id: 'arcade', name: 'Arcade', icon: <Gamepad2 className="w-3 h-3" /> },
    { id: 'sports', name: 'Sports', icon: <Zap className="w-3 h-3" /> },
    { id: 'education', name: 'Education', icon: <Book className="w-3 h-3" /> },
    { id: 'adventure', name: 'Adventure', icon: <Sword className="w-3 h-3" /> },
  ];

  // Automatically trigger preview when new files are selected
  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0 && !isPreviewingOnServer && !serverPreviewUrl) {
      handleServerPreview(true);
    }
  }, [selectedFiles]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      let targetW = 1920;
      let targetH = 1080;
      if (deviceType === 'tablet') {
        targetW = orientation === 'landscape' ? 1024 : 768;
        targetH = orientation === 'landscape' ? 768 : 1024;
      } else if (deviceType === 'mobile') {
        targetW = orientation === 'landscape' ? 844 : 390;
        targetH = orientation === 'landscape' ? 390 : 844;
      }

      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      const paddingX = deviceType === 'pc' ? 0 : 48; 
      const paddingY = deviceType === 'pc' ? 0 : 48;
      
      const scaleX = (clientWidth - paddingX) / targetW;
      const scaleY = (clientHeight - paddingY) / targetH;
      
      let newScale = Math.min(scaleX, scaleY);
      if (newScale > 1) newScale = 1;
      
      setScale(newScale);
    };

    const resizeObserver = new ResizeObserver(() => updateScale());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [deviceType, orientation, serverPreviewUrl, localGameUrl]);

  const fetchMyGames = () => {
    const identifier = user?.email || user?.uid;
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

    if (identifier) {
      externalApi.getUserGames(identifier).then(res => {
        if (res.success) {
          setServerGames(processGames(res.games || []));
        }
      }).catch(err => {
        console.error('Failed to load user games:', err);
      });
    } else {
      externalApi.listServer().then(res => {
        if (res.success) {
          const myDeviceId = externalApi.getDeviceId();
          const myGames = res.games.filter((g: any) => g.deviceId === myDeviceId);
          setServerGames(processGames(myGames));
        }
      }).catch(err => {
        console.error('Failed to load server games:', err);
      });
    }
  };

  useEffect(() => {
    fetchMyGames();
  }, []);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGameThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setServerPreviewUrl(null);
    setLocalGameUrl(null);
    // Only reset update state if we manually click folder select (not triggered by handleUpdateMyGame)
    // Actually, folder select usually means starting fresh OR updating a specific game.
    // If updatingGameId is null, it's a new game.

    const allFiles = Array.from(files) as File[];

    // Normalize path separators for cross-platform compatibility (Windows uses \, Unix uses /)
    const normalizePath = (path: string) => path.replace(/\\/g, '/');

    if (allFiles.length > 0 && allFiles[0].webkitRelativePath) {
      const normalizedPath = normalizePath(allFiles[0].webkitRelativePath);
      const rootFolderName = normalizedPath.split('/')[0];
      if (rootFolderName) {
        setGameName(rootFolderName);
      }
    }

    // Find all index.html files, excluding node_modules (cross-platform compatible)
    const indexFiles = allFiles.filter(file => {
      const normalizedPath = normalizePath(file.webkitRelativePath);
      return (normalizedPath.endsWith('index.html') || normalizedPath.endsWith('index.html')) &&
        (!file.webkitRelativePath.includes('node_modules'));
    });

    if (indexFiles.length > 0) {
      // Priority patterns for finding the best index.html (cross-platform compatible)
      const priorities = [
        /\/(web\/dist)\/index\.html$/,
        /\/(dist)\/index\.html$/,
        /\/(build)\/index\.html$/,
        /\/(web)\/index\.html$/
      ];

      let bestIndexFile;
      for (const p of priorities) {
        bestIndexFile = indexFiles.find(f => {
          const normalizedPath = normalizePath(f.webkitRelativePath);
          return normalizedPath.match(p);
        });
        if (bestIndexFile) break;
      }

      // Fallback: use shortest path (closest to root)
      if (!bestIndexFile) {
        bestIndexFile = indexFiles.reduce((prev, curr) => {
          const prevLen = normalizePath(prev.webkitRelativePath).length;
          const currLen = normalizePath(curr.webkitRelativePath).length;
          return prevLen < currLen ? prev : curr;
        });
      }

      // Extract base directory (cross-platform compatible)
      const normalizedBestPath = normalizePath(bestIndexFile.webkitRelativePath);
      const baseDir = normalizedBestPath.substring(0, normalizedBestPath.lastIndexOf('/') + 1);
      setGameBaseDir(baseDir);

      // Filter files to only include those in the base directory
      const filteredFiles = allFiles.filter(f => {
        const normalizedPath = normalizePath(f.webkitRelativePath);
        return normalizedPath.startsWith(baseDir) &&
          !f.webkitRelativePath.includes('node_modules') &&
          !f.webkitRelativePath.includes('.git');
      });

      setSelectedFiles(filteredFiles);

      // VITE BUILD GUARD: Check if source files are newer than build files
      const isViteProject = allFiles.some(f =>
        f.name === 'vite.config.ts' ||
        f.name === 'vite.config.js' ||
        (f.name === 'package.json' && f.webkitRelativePath.includes('node_modules') === false)
      );

      if (isViteProject) {
        const buildFolderPatterns = ['/dist/', '/build/', '/web/dist/'];
        const buildFiles = filteredFiles.filter(f => {
          const normalizedPath = normalizePath(f.webkitRelativePath);
          return buildFolderPatterns.some(pattern => normalizedPath.includes(pattern));
        });
        const sourceFiles = filteredFiles.filter(f => {
          const normalizedPath = normalizePath(f.webkitRelativePath);
          return !buildFolderPatterns.some(pattern => normalizedPath.includes(pattern)) &&
            !f.webkitRelativePath.includes('node_modules') &&
            !f.webkitRelativePath.includes('.git');
        });

        if (buildFiles.length > 0 && sourceFiles.length > 0) {
          const maxSourceMod = Math.max(...sourceFiles.map(f => f.lastModified));
          const minBuildMod = Math.min(...buildFiles.map(f => f.lastModified));

          if (maxSourceMod > minBuildMod) {
            setOutdatedDetails({
              sourceTime: new Date(maxSourceMod).toLocaleString(),
              buildTime: new Date(minBuildMod).toLocaleString()
            });
            setShowOutdatedModal(true);
          }
        }
      }

      // Analyze index.html content
      try {
        const htmlContent = await bestIndexFile.text();
        const hasModuleScript = htmlContent.includes('type="module"');
        const hasServiceWorker = htmlContent.includes('serviceWorker') || htmlContent.includes('sw.js');

        console.log('Project analysis:', {
          hasModuleScript,
          hasServiceWorker,
          fileName: bestIndexFile.webkitRelativePath
        });
      } catch (err) {
        console.error('Error processing offline files:', err);
        showNotification('An error occurred during game folder preprocessing.', 'error');
      }
    } else {
      showNotification('index.html not found in selected folder.', 'error');
    }
  };

  // Utility to process index.html for Vite builds (convert absolute assets to relative)
  const processIndexHtml = async (file: File): Promise<string> => {
    let content = await file.text();
    const isViteBuild = content.includes('type="module"') && (content.includes('/assets/') || content.includes('src="/'));
    
    // 1. Vite-specific path fixes
    if (isViteBuild) {
      // Inject <base href="."> if not present
      if (!content.includes('<base')) {
        content = content.replace('<head>', '<head><base href=".">');
      }
      
      // Convert absolute /assets/ to relative ./assets/
      content = content.replace(/(href|src)=["']\/assets\//g, '$1="./assets/');

      // Convert other absolute src/href to relative (for Vite builds)
      content = content.replace(/(href|src)=["']\/(index|main|style|src)/g, '$1="./$2');

      // Remove Vite dev scripts aggressively (only on Portal)
      content = content.replace(/<script[^>]*src=["'][^"']*(?:@vite\/client|vite\.js|hmr|:24678)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '<!-- Vite Scrubbed (External) -->');
      content = content.replace(/<script[^>]*>[\s\S]*?(?:__vite_plugin_react_preamble_installed__|@react-refresh|RefreshRuntime|:24678)[\s\S]*?<\/script>/gi, '<!-- Vite Scrubbed (Inline) -->');
    }

    // 2. Global Resider Injections (Always apply when on Portal)
    if (!content.includes('window.__RESIDER_FREE_ZONE__')) {
      const tunnelConfig = `<script id="resider-tunnel-config">window.__RESIDER_TUNNEL_URL__ = "${cloudflareUrl}";</script>`;
      const residerFix = `
<script>
  window.__RESIDER_FREE_ZONE__ = true;
  
  // A. Storage Mock: Handle Tracking Prevention blocking localStorage
  (function() {
    try {
      localStorage.getItem('test');
    } catch (e) {
      console.warn('[Resider Fix] LocalStorage is blocked by browser tracking prevention. Injecting Memory Storage...');
      const store = {};
      const mockStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => store[k] = v.toString(),
        removeItem: (k) => delete store[k],
        clear: () => { for (let k in store) delete store[k]; },
        key: (i) => Object.keys(store)[i] || null,
        get length() { return Object.keys(store).length; }
      };
      Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
    }
  })();

  // B. WebSocket Mock: Suppress Vite HMR errors (only on Portal)
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (url && url.includes(':24678')) {
      console.warn('[Resider Fix] Suppressing HMR WebSocket for built game.');
      return { 
        send: () => {}, close: () => {}, addEventListener: () => {}, removeEventListener: () => {},
        binaryType: 'blob', url: url, readyState: 0, onopen: null, onmessage: null, onclose: null, onerror: null
      };
    }
    return new originalWebSocket(url, protocols);
  };
</script>`;

      const combinedInjections = `\n    ${tunnelConfig}${residerFix}`;
      const headMatch = content.match(/<head[^>]*>/i);
      if (headMatch) {
        content = content.replace(headMatch[0], headMatch[0] + combinedInjections);
      } else {
        content = combinedInjections + content;
      }
    }

    return content;
  };

  const handleServerPreview = async (inlinePreview: boolean = false) => {
    if (selectedFiles) {
      const cloudflareUrl = localStorage.getItem('cloudflareUrl') || (import.meta.env.VITE_EXTERNAL_API_URL as string) || '';

      if (!cloudflareUrl) {
        showNotification('⚠️ Please configure Cloudflare Tunnel URL in Settings before previewing.', 'error');
        return;
      }

      setIsPreviewingOnServer(true);
      setServerPreviewUrl(null);
      try {
        const zip = new JSZip();
        // Normalize path for cross-platform compatibility
        const normalizePath = (path: string) => path.replace(/\\/g, '/');

        for (const file of selectedFiles) {
          const normalizedPath = normalizePath(file.webkitRelativePath);
          let path = normalizedPath.substring(gameBaseDir.length);
          if (!path) continue;

          if (file.name === 'index.html') {
            const processedContent = await processIndexHtml(file);
            zip.file(path, processedContent);
          } else {
            zip.file(path, file);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        const formData = new FormData();
        formData.append('gameZip', zipBlob, 'preview.zip');

        if (user?.email) formData.append('email', user.email);
        if (user?.uid) formData.append('userId', user.uid);

        const res = await externalApi.previewZip(formData);

        if (res.success && (res.previewUrl || res.id)) {
          const p_url = res.previewUrl || `/api/preview/${res.id}/`;
          const baseUrl = cloudflareUrl.endsWith('/') ? cloudflareUrl.slice(0, -1) : cloudflareUrl;
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
    }
  };

  const handlePublish = async () => {
    if (!gameName) {
      showNotification('Please enter game title.', 'error');
      return;
    }
    const nameRegex = /^[a-zA-Z0-9\sàáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹÀÁÃẠẢĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỂỄỆĐÌÍĨỈỊÒÓÕỌỎÔỐỒỔỖỘƠỚỜỞỠỢÙÚŨỤỦƯỨỪỬỮỰỲÝỴỶỸ]+$/;
    if (!nameRegex.test(gameName)) {
      showNotification('Tên game không được chứa ký tự đặc biệt.', 'error');
      return;
    }
    if (!gameThumbnail && !updatingGameId) {
      showNotification('Please select background image.', 'error');
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
      const zip = new JSZip();
      // Normalize path for cross-platform compatibility
      const normalizePath = (path: string) => path.replace(/\\/g, '/');
      
      if (selectedFiles) {
        for (const file of selectedFiles) {
          const normalizedPath = normalizePath(file.webkitRelativePath);
          const path = normalizedPath.substring(gameBaseDir.length);
          if (path) {
            if (file.name === 'index.html') {
              const processedContent = await processIndexHtml(file);
              zip.file(path, processedContent);
            } else {
              zip.file(path, file);
            }
          }
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditNameError('');
    if (!editGameName) {
      setEditNameError('Tên game không được để trống.');
      return;
    }
    const nameRegex = /^[a-zA-Z0-9\sàáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹÀÁÃẠẢĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỂỄỆĐÌÍĨỈỊÒÓÕỌỎÔỐỒỔỖỘƠỚỜỞỠỢÙÚŨỤỦƯỨỪỬỮỰỲÝỴỶỸ]+$/;
    if (!nameRegex.test(editGameName)) {
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
      fetchMyGames(); // Refresh the list
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

  const handleDownloadDoc = () => {
    if (!user) {
      triggerAuth(() => setShowDocOptionsModal(true));
    } else {
      setShowDocOptionsModal(true);
    }
  };

  const handleDocDownloadConfirm = async () => {
    setShowDocOptionsModal(false);
    setIsDownloadingDoc(true);
    try {
      const deviceId = externalApi.getDeviceId();
      const baseUrl = localStorage.getItem('cloudflareUrl') || import.meta.env.VITE_EXTERNAL_API_URL || 'http://localhost:3000';
      const safeBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // Chỉ check TURN config cho multiplayer
      if (docMode === 'multiplayer') {
        try {
          const configCheck = await externalApi.request<any>('/api/creator/turn-config', { method: 'GET' });
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
      a.download = `Resider-Game-${suffix}.txt`;
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

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 p-4 flex flex-col gap-4 bg-[#1a1d24] overflow-y-auto custom-scrollbar">
            
            <button 
              onClick={handleDownloadDoc}
              disabled={isDownloadingDoc}
              className={`flex items-center justify-between p-3 border rounded-xl transition-all group w-full ${
                isDownloadingDoc 
                  ? 'bg-blue-600/10 border-blue-500/20 cursor-wait' 
                  : 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  {isDownloadingDoc ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                </div>
                <div className="text-left py-0.5">
                  <div className="text-xs font-bold text-blue-100 leading-none mb-1">
                    {isDownloadingDoc ? 'Initializing Config...' : 'Game Boilerplate'}
                  </div>
                  <div className="text-[9px] text-blue-400/80 leading-none">
                    {isDownloadingDoc ? 'Please wait a moment' : 'Auto-injects P2P Turn Config'}
                  </div>
                </div>
              </div>
            </button>

            <div className="h-px w-full bg-gray-800/50 mb-1 mt-1" />

            <div className="grid grid-cols-2 gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFolderSelect}
                style={{ display: 'none' }}
                // @ts-ignore
                webkitdirectory="" 
                directory=""
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 p-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl transition-all group text-left h-full"
              >
                <Folder className="w-5 h-5 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="overflow-hidden">
                  <div className="text-[12px] font-bold text-purple-100 whitespace-nowrap overflow-hidden text-ellipsis">Select Folder</div>
                  <div className="text-[9px] text-purple-400/70 whitespace-nowrap overflow-hidden text-ellipsis">{selectedFiles ? `${selectedFiles.length} files` : 'Web folder'}</div>
                </div>
              </button>

              <button 
                onClick={() => setShowPasteCodeModal(true)}
                className="flex items-center gap-2 p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all group text-left h-full"
              >
                <FileCode className="w-5 h-5 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="overflow-hidden">
                  <div className="text-[12px] font-bold text-blue-100 whitespace-nowrap overflow-hidden text-ellipsis">Paste Code</div>
                  <div className="text-[9px] text-blue-400/70 whitespace-nowrap overflow-hidden text-ellipsis">Single HTML</div>
                </div>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Game Title</label>
                {!gameName && (
                  <span className="text-[9px] font-bold text-red-500 animate-pulse">* Required</span>
                )}
              </div>
              <input
                type="text"
                placeholder="Example: My Cool Game"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className={`w-full bg-[#1a1d24] border ${!gameName ? 'border-red-500/50' : 'border-gray-700'} rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all`}
              />
            </div>

            {/* Category Selection */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Category (Max 3)</label>
                  <button 
                    type="button"
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className={`flex items-center justify-center p-1 rounded-full transition-all ${isCategoriesExpanded ? 'bg-purple-600 text-white rotate-45' : 'bg-[#252830] text-gray-400 hover:text-white'}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {selectedCategories.length === 0 ? (
                  <span className="text-[9px] font-bold text-red-500 animate-pulse">* Required</span>
                ) : (
                  <span className="text-[9px] font-bold text-blue-500">{selectedCategories.length}/3</span>
                )}
              </div>
              
              <AnimatePresence>
                {isCategoriesExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 p-3 bg-[#1a1d24] border border-gray-700 rounded-xl">
                      {AVAILABLE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            if (selectedCategories.includes(cat.id)) {
                              setSelectedCategories(selectedCategories.filter(c => c !== cat.id));
                            } else if (selectedCategories.length < 3) {
                              setSelectedCategories([...selectedCategories, cat.id]);
                            } else {
                              showNotification('Only max 3 categories allowed.', 'info');
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                            selectedCategories.includes(cat.id)
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                              : 'bg-[#252830] border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {cat.icon}
                          {cat.name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show selected categories review even when collapsed */}
              {!isCategoriesExpanded && selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {selectedCategories.map(catId => {
                    const cat = AVAILABLE_CATEGORIES.find(c => c.id === catId);
                    return (
                      <span key={catId} className="text-[9px] font-bold px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md">
                        {cat?.name.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Thumbnail Selection */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Game Thumbnail</label>
                {!gameThumbnail && (
                  <span className="text-[9px] font-bold text-red-500 animate-pulse">* Required</span>
                )}
              </div>
              <input 
                type="file" 
                ref={thumbnailInputRef}
                onChange={handleThumbnailSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div 
                onClick={() => thumbnailInputRef.current?.click()}
                className="relative aspect-[16/9] w-full rounded-xl border border-gray-700 bg-gray-900/50 overflow-hidden cursor-pointer group hover:border-purple-500/50 transition-all"
              >
                {thumbnailPreview ? (
                  <>
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                      <Camera className="w-6 h-6 text-white shadow-lg" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 group-hover:text-gray-400 transition-colors">
                    <Image className="w-8 h-8" />
                    <span className="text-[10px] font-bold">Select background</span>
                  </div>
                )}
              </div>
              {thumbnailPreview && (
                <button 
                  onClick={() => {
                    setGameThumbnail(null);
                    setThumbnailPreview(null);
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors self-end"
                >
                  Delete image
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleServerPreview}
                disabled={isPreviewingOnServer || !selectedFiles}
                className="flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Xem trước"
              >
                {isPreviewingOnServer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-blue-400" />}
                <span className="text-xs font-bold">Preview</span>
              </button>

              <button 
                onClick={handlePublish}
                disabled={isPublishing || !gameName || !selectedFiles}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all relative overflow-hidden ${
                  isPublishing || !gameName || !selectedFiles
                    ? 'bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed' 
                    : 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/30'
                }`}
              >
                {isPublishing ? <Loader2 className="w-4 h-4 text-green-400 animate-spin" /> : <Send className="w-4 h-4 text-green-400" />}
                <span className="text-xs font-bold">Publish</span>
                {isPublishing && uploadProgress > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
              </button>
            </div>

            <AnimatePresence>
              {publishStatus && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`text-[10px] font-bold px-3 py-2 rounded-xl text-center border ${
                    publishStatusType === 'success' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 
                    publishStatusType === 'error' ? 'text-red-400 bg-red-400/5 border-red-500/20' : 
                    'text-blue-400 bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  {publishStatus}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto pt-4">
              <button 
                onClick={() => {
                  fetchMyGames();
                  setIsMyGamesListOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all group shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10"
              >
                <Database className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-blue-100">Manage Uploaded Games</span>
              </button>
            </div>
          </div>

          {/* Preview Area Container */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden">
            {/* Toolbar for Status & Controls */}
            <div className="h-14 border-b border-white/5 bg-[#1a1d24] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-white/70">
                <div className={`w-1.5 h-1.5 rounded-full ${serverPreviewUrl ? 'bg-blue-500' : localGameUrl ? 'bg-green-500' : 'bg-gray-500'}`} />
                {serverPreviewUrl ? 'Server Preview Active' : localGameUrl ? 'Local Preview Active' : 'Waiting for Folder...'}
              </div>

              {/* Device Controls */}
              {(localGameUrl || serverPreviewUrl) && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full border border-white/10">
                  <button 
                    onClick={() => setDeviceType('pc')}
                    className={`p-1.5 rounded-lg transition-colors ${deviceType === 'pc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="PC (1920x1080)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setDeviceType('tablet')}
                    className={`p-1.5 rounded-lg transition-colors ${deviceType === 'tablet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Tablet (1024x768)"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setDeviceType('mobile')}
                    className={`p-1.5 rounded-lg transition-colors ${deviceType === 'mobile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Mobile (390x844)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="w-px h-4 bg-white/10 mx-0.5" />
                  
                  <button 
                    onClick={() => setOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
                    disabled={deviceType === 'pc'}
                    className={`p-1.5 rounded-lg transition-colors ${deviceType === 'pc' ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Rotate screen"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-300 ${orientation === 'portrait' ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Scale Container */}
            <div ref={containerRef} className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">

            {localGameUrl || serverPreviewUrl ? (
              <div 
                className="transition-all duration-500 ease-in-out flex items-center justify-center relative"
                style={{
                  width: deviceType === 'pc' ? '1920px' : (deviceType === 'tablet' ? (orientation === 'landscape' ? '1024px' : '768px') : (orientation === 'landscape' ? '844px' : '390px')),
                  height: deviceType === 'pc' ? '1080px' : (deviceType === 'tablet' ? (orientation === 'landscape' ? '768px' : '1024px') : (orientation === 'landscape' ? '390px' : '844px')),
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  border: deviceType === 'pc' ? 'none' : '12px solid #1f2937',
                  borderRadius: deviceType === 'pc' ? '0' : '24px',
                  boxShadow: deviceType === 'pc' ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  backgroundColor: '#000'
                }}
              >
                {isPreviewingOnServer && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-400 text-sm">Loading game from server...</p>
                    <p className="text-gray-500 text-xs mt-2">Please wait a moment...</p>
                  </div>
                )}
                <iframe 
                  src={serverPreviewUrl || (localGameUrl === 'server-preview' ? undefined : localGameUrl) || undefined} 
                  className="w-full h-full border-none bg-black" 
                  title="Local Game Preview"
                  sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                  allow="accelerometer; gyroscope; magnetometer; gamepad; microphone; camera; midi; display-capture; autoplay; clipboard-write; web-share"
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    setTimeout(() => {
                      try {
                        const iframeDoc = iframe.contentDocument;
                        if (iframeDoc) {
                          const title = iframeDoc.title;
                          const bodyText = iframeDoc.body?.innerText?.toLowerCase() || '';
                          
                          if (title.includes('Resider') || title.includes('Home') || 
                              bodyText.includes('không tìm thấy') || bodyText.includes('404') ||
                              bodyText.includes('error') || bodyText.includes('not found')) {
                            showNotification('Error: Server returned an error page instead of the game. Check console.', 'error');
                          }
                        }
                      } catch (err) {
                        // Cross-origin restriction
                      }
                    }, 500);
                    
                    setIsPreviewingOnServer(false);
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-3xl bg-gray-900 flex items-center justify-center mb-6 border border-gray-800">
                  <Folder className="w-10 h-10 text-gray-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">No folder selected</h3>
                <p className="text-sm text-gray-600 max-w-xs">
                  Use the <b>Select Folder</b> button to upload your web game (must have index.html).
                </p>
              </div>
            )}

          </div>

          {/* My Games List Modal */}
          <AnimatePresence>
            {isMyGamesListOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8"
                onClick={() => setIsMyGamesListOpen(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="w-full max-w-6xl h-full max-h-[90vh] bg-[#1a1d24] border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 flex items-center justify-between bg-[#1a1d24] border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600/20 rounded-xl">
                        <Database className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">My Games List</h3>
                        <p className="text-xs text-gray-500 font-medium">Manage and monitor your uploaded projects</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMyGamesListOpen(false)}
                      className="p-2.5 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group"
                    >
                      <X className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#14161c]/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {serverGames.map(game => (
                        <div key={game.id} className="bg-[#1a1d24] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-16 -translate-y-16 group-hover:bg-blue-600/10 transition-all" />
                          
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-[#252830] flex items-center justify-center text-xs text-blue-400 font-black border border-white/5 shadow-inner">
                                #{game.id}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-base text-gray-100 truncate group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter">{game.name || game.title}</h4>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {(game.category || 'Uncategorized').split(',').map((cat: string, i: number) => (
                                    <span key={i} className="text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20 font-bold uppercase tracking-wider">
                                      {cat.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {game.normalizedImage && (
                                <div className="w-12 h-12 rounded-xl bg-gray-900 border border-white/10 overflow-hidden shadow-lg">
                                  <img src={game.normalizedImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                </div>
                              )}
                              <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-lg border border-yellow-400/20">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-[10px] text-yellow-400 font-black">{game.rating || '0.0'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-2 mt-2 relative z-10">
                            <button 
                              onClick={() => {
                                setIsMyGamesListOpen(false);
                                onPlayGame(game);
                              }}
                              className="flex items-center justify-center py-2.5 bg-green-600/10 hover:bg-green-600/20 border border-green-500/20 rounded-xl transition-all group/btn"
                              title="Play"
                            >
                              <Play className="w-4 h-4 text-green-400 group-hover/btn:scale-125 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleUpdateMyGame(game)}
                              className="flex items-center justify-center py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl transition-all group/btn"
                              title="Update Folder"
                            >
                              <FileCode className="w-4 h-4 text-blue-400 group-hover/btn:scale-125 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleEditInfoClick(game)}
                              className="flex items-center justify-center py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl transition-all group/btn"
                              title="Edit Info"
                            >
                              <Settings className="w-4 h-4 text-purple-400 group-hover/btn:scale-125 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleViewFeedbackClick(game)}
                              className="flex items-center justify-center py-2.5 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/20 rounded-xl transition-all group/btn"
                              title="View Feedbacks"
                            >
                              <MessageSquare className="w-4 h-4 text-yellow-400 group-hover/btn:scale-125 transition-transform" />
                            </button>
                            <button 
                              onClick={() => handleDeleteMyGame(game.id)}
                              className="flex items-center justify-center py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl transition-all group/btn"
                              title="Delete Game"
                            >
                              <Trash2 className="w-4 h-4 text-red-400 group-hover/btn:scale-125 transition-transform" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {serverGames.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-600">
                          <div className="w-24 h-24 rounded-full bg-gray-800/20 flex items-center justify-center mb-6 border border-white/5">
                            <Database className="w-12 h-12 opacity-20" />
                          </div>
                          <p className="text-lg font-bold text-gray-500">No Games Found</p>
                          <p className="text-sm italic text-gray-600 mt-2">Bạn chưa tải lên game nào lên server.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-[#1a1d24] border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest tracking-widest">Resider Game Creator • Project Management v2.0</p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>

        {/* Outdated Build Modal */}
        <AnimatePresence>
          {editingGame && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setEditingGame(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1a1d24] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Chỉnh sửa thông tin Game
                  </h3>
                  <button onClick={() => setEditingGame(null)} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Tên Game (Không ký tự đặc biệt)</label>
                    <input 
                      type="text"
                      value={editGameName}
                      onChange={(e) => {
                        setEditGameName(e.target.value);
                        setEditNameError('');
                      }}
                      className={`w-full bg-black/40 border ${editNameError ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors`}
                      placeholder="Nhập tên game..."
                      required
                    />
                    {editNameError && (
                      <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-bold animate-in fade-in slide-in-from-top-1">
                        {editNameError}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Thể loại (Tối đa 3)</label>
                      <span className={`text-[9px] font-bold ${editCategories.length === 3 ? 'text-red-400' : 'text-purple-400'}`}>
                        {editCategories.length}/3
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            if (editCategories.includes(cat.id)) {
                              setEditCategories(editCategories.filter(c => c !== cat.id));
                            } else if (editCategories.length < 3) {
                              setEditCategories([...editCategories, cat.id]);
                            } else {
                              showNotification('Chỉ được chọn tối đa 3 thể loại.', 'info');
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                            editCategories.includes(cat.id.toLowerCase())
                            ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                            : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/10'
                          }`}
                        >
                          {cat.icon}
                          {cat.name.toUpperCase()}
                        </button>

                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setEditingGame(null)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold transition-all"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {viewingFeedbackGame && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setViewingFeedbackGame(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1a1d24] border border-white/10 rounded-3xl p-6 max-w-lg w-full h-[80vh] flex flex-col shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-yellow-400" />
                      Góp ý từ người chơi
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium ml-7">{viewingFeedbackGame.name || viewingFeedbackGame.title}</p>
                  </div>
                  <button onClick={() => setViewingFeedbackGame(null)} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {isLoadingFeedbacks ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p className="text-sm">Đang tải đóng góp...</p>
                    </div>
                  ) : feedbacks.length > 0 ? (
                    <div className="space-y-4">
                      {feedbacks.map((fb, idx) => (
                        <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                                {fb.avatar_url ? (
                                  <img src={fb.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                    {fb.display_name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-gray-200">{fb.display_name || 'Người chơi vô danh'}</div>
                                <div className="text-[9px] text-gray-500">{new Date(fb.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                              <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-[10px] font-bold text-yellow-500">{fb.rating}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed italic">
                            "{fb.comment || 'Không có nhận xét chi tiết.'}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 text-center p-8">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-sm italic">Chưa có góp ý nào cho game này.</p>
                      <p className="text-[10px] mt-2">Đóng góp sẽ xuất hiện khi có người chơi bình luận về game của bạn.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => setViewingFeedbackGame(null)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold transition-all"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showOutdatedModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowOutdatedModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1a1d24] border border-yellow-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500/50 to-orange-500/50" />
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/20">
                    <RotateCcw className="w-8 h-8 text-yellow-500 animate-spin-slow" />
                  </div>
                  
                  <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight italic">
                    Bản Build Có Vẻ Đã Cũ!
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Hệ thống phát hiện mã nguồn của bạn đã thay đổi nhưng dự án chưa được build lại. 
                    Tải lên bản build cũ sẽ khiến các thay đổi mới nhất không xuất hiện.
                  </p>

                  <div className="w-full bg-black/40 rounded-2xl p-4 mb-6 border border-white/5 flex flex-col gap-3 text-left">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Source Code mới nhất</div>
                      <div className="text-xs text-yellow-400 font-mono">{outdatedDetails?.sourceTime}</div>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Build Assets cũ nhất</div>
                      <div className="text-xs text-gray-400 font-mono">{outdatedDetails?.buildTime}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={() => setShowOutdatedModal(false)}
                      className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-yellow-600/20 active:scale-95"
                    >
                      Tôi Đã Hiểu, Tiếp Tục
                    </button>
                    <button 
                      onClick={() => setShowOutdatedModal(false)}
                      className="w-full py-3 bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"
                    >
                      Để Tôi Build Lại Đã
                    </button>
                  </div>

                  <p className="mt-6 text-[10px] text-gray-500 font-medium">
                    Mẹo: Chạy <code>npm run build</code> hoặc <code>yarn build</code> để cập nhật thư mục <code>dist</code>.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showPasteCodeModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1a1d24] border border-blue-500/30 rounded-3xl p-6 max-w-3xl w-full h-[80vh] shadow-2xl relative flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                      <FileCode className="w-5 h-5 text-blue-400" />
                      Paste HTML Code
                    </h3>
                    <p className="text-xs text-blue-400/70 mt-1">Sử dụng cho các game thiết kế chung 1 file HTML duy nhất (như p5.js AI generated)</p>
                  </div>
                  <button onClick={() => setShowPasteCodeModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 relative mb-4">
                  <textarea
                    value={pastedCode}
                    onChange={(e) => setPastedCode(e.target.value)}
                    placeholder="Dán toàn bộ nội dung file HTML vào đây..."
                    className="w-full h-full bg-black/50 border border-gray-700/50 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none custom-scrollbar"
                    style={{ whiteSpace: 'pre' }}
                    spellCheck="false"
                  />
                  {!pastedCode && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="text-center text-gray-600">
                        <FileCode className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <div className="text-sm font-medium">Ctrl+V to paste your code</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 shrink-0">
                  <button 
                    onClick={() => setShowPasteCodeModal(false)}
                    className="px-6 py-2.5 bg-transparent border border-gray-700 hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handlePasteCodeSubmit}
                    disabled={!pastedCode.trim()}
                    className="flex-1 max-w-[200px] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Áp dụng & Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showDocOptionsModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setShowDocOptionsModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1a1d24] border border-blue-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black flex items-center gap-2 text-white uppercase tracking-tight italic">
                      <Download className="w-5 h-5 text-blue-400" />
                      Tải Tài Liệu Game
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1 ml-7">Chọn loại đồ họa và chế độ chơi phù hợp với game của bạn</p>
                  </div>
                  <button onClick={() => setShowDocOptionsModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Graphics Selection */}
                <div className="mb-5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block ml-1">1. Đồ họa</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDocGraphics('2d')}
                      className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                        docGraphics === '2d'
                          ? 'bg-green-600/15 border-green-500/60 shadow-lg shadow-green-500/10'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      {docGraphics === '2d' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-400 to-emerald-400" />}
                      <div className="text-2xl mb-2">🎨</div>
                      <div className="text-sm font-black uppercase tracking-tight">2D — P5.js</div>
                      <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">Canvas 2D, shapes, sprites, pixel art. Phù hợp cho Arcade, Puzzle, Board game.</div>
                    </button>
                    <button
                      onClick={() => setDocGraphics('3d')}
                      className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                        docGraphics === '3d'
                          ? 'bg-cyan-600/15 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      {docGraphics === '3d' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400" />}
                      <div className="text-2xl mb-2">🧊</div>
                      <div className="text-sm font-black uppercase tracking-tight">3D — Three.js</div>
                      <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">Voxel 3D, orbit camera, colorful scenes. Phù hợp cho Simulation, Sandbox.</div>
                    </button>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block ml-1">2. Chế độ chơi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDocMode('offline')}
                      className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                        docMode === 'offline'
                          ? 'bg-yellow-600/15 border-yellow-500/60 shadow-lg shadow-yellow-500/10'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      {docMode === 'offline' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400" />}
                      <div className="text-2xl mb-2">🏆</div>
                      <div className="text-sm font-black uppercase tracking-tight">Offline</div>
                      <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">Chơi đơn. Lưu điểm cao, XP, Level, Rank lên server. Có bảng xếp hạng.</div>
                    </button>
                    <button
                      onClick={() => setDocMode('multiplayer')}
                      className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${
                        docMode === 'multiplayer'
                          ? 'bg-purple-600/15 border-purple-500/60 shadow-lg shadow-purple-500/10'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      {docMode === 'multiplayer' && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-pink-400" />}
                      <div className="text-2xl mb-2">🌐</div>
                      <div className="text-sm font-black uppercase tracking-tight">Multiplayer</div>
                      <div className="text-[9px] text-gray-500 mt-1 leading-relaxed">P2P WebRTC qua PeerJS. Host-Authoritative, TURN Config tự động inject.</div>
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-black/30 rounded-xl p-3 mb-5 border border-white/5">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 font-bold">Đồ họa:</span>
                      <span className={`font-black ${docGraphics === '2d' ? 'text-green-400' : 'text-cyan-400'}`}>
                        {docGraphics === '2d' ? '2D P5.js' : '3D Three.js'}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 font-bold">Mode:</span>
                      <span className={`font-black ${docMode === 'offline' ? 'text-yellow-400' : 'text-purple-400'}`}>
                        {docMode === 'offline' ? 'Offline + Leaderboard' : 'Multiplayer P2P'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDocOptionsModal(false)}
                    className="flex-1 py-3 bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleDocDownloadConfirm}
                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Tải Document
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
}
