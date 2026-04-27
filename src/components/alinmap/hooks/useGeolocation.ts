import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getWeatherInfo } from '../constants';

export interface WeatherData {
  temp: number;
  desc: string;
  icon: string;
  humidity?: number;
  feelsLike?: number;
}

export function useGeolocation() {
  const defaultPosition: [number, number] = [10.762622, 106.660172];
  const [position, setPosition] = useState<[number, number] | null>(() => {
    const lastPos = localStorage.getItem('alin_last_position');
    if (lastPos) {
      try {
        const parsed = JSON.parse(lastPos);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      } catch (e) {}
    }
    return defaultPosition;
  });
  const [myObfPos, setMyObfPos] = useState<{ lat: number; lng: number } | null>(() => {
    const lastPos = localStorage.getItem('alin_last_position');
    if (lastPos) {
      try {
        const parsed = JSON.parse(lastPos);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return { lat: parsed[0], lng: parsed[1] };
        }
      } catch (e) {}
    }
    return { lat: defaultPosition[0], lng: defaultPosition[1] };
  });
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [currentProvince, setCurrentProvince] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const fetchProvinceName = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
      const data = await res.json();
      const province = data.address?.province || data.address?.city || data.address?.state || 'Unknown Location';
      setCurrentProvince(province);
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

  // Fetch Weather Data (temp, humidity, feels-like)
  useEffect(() => {
    if (myObfPos) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${myObfPos.lat}&longitude=${myObfPos.lng}&current_weather=true&current=relative_humidity_2m,apparent_temperature`)
        .then(res => res.json())
        .then(data => {
          if (data.current_weather) {
            const { icon, desc } = getWeatherInfo(data.current_weather.weathercode);
            setWeatherData({
              temp: data.current_weather.temperature,
              desc,
              icon,
              humidity: data.current?.relative_humidity_2m,
              feelsLike: data.current?.apparent_temperature,
            });
          }
        }).catch(err => console.error('Weather fetch error:', err));
    }
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
