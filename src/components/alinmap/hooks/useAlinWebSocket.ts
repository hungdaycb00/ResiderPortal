import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MotionValue } from 'framer-motion';
import {
  buildMapMoveFromPan,
  buildMapMovePayload,
  buildPositionKey,
  buildWsUrl,
  createJoinPayload,
  getReconnectDelay,
  normalizeNearbyUsers,
  parseWsMessage,
} from './alinWebSocketUtils';

interface UseAlinWebSocketParams {
  position: [number, number] | null;
  myObfPos: { lat: number; lng: number } | null;
  setMyObfPos: (pos: { lat: number; lng: number }) => void;
  radius: number;
  searchTag: string;
  myStatus: string;
  isVisibleOnMap: boolean;
  user: any;
  externalApi: any;
  currentProvince: string | null;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  planeYScale?: MotionValue<number>;
  fetchNotifications: () => void;
  onStatusSync?: (status: string) => void;
}

export function useAlinWebSocket({
  position,
  myObfPos,
  setMyObfPos,
  radius,
  searchTag,
  myStatus,
  isVisibleOnMap,
  user,
  externalApi,
  currentProvince,
  panX,
  panY,
  planeYScale,
  fetchNotifications,
  onStatusSync,
}: UseAlinWebSocketParams) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState('IDLE');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const myUserIdRef = useRef<string | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const selectedUserRef = useRef<any | null>(null);
  const searchTagRef = useRef(searchTag);
  const [myDisplayName, setMyDisplayName] = useState(user?.displayName || 'YOU');
  const [myAvatarUrl, setMyAvatarUrl] = useState(user?.photoURL || '');
  const [localMyStatus, setLocalMyStatus] = useState(myStatus);
  const [statusInput, setStatusInput] = useState('');

  // Gallery/Billboard state (derived from starred post)
  const [galleryActive, setGalleryActive] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectEnabled = useRef(false);
  const isMounted = useRef(true);
  const isConnectingRef = useRef(false);
  const hasOpenedOnceRef = useRef(false);
  const joinCompletedRef = useRef(false);
  const pendingJoinRef = useRef(false);
  const lastPositionKeyRef = useRef('');
  const reconnectAttemptsRef = useRef(0);

  const positionRef = useRef(position);
  const myObfPosRef = useRef(myObfPos);
  const radiusRef = useRef(radius);
  const myStatusRef = useRef(myStatus);
  const isVisibleOnMapRef = useRef(isVisibleOnMap);
  const userRef = useRef(user);
  const currentProvinceRef = useRef(currentProvince);
  const externalApiRef = useRef(externalApi);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => { searchTagRef.current = searchTag; }, [searchTag]);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { positionRef.current = position; }, [position?.[0], position?.[1]]);
  useEffect(() => { myObfPosRef.current = myObfPos; }, [myObfPos?.lat, myObfPos?.lng]);
  useEffect(() => { radiusRef.current = radius; }, [radius]);
  useEffect(() => { myStatusRef.current = myStatus; }, [myStatus]);
  useEffect(() => { isVisibleOnMapRef.current = isVisibleOnMap; }, [isVisibleOnMap]);
  useEffect(() => { userRef.current = user; }, [user?.uid, user?.displayName, user?.photoURL]);
  useEffect(() => { currentProvinceRef.current = currentProvince; }, [currentProvince]);
  useEffect(() => { externalApiRef.current = externalApi; }, [externalApi]);
  useEffect(() => { isConnectingRef.current = isConnecting; }, [isConnecting]);
  useEffect(() => {
    if (user?.displayName) setMyDisplayName(user.displayName);
  }, [user?.displayName]);
  useEffect(() => {
    if (user?.photoURL !== undefined) setMyAvatarUrl(user.photoURL || '');
  }, [user?.photoURL]);
  useEffect(() => {
    setLocalMyStatus(myStatus);
    setStatusInput(myStatus);
    localStorage.setItem('alinmap_status', myStatus || '');
    if (ws.current && ws.current.readyState === WebSocket.OPEN && user && myStatus?.trim()) {
      ws.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { status: myStatus } }));
    }
  }, [myStatus, user]);

  // Heartbeat PING
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 45000);
    return () => clearInterval(pingInterval);
  }, []);

  const hasPosition = Array.isArray(position) && position.length >= 2;

  const addLog = useCallback((msg: string) => {
    console.log('[Alin]', msg);
    setDebugLog(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const sendJoinPayload = useCallback((socket: WebSocket) => {
    const currentPosition = positionRef.current;
    if (!Array.isArray(currentPosition) || currentPosition.length < 2) return false;

    const currentUser = userRef.current;
    const deviceId = externalApiRef.current.getDeviceId();

    socket.send(JSON.stringify(createJoinPayload({
      currentUser,
      currentPosition,
      radius: radiusRef.current,
      status: myStatusRef.current,
      visible: isVisibleOnMapRef.current,
      province: currentProvinceRef.current || '',
      deviceId,
    })));

    lastPositionKeyRef.current = buildPositionKey(currentPosition);
    pendingJoinRef.current = false;
    return true;
  }, [buildPositionKey]);

  const connectWS = useCallback(() => {
    const currentPosition = positionRef.current;
    if (!Array.isArray(currentPosition) || currentPosition.length < 2) return;
    if (isConnectingRef.current) return;
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = buildWsUrl();
    if (!wsUrl) {
      setWsStatus('DISABLED');
      return;
    }

    reconnectEnabled.current = true;
    hasOpenedOnceRef.current = false;
    joinCompletedRef.current = false;
    pendingJoinRef.current = false;
    setIsConnecting(true);
    isConnectingRef.current = true;
    addLog(`Connecting to ${wsUrl}...`);
    setWsStatus('CONNECTING');

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e: any) {
      addLog(`WebSocket create failed: ${e?.message || 'unknown error'}`);
      setWsStatus('ERROR');
      setIsConnecting(false);
      isConnectingRef.current = false;
      reconnectEnabled.current = false;
      return;
    }
    ws.current = socket;

    socket.onopen = () => {
      if (!isMounted.current) {
        socket.close();
        return;
      }

      reconnectAttemptsRef.current = 0;
      hasOpenedOnceRef.current = true;
      addLog('Connected, sending join payload...');
      setIsConnecting(false);
      isConnectingRef.current = false;
      setWsStatus('OPEN');

      const joined = sendJoinPayload(socket);
      if (!joined) {
        pendingJoinRef.current = true;
        addLog('WebSocket open but no GPS, waiting...');
      } else {
        addLog(`Sent GPS: ${currentPosition[0].toFixed(4)}, ${currentPosition[1].toFixed(4)}`);
      }
    };

    socket.onmessage = (event) => {
      const data = parseWsMessage(event.data);
      if (!data?.type) {
        addLog('Ignored malformed WebSocket message');
        return;
      }
      addLog(`Received: ${data.type}`);

      if (data.type === 'JOIN_SUCCESS') {
        const p = data.payload || {};
        joinCompletedRef.current = true;
        addLog(`My obf pos: ${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)} (user: ${p.username})`);

        // Always sync myObfPos on join success to keep the coordinate system origin near the player
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

      if (data.type === 'NEARBY_USERS') {
        const currentMyUserId = myUserIdRef.current;
        const currentSearchTag = searchTagRef.current;
        const currentSelectedUser = selectedUserRef.current;
        const { users, filtered } = normalizeNearbyUsers({
          payload: data.payload,
          currentMyUserId,
          currentSearchTag,
        });

        setNearbyUsers(filtered);
        if (currentSelectedUser && !currentSelectedUser.isSelf) {
          const updated = users.find((u: any) => u.id === currentSelectedUser.id);
          if (updated) setSelectedUser(updated);
        }
      }

      if (data.type === 'NEW_NOTIFICATION') {
        fetchNotifications();
      }
    };

    socket.onclose = () => {
      ws.current = null;
      setIsConnecting(false);
      isConnectingRef.current = false;

      if (!isMounted.current || !reconnectEnabled.current) return;

      if (!hasOpenedOnceRef.current) {
        addLog('Initial WebSocket connect failed; retry paused.');
        setWsStatus('ERROR');
        reconnectEnabled.current = false;
        return;
      }

      const attempt = reconnectAttemptsRef.current;
      const delay = getReconnectDelay(attempt);
      reconnectAttemptsRef.current += 1;

      addLog(`Disconnected, retrying in ${(delay / 1000).toFixed(1)}s...`);
      setWsStatus('CLOSED');
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(() => {
        if (isMounted.current) connectWSRef.current();
      }, delay);
    };

    socket.onerror = () => {
      setIsConnecting(false);
      isConnectingRef.current = false;

      if (!hasOpenedOnceRef.current) {
        addLog('Initial WebSocket error; retry paused.');
        reconnectEnabled.current = false;
      } else {
        addLog('WebSocket error.');
      }

      setWsStatus('ERROR');
    };
  }, [addLog, sendJoinPayload]);

  const connectWSRef = useRef(connectWS);
  useEffect(() => {
    connectWSRef.current = connectWS;
  }, [connectWS]);

  useEffect(() => {
    if (!hasPosition) return;

    connectWS();
    return () => {
      reconnectEnabled.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        ws.current.close();
      }
    };
  }, [connectWS, hasPosition, user?.uid]);

  // Sync avatar/displayName/province.
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && userRef.current) {
      ws.current.send(JSON.stringify({
        type: 'UPDATE_PROFILE',
        payload: {
          avatar_url: userRef.current.photoURL || '',
          displayName: userRef.current.displayName || myDisplayName,
          province: currentProvinceRef.current || '',
        },
      }));
    }
  }, [user?.photoURL, user?.displayName, currentProvince, myDisplayName]);

  // Push coordinate updates without reconnecting the socket.
  useEffect(() => {
    const socket = ws.current;
    const currentPosition = positionRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (!Array.isArray(currentPosition) || currentPosition.length < 2) return;

    if (!joinCompletedRef.current) {
      if (pendingJoinRef.current) {
        const joined = sendJoinPayload(socket);
        if (!joined) return;
      } else {
        return;
      }
      return;
    }

    const positionKey = buildPositionKey(currentPosition);
    if (!positionKey || positionKey === lastPositionKeyRef.current) return;
    lastPositionKeyRef.current = positionKey;

    socket.send(JSON.stringify({
      type: 'MAP_MOVE',
      payload: { lat: currentPosition[0], lng: currentPosition[1], zoom: 13 },
    }));
    addLog(`Updated GPS: ${currentPosition[0].toFixed(4)}, ${currentPosition[1].toFixed(4)}`);
  }, [addLog, buildPositionKey, position?.[0], position?.[1], sendJoinPayload]);

  const handleRefresh = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
      setIsConnecting(true);
      const scan = buildMapMoveFromPan({
        myObfPos,
        panX: panX?.get?.() ?? 0,
        panY: panY?.get?.() ?? 0,
        planeYScale: planeYScale?.get?.() ?? 1,
      });
      ws.current.send(JSON.stringify(buildMapMovePayload(scan.lat, scan.lng)));
      setTimeout(() => setIsConnecting(false), 1000);
    }
  }, [myObfPos, panX, panY, planeYScale]);

  return React.useMemo(() => ({
    ws,
    isConnecting,
    wsStatus,
    isVisibleOnMap: isVisibleOnMapRef.current,
    myUserId,
    addLog,
    nearbyUsers,
    setNearbyUsers,
    selectedUser,
    setSelectedUser,
    myDisplayName,
    setMyDisplayName,
    myAvatarUrl,
    setMyAvatarUrl,
    myStatus: localMyStatus,
    setMyStatus: setLocalMyStatus,
    statusInput,
    setStatusInput,
    galleryActive,
    setGalleryActive,
    galleryTitle,
    setGalleryTitle,
    galleryImages,
    setGalleryImages,
    handleRefresh,
  }), [
    isConnecting, wsStatus, myUserId, addLog, nearbyUsers, selectedUser, myDisplayName, 
    myAvatarUrl, localMyStatus, statusInput, galleryActive, galleryTitle, galleryImages, handleRefresh
  ]);
}
