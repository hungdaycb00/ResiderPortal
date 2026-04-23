import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minimize2, X } from 'lucide-react';
import { CreatorViewProps, DeviceType, Orientation, DocGraphics, DocMode } from '../../creator/types';
import { Monitor } from 'lucide-react';
import { usePreviewScale } from '../../creator/hooks/usePreviewScale';
import { useFileProcessor } from '../../creator/hooks/useFileProcessor';
import { useGameManager } from '../../creator/hooks/useGameManager';
import CreatorSidebar from '../../creator/components/CreatorSidebar';
import PreviewArea from '../../creator/components/PreviewArea';
import MyGamesModal from '../../creator/modals/MyGamesModal';
import EditGameModal from '../../creator/modals/EditGameModal';
import FeedbackModal from '../../creator/modals/FeedbackModal';
import OutdatedBuildModal from '../../creator/modals/OutdatedBuildModal';
import PasteCodeModal from '../../creator/modals/PasteCodeModal';
import DocOptionsModal from '../../creator/modals/DocOptionsModal';

export default function CreatorTabView({ 
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    showNotification: showNotification!, cloudflareUrl: cloudflareUrl!, gameName,
    setGameName, setSelectedFiles, setGameBaseDir,
    setServerPreviewUrl, setLocalGameUrl,
    setShowOutdatedModal, setOutdatedDetails, setShowPasteCodeModal,
  });

  // Game manager hook
  const gameManager = useGameManager({
    user, cloudflareUrl: cloudflareUrl!, showNotification: showNotification!, onPublishSuccess, triggerAuth,
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
      showNotification?.('Chỉ được chọn tối đa 3 thể loại.', 'info');
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#13151a]">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Creator Header */}
        <div className="p-4 border-b border-gray-800 bg-[#1a1d24]">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            Game Creator
          </h3>
          <p className="text-xs text-gray-400 mt-1">Upload and publish your games to Alin Map</p>
        </div>

        {/* Sidebar Content (Integrated) */}
        <div className="p-0">
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
            showNotification={showNotification!}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            onFolderInputChange={handleFolderSelect}
            previewUrl={serverPreviewUrl || (localGameUrl === 'server-preview' ? null : localGameUrl)}
            deviceType={deviceType}
            onDeviceTypeChange={setDeviceType}
            onExpand={() => setIsExpanded(true)}
          />
        </div>

        {/* Preview removed here as it is now integrated into Thumbnail area */}
      </div>

      {/* Modals (Integrated) */}
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

        {/* Expanded Preview Overlay */}
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black flex flex-col"
          >
            {/* Header for expanded view */}
            <div className="h-14 bg-[#1a1d24] border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">Live Preview</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{deviceType} Mode</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all border border-gray-700"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span className="text-xs font-bold">Thu nhỏ</span>
                </button>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#13151a]">
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
                showNotification={showNotification!}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
