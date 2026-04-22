import React, { useRef } from 'react';
import { Camera, Image } from 'lucide-react';

interface ThumbnailPickerProps {
  thumbnailPreview: string | null;
  onThumbnailSelect: (file: File) => void;
  onThumbnailClear: () => void;
  hasThumbnail: boolean;
}

export default function ThumbnailPicker({
  thumbnailPreview,
  onThumbnailSelect,
  onThumbnailClear,
  hasThumbnail,
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
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-bold text-gray-500 uppercase">Game Thumbnail</label>
        {!hasThumbnail && (
          <span className="text-[9px] font-bold text-red-500 animate-pulse">* Required</span>
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
          onClick={onThumbnailClear}
          className="text-[10px] text-red-400 hover:text-red-300 transition-colors self-end"
        >
          Delete image
        </button>
      )}
    </div>
  );
}
