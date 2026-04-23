import React, { useRef } from 'react';
import { Camera, Plus, Monitor, Tablet, Smartphone, Maximize2 } from 'lucide-react';
import { DeviceType } from '../types';

interface ThumbnailPickerProps {
  thumbnailPreview: string | null;
  onThumbnailSelect: (file: File) => void;
  onThumbnailClear: () => void;
  hasThumbnail: boolean;
  previewUrl?: string | null;
  deviceType?: DeviceType;
  onDeviceTypeChange?: (type: DeviceType) => void;
  onExpand?: () => void;
}

export default function ThumbnailPicker({
  thumbnailPreview,
  onThumbnailSelect,
  onThumbnailClear,
  hasThumbnail,
  previewUrl,
  deviceType = 'pc',
  onDeviceTypeChange,
  onExpand
}: ThumbnailPickerProps) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onThumbnailSelect(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-1 h-6">
        <label className="text-[10px] font-bold text-gray-500 uppercase">Game Thumbnail</label>
        
        {previewUrl && onDeviceTypeChange && (
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-0.5 border border-gray-700">
            <button 
              onClick={(e) => { e.stopPropagation(); onDeviceTypeChange('pc'); }}
              className={`p-1 rounded transition-colors ${deviceType === 'pc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
              title="PC"
            >
              <Monitor className="w-2.5 h-2.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeviceTypeChange('tablet'); }}
              className={`p-1 rounded transition-colors ${deviceType === 'tablet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
              title="Tablet"
            >
              <Tablet className="w-2.5 h-2.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeviceTypeChange('mobile'); }}
              className={`p-1 rounded transition-colors ${deviceType === 'mobile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
              title="Mobile"
            >
              <Smartphone className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={thumbnailInputRef}
        onChange={handleChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <div 
        onClick={() => thumbnailInputRef.current?.click()}
        className="relative aspect-[16/9] w-full rounded-xl border border-gray-700 bg-black overflow-hidden cursor-pointer group hover:border-purple-500/50 transition-all"
      >
        {thumbnailPreview ? (
          <>
            <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
              <Camera className="w-6 h-6 text-white shadow-lg" />
            </div>
          </>
        ) : previewUrl ? (
          <div className="w-full h-full pointer-events-none relative">
            <iframe 
              src={previewUrl} 
              className="w-full h-full border-none pointer-events-none scale-[1.02]" 
              title="Thumbnail Preview"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
               <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-40 transition-opacity" />
            </div>
            
            {onExpand && (
              <button 
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-auto border border-white/10"
                title="Expand Preview"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 group-hover:text-gray-400 transition-colors">
            <Plus className="w-8 h-8" />
          </div>
        )}
      </div>
      {thumbnailPreview && (
        <button 
          onClick={onThumbnailClear}
          className="text-[10px] text-red-400 hover:text-red-300 transition-colors self-end"
        >
          Delete image
        </button>
      )}
    </div>
  );
}
