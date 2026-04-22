import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { CreatorViewProps, DeviceType, Orientation, DocGraphics, DocMode } from './types';
import { usePreviewScale } from './hooks/usePreviewScale';
import { useFileProcessor } from './hooks/useFileProcessor';
import { useGameManager } from './hooks/useGameManager';
import CreatorSidebar from './components/CreatorSidebar';
import PreviewArea from './components/PreviewArea';
import MyGamesModal from './modals/MyGamesModal';
import EditGameModal from './modals/EditGameModal';
import FeedbackModal from './modals/FeedbackModal';
import OutdatedBuildModal from './modals/OutdatedBuildModal';
import PasteCodeModal from './modals/PasteCodeModal';
import DocOptionsModal from './modals/DocOptionsModal';

export default function CreatorView({ 
  user, showNotification, onPublishSuccess, onPlayGame, 
  cloudflareUrl, triggerAuth, externalOpenList = false, onOpenListChange
}: CreatorViewProps) {
  // Core state
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

  // Device preview
  const [deviceType, setDeviceType] = useState<DeviceType>('pc');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const hasPreview = !!(localGameUrl || serverPreviewUrl);
  const { containerRef, scale } = usePreviewScale(deviceType, orientation, hasPreview);

  // Publish status
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishStatusType, setPublishStatusType] = useState<'info' | 'success' | 'error'>('info');

  // Thumbnail
  const [gameThumbnail, setGameThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);

  // Vite Build Guard
  const [showOutdatedModal, setShowOutdatedModal] = useState(false);
  const [outdatedDetails, setOutdatedDetails] = useState<{ sourceTime: string; buildTime: string } | null>(null);

  // Edit Game Modal
  const [editingGame, setEditingGame] = useState<any>(null);
  const [editGameName, setEditGameName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [updatingGameId, setUpdatingGameId] = useState<string | null>(null);

  // Feedback Modal
  const [viewingFeedbackGame, setViewingFeedbackGame] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  // Category & paste code
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [showPasteCodeModal, setShowPasteCodeModal] = useState(false);
  const [pastedCode, setPastedCode] = useState('');

  // Doc Options Modal
  const [showDocOptionsModal, setShowDocOptionsModal] = useState(false);
  const [docGraphics, setDocGraphics] = useState<DocGraphics>('2d');
  const [docMode, setDocMode] = useState<DocMode>('offline');

  // File processor hook
  const {
    fileInputRef, handleFolderSelect, handlePasteCodeSubmit, createZipBlob,
  } = useFileProcessor({
    showNotification, cloudflareUrl, gameName,
    setGameName, setSelectedFiles, setGameBaseDir,
    setServerPreviewUrl, setLocalGameUrl,
    setShowOutdatedModal, setOutdatedDetails, setShowPasteCodeModal,
  });

  // Game manager hook
  const gameManager = useGameManager({
    user, cloudflareUrl, showNotification, onPublishSuccess, triggerAuth,
    setServerGames, setIsMyGamesListOpen, setUpdatingGameId, setGameName,
    setSelectedCategories, setThumbnailPreview, setEditingGame, setEditGameName,
    setEditNameError, setEditCategories, setViewingFeedbackGame, setFeedbacks,
    setIsLoadingFeedbacks, setIsPublishing, setUploadProgress, setPublishStatus,
    setPublishStatusType, setIsPreviewingOnServer, setServerPreviewUrl,
    setIsDownloadingDoc, setShowDocOptionsModal,
    createZipBlob, fileInputRef,
  });

  // Sync external open request
  useEffect(() => {
    if (externalOpenList) {
      setIsMyGamesListOpen(true);
      gameManager.fetchMyGames();
    }
  }, [externalOpenList]);

  // Sync back to external if list is closed internally
  useEffect(() => {
    if (!isMyGamesListOpen && onOpenListChange) {
      onOpenListChange(false);
    }
  }, [isMyGamesListOpen]);

  // Automatically trigger preview when new files are selected
  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0 && !isPreviewingOnServer && !serverPreviewUrl) {
      gameManager.handleServerPreview(selectedFiles, gameBaseDir, true);
    }
  }, [selectedFiles]);

  // Initial fetch
  useEffect(() => {
    gameManager.fetchMyGames();
  }, []);

  // Thumbnail handler
  const handleThumbnailSelect = (file: File) => {
    setGameThumbnail(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Category toggle handler
  const handleCategoryToggle = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter(c => c !== catId));
    } else if (selectedCategories.length < 3) {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  // Edit category toggle handler
  const handleEditCategoryToggle = (catId: string) => {
    if (editCategories.includes(catId)) {
      setEditCategories(editCategories.filter(c => c !== catId));
    } else if (editCategories.length < 3) {
      setEditCategories([...editCategories, catId]);
    } else {
      showNotification('Chỉ được chọn tối đa 3 thể loại.', 'info');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <CreatorSidebar
          gameName={gameName}
          selectedFiles={selectedFiles}
          selectedCategories={selectedCategories}
          isCategoriesExpanded={isCategoriesExpanded}
          gameThumbnail={gameThumbnail}
          thumbnailPreview={thumbnailPreview}
          isPublishing={isPublishing}
          isPreviewingOnServer={isPreviewingOnServer}
          isDownloadingDoc={isDownloadingDoc}
          uploadProgress={uploadProgress}
          publishStatus={publishStatus}
          publishStatusType={publishStatusType}
          onGameNameChange={setGameName}
          onFolderSelect={() => fileInputRef.current?.click()}
          onPasteCodeClick={() => setShowPasteCodeModal(true)}
          onCategoryToggle={handleCategoryToggle}
          onCategoriesExpandToggle={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
          onThumbnailSelect={handleThumbnailSelect}
          onThumbnailClear={() => { setGameThumbnail(null); setThumbnailPreview(null); }}
          onPreview={() => gameManager.handleServerPreview(selectedFiles, gameBaseDir)}
          onPublish={() => gameManager.handlePublish(gameName, selectedFiles, gameBaseDir, selectedCategories, gameThumbnail, updatingGameId)}
          onManageGamesClick={() => { gameManager.fetchMyGames(); setIsMyGamesListOpen(true); }}
          onDownloadDoc={gameManager.handleDownloadDoc}
          showNotification={showNotification}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          onFolderInputChange={handleFolderSelect}
        />

        {/* Preview Area */}
        <PreviewArea
          serverPreviewUrl={serverPreviewUrl}
          localGameUrl={localGameUrl}
          isPreviewingOnServer={isPreviewingOnServer}
          deviceType={deviceType}
          orientation={orientation}
          scale={scale}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          onDeviceTypeChange={setDeviceType}
          onOrientationToggle={() => setOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
          onIframeLoad={() => setIsPreviewingOnServer(false)}
          showNotification={showNotification}
        />
      </div>

      {/* Modals */}
      <MyGamesModal
        isOpen={isMyGamesListOpen}
        onClose={() => setIsMyGamesListOpen(false)}
        serverGames={serverGames}
        onPlayGame={onPlayGame}
        onUpdateGame={gameManager.handleUpdateMyGame}
        onEditInfo={gameManager.handleEditInfoClick}
        onViewFeedback={gameManager.handleViewFeedbackClick}
        onDeleteGame={gameManager.handleDeleteMyGame}
      />

      <AnimatePresence>
        {editingGame && (
          <EditGameModal
            editingGame={editingGame}
            editGameName={editGameName}
            editNameError={editNameError}
            editCategories={editCategories}
            onClose={() => setEditingGame(null)}
            onEditGameNameChange={setEditGameName}
            onEditNameErrorClear={() => setEditNameError('')}
            onEditCategoryToggle={handleEditCategoryToggle}
            onSubmit={(e) => gameManager.handleEditSubmit(e, editingGame, editGameName, editCategories)}
            showNotification={showNotification}
          />
        )}

        {viewingFeedbackGame && (
          <FeedbackModal
            game={viewingFeedbackGame}
            feedbacks={feedbacks}
            isLoading={isLoadingFeedbacks}
            onClose={() => setViewingFeedbackGame(null)}
          />
        )}

        <OutdatedBuildModal
          isOpen={showOutdatedModal}
          outdatedDetails={outdatedDetails}
          onClose={() => setShowOutdatedModal(false)}
        />

        <PasteCodeModal
          isOpen={showPasteCodeModal}
          pastedCode={pastedCode}
          onPastedCodeChange={setPastedCode}
          onSubmit={() => { handlePasteCodeSubmit(pastedCode); setPastedCode(''); }}
          onClose={() => setShowPasteCodeModal(false)}
        />

        <DocOptionsModal
          isOpen={showDocOptionsModal}
          docGraphics={docGraphics}
          docMode={docMode}
          onDocGraphicsChange={setDocGraphics}
          onDocModeChange={setDocMode}
          onConfirm={() => gameManager.handleDocDownloadConfirm(docGraphics, docMode)}
          onClose={() => setShowDocOptionsModal(false)}
        />
      </AnimatePresence>
    </div>
  );
}
