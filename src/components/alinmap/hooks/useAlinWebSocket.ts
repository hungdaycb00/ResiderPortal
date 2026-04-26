import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MotionValue } from 'framer-motion';
import { DEGREES_TO_PX } from '../constants';

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
  fetchNotifications: () => void;
}

export function useAlinWebSocket({
  position, myObfPos, setMyObfPos, radius, searchTag,
  myStatus, isVisibleOnMap, user, externalApi, currentProvince,
  panX, panY, fetchNotifications,
}: UseAlinWebSocketParams) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState('IDLE');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
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
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const addLog = useCallback((msg: string) => {
    console.log('[Alin]', msg);
    setDebugLog(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const connectWS = useCallback(() => {
    if (!user || !position || isConnecting) return;
    setIsConnecting(true);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const wsUrl = hostname === 'localhost'
      ? `${protocol}//${hostname}:2096`
      : `wss://alin-social.alin.city`;
    addLog(`Connecting to ${wsUrl}...`);
    setWsStatus('CONNECTING');

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e: any) {
      addLog(`❌ WebSocket create failed: ${e.message}`);
      setWsStatus('ERROR');
      setIsConnecting(false);
      return;
    }
    ws.current = socket;

    socket.onopen = () => {
      if (!isMounted.current) { socket.close(); return; }
      addLog(`✅ Connected! Sending USER_JOIN...`);
      setIsConnecting(false);
      setWsStatus('OPEN');
      const deviceId = externalApi.getDeviceId();
      socket.send(JSON.stringify({
        type: 'USER_JOIN',
        payload: {
          deviceId,
          lat: position[0],
          lng: position[1],
          radiusKm: radius,
          status: myStatus,
          visible: isVisibleOnMap,
          avatar_url: user?.photoURL || '',
          province: currentProvince || ''
        }
      }));
      addLog(`📍 Sent GPS: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog(`📨 Received: ${data.type}`);

      if (data.type === 'JOIN_SUCCESS') {
        const p = data.payload;
        addLog(`🎯 My obf pos: ${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)} (user: ${p.username})`);
        setMyObfPos({ lat: p.lat, lng: p.lng });
        setMyUserId(p.userId);
        if (p.username) setMyDisplayName(p.username);
        if (p.status) { setLocalMyStatus(p.status); setStatusInput(p.status); }
        if (p.gallery) {
          setGalleryTitle(p.gallery.title || '');
          setGalleryImages(p.gallery.images || []);
          setGalleryActive(p.gallery.active || false);
        }
        socket.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: p.lat, lng: p.lng, zoom: 13 } }));
        addLog(`🔍 Sent MAP_MOVE scan`);
      }
      if (data.type === 'NEARBY_USERS') {
        const users = data.payload.map((u: any) => ({ ...u, isSelf: u.id === myUserId }));
        let filtered = users.filter((u: any) => !u.isSelf);
        if (searchTag.trim()) {
          const tag = searchTag.toLowerCase().replace('#', '');
          filtered = filtered.filter((u: any) =>
            (u.gallery?.title && u.gallery.title.toLowerCase().includes(tag)) ||
            (u.username && u.username.toLowerCase().includes(tag)) ||
            (u.status && u.status.toLowerCase().includes(tag))
          );
        }
        setNearbyUsers(filtered);
        if (selectedUser && !selectedUser.isSelf) {
          const updated = users.find((u: any) => u.id === selectedUser.id);
          if (updated) setSelectedUser(updated);
        }
      }
      if (data.type === 'NEW_NOTIFICATION') {
        fetchNotifications();
      }
    };

    socket.onclose = () => {
      if (!isMounted.current) return;
      addLog('🔌 Disconnected, retrying in 3s...');
      setIsConnecting(false);
      setWsStatus('CLOSED');
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(() => { if (isMounted.current) connectWS(); }, 3000);
    };

    socket.onerror = (e) => {
      addLog(`❌ WebSocket error (CSP blocked?)`);
      setIsConnecting(false);
      setWsStatus('ERROR');
    };
  }, [position, radius, searchTag, isConnecting, user]);

  useEffect(() => {
    connectWS();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, [position, user]);

  // Sync avatar/displayName/province
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && user) {
      ws.current.send(JSON.stringify({
        type: 'UPDATE_PROFILE',
        payload: { avatar_url: user.photoURL || '', displayName: user.displayName || myDisplayName, province: currentProvince || '' }
      }));
    }
  }, [user?.photoURL, user?.displayName, currentProvince]);

  const handleRefresh = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && myObfPos) {
      setIsConnecting(true);
      const scanLng = myObfPos.lng + (-panX.get() / DEGREES_TO_PX);
      const scanLat = myObfPos.lat + (panY.get() / DEGREES_TO_PX);
      ws.current.send(JSON.stringify({ type: 'MAP_MOVE', payload: { lat: scanLat, lng: scanLng, zoom: 13 } }));
      setTimeout(() => setIsConnecting(false), 1000);
    }
  }, [myObfPos, panX, panY]);

  return {
    ws, isConnecting, wsStatus, myUserId, addLog,
    nearbyUsers, setNearbyUsers,
    selectedUser, setSelectedUser,
    myDisplayName, setMyDisplayName,
    myAvatarUrl, setMyAvatarUrl,
    myStatus: localMyStatus, setMyStatus: setLocalMyStatus,
    statusInput, setStatusInput,
    galleryActive, setGalleryActive,
    galleryTitle, setGalleryTitle,
    galleryImages, setGalleryImages,
    handleRefresh,
  };
}
