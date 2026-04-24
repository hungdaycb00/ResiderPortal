import React from 'react';
import { MotionValue } from 'framer-motion';

interface ContextMenuData {
  x: number;
  y: number;
  target: 'map' | 'user';
  data: any;
}

interface ContextMenuProps {
  contextMenu: ContextMenuData;
  setContextMenu: (v: ContextMenuData | null) => void;
  setMyObfPos: (pos: { lat: number; lng: number }) => void;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  ws: React.MutableRefObject<WebSocket | null>;
  setSelectedUser: (u: any) => void;
  handleAddFriend: (u?: any) => void;
  handleMessage: (u?: any) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu, setContextMenu, setMyObfPos, panX, panY, ws,
  setSelectedUser, handleAddFriend, handleMessage,
}) => {
  return (
    <>
      <div
        className="fixed inset-0 z-[998]"
        onClick={() => setContextMenu(null)}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
      />

      <div
        className="fixed z-[999] bg-[#1a1d24] border border-gray-700/50 rounded-xl shadow-2xl py-2 min-w-[180px] overflow-hidden backdrop-blur-md"
        style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 180) }}
      >
        {contextMenu.target === 'map' ? (
          <button
            className="w-full text-left px-4 py-3 hover:bg-gray-800 text-sm text-gray-200 font-medium transition-colors flex items-center gap-3"
            onClick={() => {
              setMyObfPos({ lat: contextMenu.data.lat, lng: contextMenu.data.lng });
              panX.set(0);
              panY.set(0);
              if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                  type: 'MAP_MOVE',
                  payload: { lat: contextMenu.data.lat, lng: contextMenu.data.lng, zoom: 13 }
                }));
              }
              setContextMenu(null);
            }}
          >
            <span className="text-lg">📍</span> Dịch chuyển đến đây
          </button>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-gray-800 mb-1">
              <p className="text-xs font-bold text-gray-400 truncate w-full">{contextMenu.data.username}</p>
            </div>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-gray-200 font-medium transition-colors flex items-center gap-3"
              onClick={() => {
                setSelectedUser(contextMenu.data);
                setContextMenu(null);
                setTimeout(() => handleAddFriend(contextMenu.data), 100);
              }}
            >
              <span className="text-lg">👋</span> Kết bạn
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-gray-200 font-medium transition-colors flex items-center gap-3"
              onClick={() => {
                setSelectedUser(contextMenu.data);
                setContextMenu(null);
                setTimeout(() => handleMessage(contextMenu.data), 100);
              }}
            >
              <span className="text-lg">💬</span> Nhắn tin
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default ContextMenu;
