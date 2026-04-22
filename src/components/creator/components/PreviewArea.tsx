import React from 'react';
import { Loader2, Monitor, Tablet, Smartphone, RotateCcw, Folder } from 'lucide-react';
import { DeviceType, Orientation } from '../types';
import { DEVICE_DIMENSIONS } from '../constants';

interface PreviewAreaProps {
  serverPreviewUrl: string | null;
  localGameUrl: string | null;
  isPreviewingOnServer: boolean;
  deviceType: DeviceType;
  orientation: Orientation;
  scale: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onDeviceTypeChange: (type: DeviceType) => void;
  onOrientationToggle: () => void;
  onIframeLoad: () => void;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function PreviewArea({
  serverPreviewUrl, localGameUrl, isPreviewingOnServer,
  deviceType, orientation, scale, containerRef,
  onDeviceTypeChange, onOrientationToggle, onIframeLoad,
  showNotification,
}: PreviewAreaProps) {
  const hasPreview = !!(localGameUrl || serverPreviewUrl);
  const dims = DEVICE_DIMENSIONS[deviceType][orientation];

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
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

    onIframeLoad();
  };

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Toolbar for Status & Controls */}
      <div className="h-14 border-b border-white/5 bg-[#1a1d24] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold text-white/70">
          <div className={`w-1.5 h-1.5 rounded-full ${serverPreviewUrl ? 'bg-blue-500' : localGameUrl ? 'bg-green-500' : 'bg-gray-500'}`} />
          {serverPreviewUrl ? 'Server Preview Active' : localGameUrl ? 'Local Preview Active' : 'Waiting for Folder...'}
        </div>

        {/* Device Controls */}
        {hasPreview && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full border border-white/10">
            <button 
              onClick={() => onDeviceTypeChange('pc')}
              className={`p-1.5 rounded-lg transition-colors ${deviceType === 'pc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="PC (1920x1080)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDeviceTypeChange('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${deviceType === 'tablet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Tablet (1024x768)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDeviceTypeChange('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${deviceType === 'mobile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Mobile (390x844)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            
            <button 
              onClick={onOrientationToggle}
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
        {hasPreview ? (
          <div 
            className="transition-all duration-500 ease-in-out flex items-center justify-center relative"
            style={{
              width: `${dims.w}px`,
              height: `${dims.h}px`,
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
              onLoad={handleIframeLoad}
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
    </div>
  );
}
