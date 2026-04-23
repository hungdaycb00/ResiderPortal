import React from 'react';
import { Download, Play, Loader2, Send, Folder, Database, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CategorySelector from './CategorySelector';
import ThumbnailPicker from './ThumbnailPicker';
import { PublishStatusType } from '../types';

interface CreatorSidebarProps {
  // State
  gameName: string;
  selectedFiles: File[] | null;
  selectedCategories: string[];
  isCategoriesExpanded: boolean;
  gameThumbnail: File | null;
  thumbnailPreview: string | null;
  isPublishing: boolean;
  isPreviewingOnServer: boolean;
  isDownloadingDoc: boolean;
  uploadProgress: number;
  publishStatus: string | null;
  publishStatusType: PublishStatusType;
  // Handlers
  onGameNameChange: (name: string) => void;
  onFolderSelect: () => void;
  onPasteCodeClick: () => void;
  onCategoryToggle: (catId: string) => void;
  onCategoriesExpandToggle: () => void;
  onThumbnailSelect: (file: File) => void;
  onThumbnailClear: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onManageGamesClick: () => void;
  onDownloadDoc: () => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFolderInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function CreatorSidebar({
  gameName, selectedFiles, selectedCategories, isCategoriesExpanded,
  gameThumbnail, thumbnailPreview, isPublishing, isPreviewingOnServer,
  isDownloadingDoc, uploadProgress, publishStatus, publishStatusType,
  onGameNameChange, onFolderSelect, onPasteCodeClick, onCategoryToggle,
  onCategoriesExpandToggle, onThumbnailSelect, onThumbnailClear,
  onPreview, onPublish, onManageGamesClick, onDownloadDoc,
  showNotification, fileInputRef, onFolderInputChange,
}: CreatorSidebarProps) {
  return (
    <div className="w-full p-4 flex flex-col gap-4 bg-[#1a1d24] overflow-y-auto custom-scrollbar">
      
      <button 
        onClick={onDownloadDoc}
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
          onChange={onFolderInputChange}
          style={{ display: 'none' }}
          // @ts-ignore
          webkitdirectory="" 
          directory=""
        />
        <button 
          onClick={onFolderSelect}
          className="flex items-center gap-2 p-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl transition-all group text-left h-full"
        >
          <Folder className="w-5 h-5 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="overflow-hidden">
            <div className="text-[12px] font-bold text-purple-100 whitespace-nowrap overflow-hidden text-ellipsis">Select Folder</div>
            <div className="text-[9px] text-purple-400/70 whitespace-nowrap overflow-hidden text-ellipsis">{selectedFiles ? `${selectedFiles.length} files` : 'Web folder'}</div>
          </div>
        </button>

        <button 
          onClick={onPasteCodeClick}
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
          onChange={(e) => onGameNameChange(e.target.value)}
          className={`w-full bg-[#1a1d24] border ${!gameName ? 'border-red-500/50' : 'border-gray-700'} rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all`}
        />
      </div>

      <CategorySelector
        selectedCategories={selectedCategories}
        onToggle={onCategoryToggle}
        expandable
        isExpanded={isCategoriesExpanded}
        onExpandToggle={onCategoriesExpandToggle}
        showNotification={showNotification}
      />

      <ThumbnailPicker
        thumbnailPreview={thumbnailPreview}
        onThumbnailSelect={onThumbnailSelect}
        onThumbnailClear={onThumbnailClear}
        hasThumbnail={!!gameThumbnail}
      />

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={onPreview}
          disabled={isPreviewingOnServer || !selectedFiles}
          className="flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Xem trước"
        >
          {isPreviewingOnServer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-blue-400" />}
          <span className="text-xs font-bold">Preview</span>
        </button>

        <button 
          onClick={onPublish}
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
          onClick={onManageGamesClick}
          className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all group shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10"
        >
          <Database className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-blue-100">Manage Uploaded Games</span>
        </button>
      </div>
    </div>
  );
}
