import { useCallback } from 'react';
import { normalizeNearbyUsers, buildPositionKey, buildMapMovePayload } from './alinWebSocketUtils';

interface WsMessageHandlerParams {
  // Refs
  joinCompletedRef: React.MutableRefObject<boolean>;
  pendingJoinRef: React.MutableRefObject<boolean>;
  lastPositionKeyRef: React.MutableRefObject<string>;
  myUserIdRef: React.MutableRefObject<string | null>;
  userRef: React.MutableRefObject<any>;
  searchTagRef: React.MutableRefObject<string>;
  selectedUserRef: React.MutableRefObject<any>;
  lastNearbyUsersTsRef: React.MutableRefObject<number>;
  positionRef: React.MutableRefObject<[number, number] | null>;

  // State setters
  setMyObfPos: (pos: { lat: number; lng: number }) => void;
  setMyUserId: (id: string) => void;
  setMyDisplayName: (name: string) => void;
  setLocalMyStatus: (status: string) => void;
  setStatusInput: (input: string) => void;
  setGalleryTitle: (title: string) => void;
  setGalleryImages: (images: string[]) => void;
  setGalleryActive: (active: boolean) => void;
  setNearbyUsers: (users: any[]) => void;
  setSelectedUser: (user: any) => void;

  // Callbacks
  addLog: (msg: string) => void;
  onStatusSync?: (status: string) => void;
  fetchNotifications: () => void;
  sendJoinPayload: (socket: WebSocket) => boolean;
}

/**
 * Hook trả về callback xử lý toàn bộ message từ WebSocket server.
 * Tách ra khỏi useAlinWebSocket để dễ bảo trì.
 */
export function useWsMessageHandler({
  joinCompletedRef,
  pendingJoinRef,
  lastPositionKeyRef,
  myUserIdRef,
  userRef,
  searchTagRef,
  selectedUserRef,
  lastNearbyUsersTsRef,
  positionRef,
  setMyObfPos,
  setMyUserId,
  setMyDisplayName,
  setLocalMyStatus,
  setStatusInput,
  setGalleryTitle,
  setGalleryImages,
  setGalleryActive,
  setNearbyUsers,
  setSelectedUser,
  addLog,
  onStatusSync,
  fetchNotifications,
  sendJoinPayload,
}: WsMessageHandlerParams) {
  return useCallback((event: MessageEvent, socket: WebSocket) => {
    let data: any;
    try { data = JSON.parse(event.data); } catch { return; }
    if (!data?.type) return;

    // ── JOIN_SUCCESS ─────────────────────────────────────────────────────────
    if (data.type === 'JOIN_SUCCESS') {
      const p = data.payload || {};
      joinCompletedRef.current = true;
      addLog(`My obf pos: ${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)} (user: ${p.username})`);

      if (p.lat != null && p.lng != null) {
        setMyObfPos({ lat: p.lat, lng: p.lng });
      }

      setMyUserId(p.userId);
      myUserIdRef.current = p.userId;

      const nextDisplayName = userRef.current?.displayName || p.displayName || p.username;
      if (nextDisplayName) setMyDisplayName(nextDisplayName);

      if (p.status) {
        setLocalMyStatus(p.status);
        setStatusInput(p.status);
        onStatusSync?.(p.status);
      }

      if (p.gallery) {
        setGalleryTitle(p.gallery.title || '');
        setGalleryImages(p.gallery.images || []);
        setGalleryActive(p.gallery.active || false);
      }

      if (p.lat != null && p.lng != null) {
        socket.send(JSON.stringify(buildMapMovePayload(p.lat, p.lng)));
        addLog('Sent MAP_MOVE scan');
      }

      const latestPosition = positionRef.current;
      const latestPositionKey = buildPositionKey(latestPosition);
      if (latestPositionKey && latestPositionKey !== lastPositionKeyRef.current && Array.isArray(latestPosition) && latestPosition.length >= 2) {
        lastPositionKeyRef.current = latestPositionKey;
        socket.send(JSON.stringify(buildMapMovePayload(latestPosition[0], latestPosition[1])));
        addLog(`Updated GPS after join: ${latestPosition[0].toFixed(4)}, ${latestPosition[1].toFixed(4)}`);
      }
    }

    // ── NEARBY_USERS ─────────────────────────────────────────────────────────
    if (data.type === 'NEARBY_USERS') {
      const now = Date.now();
      if (now - lastNearbyUsersTsRef.current < 500) return;
      lastNearbyUsersTsRef.current = now;

      const { users, filtered } = normalizeNearbyUsers({
        payload: data.payload,
        currentMyUserId: myUserIdRef.current,
        currentSearchTag: searchTagRef.current,
      });

      setNearbyUsers(filtered);
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser && !currentSelectedUser.isSelf) {
        const updated = users.find((u: any) => u.id === currentSelectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    }

    // ── NEW_NOTIFICATION ─────────────────────────────────────────────────────
    if (data.type === 'NEW_NOTIFICATION') {
      fetchNotifications();
    }
  }, [
    addLog, fetchNotifications, joinCompletedRef, lastNearbyUsersTsRef, lastPositionKeyRef,
    myUserIdRef, onStatusSync, positionRef, searchTagRef, selectedUserRef, sendJoinPayload,
    setGalleryActive, setGalleryImages, setGalleryTitle, setLocalMyStatus, setMyDisplayName,
    setMyObfPos, setMyUserId, setNearbyUsers, setSelectedUser, setStatusInput, userRef,
  ]);
}
