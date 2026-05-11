import React, { useState, useEffect, useCallback } from 'react';
import { CreatorViewProps, DeviceType, Orientation, DocGraphics, DocMode } from '../../../../creator/types';
import { usePreviewScale } from '../../../../creator/hooks/usePreviewScale';
import { useFileProcessor } from '../../../../creator/hooks/useFileProcessor';
import { useGameManager } from '../../../../creator/hooks/useGameManager';
import CreatorSidebar from '../../../../creator/components/CreatorSidebar';
import MyGamesModal from '../../../../creator/modals/MyGamesModal';
import EditGameModal from '../../../../creator/modals/EditGameModal';
import FeedbackModal from '../../../../creator/modals/FeedbackModal';
import OutdatedBuildModal from '../../../../creator/modals/OutdatedBuildModal';
import PasteCodeModal from '../../../../creator/modals/PasteCodeModal';
import DocOptionsModal from '../../../../creator/modals/DocOptionsModal';
import CreatorTabHeader from './CreatorTabHeader';
import CreatorPreviewOverlay from './CreatorPreviewOverlay';

export default function CreatorTabView({
  user,
  showNotification,
  onPublishSuccess,
  onPlayGame,
  cloudflareUrl,
  triggerAuth,
  externalOpenList = false,
  onOpenListChange,
}: CreatorViewProps) {
  const [localGameUrl, setLocalGameUrl] = useState<string | null>(null);
  const [serverPreviewUrl, setServerPreviewUrl] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [gameBaseDir, setGameBaseDir] = useState('');
  const [gameName, setGameName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewingOnServer, setIsPreviewingOnServer] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [serverGames, setServerGames] = useState<any[]>([]);
  const [isMyGamesListOpen, setIsMyGamesListOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [subTab, setSubTab] = useState<'creator' | 'manager'>('creator');

  const [deviceType, setDeviceType] = useState<DeviceType>('pc');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const hasPreview = !!(localGameUrl || serverPreviewUrl);
  const { containerRef, scale } = usePreviewScale(deviceType, orientation, hasPreview);

  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishStatusType, setPublishStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [gameThumbnail, setGameThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);
  const [showOutdatedModal, setShowOutdatedModal] = useState(false);
  const [outdatedDetails, setOutdatedDetails] = useState<{ sourceTime: string; buildTime: string } | null>(null);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [editGameName, setEditGameName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [updatingGameId, setUpdatingGameId] = useState<string | null>(null);
  const [viewingFeedbackGame, setViewingFeedbackGame] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [showPasteCodeModal, setShowPasteCodeModal] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [showDocOptionsModal, setShowDocOptionsModal] = useState(false);
  const [docGraphics, setDocGraphics] = useState<DocGraphics>('2d');
  const [docMode, setDocMode] = useState<DocMode>('offline');

  const {
    fileInputRef,
    handleFolderSelect,
    handlePasteCodeSubmit,
    createZipBlob,
  } = useFileProcessor({
    showNotification: showNotification!,
    cloudflareUrl: cloudflareUrl!,
    gameName,
    setGameName,
    setSelectedFiles,
    setGameBaseDir,
    setServerPreviewUrl,
    setLocalGameUrl,
    setShowOutdatedModal,
    setOutdatedDetails,
    setShowPasteCodeModal,
  });

  const gameManager = useGameManager({
    user,
    cloudflareUrl: cloudflareUrl!,
    showNotification: showNotification!,
    onPublishSuccess,
    triggerAuth,
    setServerGames,
    setIsMyGamesListOpen,
    setUpdatingGameId,
    setGameName,
    setSelectedCategories,
    setThumbnailPreview,
    setEditingGame,
    setEditGameName,
    setEditNameError,
    setEditCategories,
    setViewingFeedbackGame,
    setFeedbacks,
    setIsLoadingFeedbacks,
    setIsPublishing,
    setUploadProgress,
    setPublishStatus,
    setPublishStatusType,
    setIsPreviewingOnServer,
    setServerPreviewUrl,
    setIsDownloadingDoc,
    setShowDocOptionsModal,
    createZipBlob,
    fileInputRef,
  });

  const requireCreatorAuth = useCallback((actionLabel: string, afterLogin?: () => void) => {
    if (user) return true;
    triggerAuth?.(afterLogin || (() => {}));
    return false;
  }, [user, triggerAuth]);

  useEffect(() => {
    if (externalOpenList) {
      if (!requireCreatorAuth('quan ly game', () => {
        setSubTab('manager');
        gameManager.fetchMyGames();
      })) {
        onOpenListChange?.(false);
        return;
      }
      setSubTab('manager');
      gameManager.fetchMyGames();
    }
  }, [externalOpenList, requireCreatorAuth, gameManager, onOpenListChange]);

  useEffect(() => {
    if (subTab !== 'manager' && onOpenListChange) {
      onOpenListChange(false);
    }
  }, [subTab, onOpenListChange]);

  useEffect(() => {
    if (!isMyGamesListOpen && subTab === 'manager') {
      setSubTab('creator');
    }
  }, [isMyGamesListOpen, subTab]);

  useEffect(() => {
    if (selectedFiles && selectedFiles.length > 0 && !isPreviewingOnServer && !serverPreviewUrl) {
      gameManager.handleServerPreview(selectedFiles, gameBaseDir, true);
    }
  }, [selectedFiles, isPreviewingOnServer, serverPreviewUrl, gameManager, gameBaseDir]);

  useEffect(() => {
    if (user) {
      gameManager.fetchMyGames();
    } else {
      setServerGames([]);
    }
  }, [user?.uid, user?.email, gameManager]);

  const handleThumbnailSelect = (file: File) => {
    setGameThumbnail(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCategoryToggle = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter(c => c !== catId));
    } else if (selectedCategories.length < 3) {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleEditCategoryToggle = (catId: string) => {
    if (editCategories.includes(catId)) {
      setEditCategories(editCategories.filter(c => c !== catId));
    } else if (editCategories.length < 3) {
      setEditCategories([...editCategories, catId]);
    } else {
      showNotification?.('Chỉ được chọn tối đa 3 thể loại.', 'info');
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#13151a]">
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <CreatorTabHeader
          subTab={subTab}
          setSubTab={setSubTab}
          requireCreatorAuth={requireCreatorAuth}
          onManageGamesClick={() => gameManager.fetchMyGames()}
        />

        <div className="flex-1 flex flex-col min-h-0">
          {subTab === 'creator' ? (
            <div className="p-0 flex-1">
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
                onPublish={() => {
                  if (!requireCreatorAuth('publish game')) return;
                  gameManager.handlePublish(gameName, selectedFiles, gameBaseDir, selectedCategories, gameThumbnail, updatingGameId);
                }}
                onManageGamesClick={() => {
                  if (!requireCreatorAuth('quan ly game')) return;
                  gameManager.fetchMyGames();
                  setSubTab('manager');
                }}
                onDownloadDoc={gameManager.handleDownloadDoc}
                showNotification={showNotification!}
                fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
                onFolderInputChange={handleFolderSelect}
                previewUrl={serverPreviewUrl || (localGameUrl === 'server-preview' ? null : localGameUrl)}
                deviceType={deviceType}
                onDeviceTypeChange={setDeviceType}
                onExpand={() => setIsExpanded(true)}
                onClose={() => {}}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <MyGamesModal
                isOpen={isMyGamesListOpen}
                onClose={() => setIsMyGamesListOpen(false)}
                serverGames={serverGames}
                onPlayGame={onPlayGame!}
                onUpdateGame={gameManager.handleUpdateMyGame}
                onEditInfo={gameManager.handleEditInfoClick}
                onViewFeedback={gameManager.handleViewFeedbackClick}
                onDeleteGame={gameManager.handleDeleteMyGame}
              />
            </div>
          )}
        </div>
      </div>

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
          showNotification={showNotification!}
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

      <CreatorPreviewOverlay
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        deviceType={deviceType}
        orientation={orientation}
        serverPreviewUrl={serverPreviewUrl}
        localGameUrl={localGameUrl}
        isPreviewingOnServer={isPreviewingOnServer}
        scale={scale}
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        onDeviceTypeChange={setDeviceType}
        onOrientationToggle={() => setOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
        onIframeLoad={() => setIsPreviewingOnServer(false)}
        showNotification={showNotification!}
      />
    </div>
  );
}
