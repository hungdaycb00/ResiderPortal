import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getWeatherInfo } from '../constants';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

function readCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }
        return data as T;
    } catch { return null; }
}

function writeCache(key: string, data: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded, silently ignore */ }
}

export interface WeatherData {
  temp: number;
  desc: string;
  icon: string;
  humidity?: number;
  feelsLike?: number;
}

export function useGeolocation() {
  const defaultPosition: [number, number] = [10.762622, 106.660172];
  const hasLocationConsent = typeof window !== 'undefined'
    ? localStorage.getItem('alin_location_consent_handled') === 'true'
    : false;
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [myObfPos, setMyObfPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(!hasLocationConsent);
  const [currentProvince, setCurrentProvince] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Tự động lấy GPS khi mount — không cần user tương tác
  // Nếu browser đã có permission (từ lần trước), getCurrentPosition sẽ thành công ngay
  const fetchProvinceName = useCallback(async (lat: number, lng: number) => {
    const cacheKey = `alin_province_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    const cached = readCache<string>(cacheKey);
    if (cached) { setCurrentProvince(cached); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
      const data = await res.json();
      const province = data.address?.province || data.address?.city || data.address?.state || 'Unknown Location';
      setCurrentProvince(province);
      writeCache(cacheKey, province);
    } catch (e) {
      console.error('Geocoding error:', e);
    }
  }, []);

  useEffect(() => {
    if (myObfPos) fetchProvinceName(myObfPos.lat, myObfPos.lng);
  }, [myObfPos?.lat, myObfPos?.lng, fetchProvinceName]);

  const requestLocation = useCallback((forceInvisible: boolean = false, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => {
    localStorage.setItem('alin_location_consent_handled', 'true');
    const updateVisibility = (visible: boolean) => {
      setIsVisibleOnMap?.(visible);
      if (wsRef?.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible } }));
      }
    };

    if (forceInvisible) {
      updateVisibility(false);
    }
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          localStorage.setItem('alin_last_position', JSON.stringify([latitude, longitude]));
          if (!forceInvisible) updateVisibility(true);
          setIsConsentOpen(false);
        },
        (err) => {
          console.error("Geolocation error:", err);
          if (!forceInvisible) updateVisibility(false);
          const lastPos = localStorage.getItem('alin_last_position');
          if (lastPos) {
            try { setPosition(JSON.parse(lastPos)); } catch (e) { setPosition([10.762622, 106.660172]); }
          } else {
            setPosition([10.762622, 106.660172]); // Fallback to HCM City
          }
          setIsConsentOpen(false);
        }
      );
    } else {
      const lastPos = localStorage.getItem('alin_last_position');
      if (lastPos) {
        try { setPosition(JSON.parse(lastPos)); } catch (e) { setPosition([10.762622, 106.660172]); }
      } else {
        setPosition([10.762622, 106.660172]);
      }
      if (!forceInvisible) updateVisibility(false);
      setIsConsentOpen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const consentHandled = localStorage.getItem('alin_location_consent_handled') === 'true';
    if (!consentHandled) {
      setIsConsentOpen(true);
      return;
    }

    // User đã cho phép từ trước, lấy GPS thật ngay để tránh map mở ở vị trí stale.
    const savedVisible = localStorage.getItem('alinmap_visible');
    requestLocation(savedVisible === 'false');
  }, [requestLocation]);

  // Fetch Weather Data (cached, deferred to avoid blocking critical path)
  const weatherFetchedRef = useRef(false);
  useEffect(() => {
    if (!myObfPos) return;
    const cacheKey = `alin_weather_${myObfPos.lat.toFixed(2)}_${myObfPos.lng.toFixed(2)}`;
    const cached = readCache<WeatherData>(cacheKey);
    if (cached) { setWeatherData(cached); return; }
    if (weatherFetchedRef.current) return;
    weatherFetchedRef.current = true;
    const timer = setTimeout(() => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${myObfPos.lat}&longitude=${myObfPos.lng}&current_weather=true&current=relative_humidity_2m,apparent_temperature`)
        .then(res => res.json())
        .then(data => {
          if (data.current_weather) {
            const { icon, desc } = getWeatherInfo(data.current_weather.weathercode);
            const wd: WeatherData = {
              temp: data.current_weather.temperature,
              desc,
              icon,
              humidity: data.current?.relative_humidity_2m,
              feelsLike: data.current?.apparent_temperature,
            };
            setWeatherData(wd);
            writeCache(cacheKey, wd);
          }
        }).catch(err => console.error('Weather fetch error:', err));
    }, 3000);
    return () => clearTimeout(timer);
  }, [myObfPos?.lat, myObfPos?.lng]);

  return React.useMemo(() => ({
    position, setPosition,
    myObfPos, setMyObfPos,
    isConsentOpen, setIsConsentOpen,
    currentProvince,
    weatherData,
    requestLocation,
  }), [position, myObfPos, isConsentOpen, currentProvince, weatherData, requestLocation]);
}
