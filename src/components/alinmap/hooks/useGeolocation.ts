import React, { useState, useEffect } from 'react';
import { getWeatherInfo } from '../constants';

export interface WeatherData {
  temp: number;
  desc: string;
  icon: string;
  humidity?: number;
  feelsLike?: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [myObfPos, setMyObfPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(() => !localStorage.getItem('alin_location_consent_handled'));
  const [currentProvince, setCurrentProvince] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const fetchProvinceName = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
      const data = await res.json();
      const province = data.address?.province || data.address?.city || data.address?.state || 'Unknown Location';
      setCurrentProvince(province);
    } catch (e) {
      console.error('Geocoding error:', e);
    }
  };

  useEffect(() => {
    if (myObfPos) fetchProvinceName(myObfPos.lat, myObfPos.lng);
  }, [myObfPos?.lat, myObfPos?.lng]);

  const requestLocation = (forceInvisible: boolean = false, wsRef?: React.MutableRefObject<WebSocket | null>, setIsVisibleOnMap?: (v: boolean) => void) => {
    localStorage.setItem('alin_location_consent_handled', 'true');
    if (forceInvisible && setIsVisibleOnMap) {
      setIsVisibleOnMap(false);
      if (wsRef?.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'UPDATE_PROFILE', payload: { visible: false } }));
      }
    }
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          localStorage.setItem('alin_last_position', JSON.stringify([latitude, longitude]));
          setIsConsentOpen(false);
        },
        (err) => {
          console.error("Geolocation error:", err);
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
      setIsConsentOpen(false);
    }
  };

  // Auto-init
  useEffect(() => {
    if (!position) {
      const hasConsented = localStorage.getItem('alin_location_consent_handled');
      if (hasConsented === 'true') { requestLocation(); }
      else if (!isConsentOpen) { setIsConsentOpen(true); }
    }
  }, [position]);

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
  }, [myObfPos]);

  return {
    position, setPosition,
    myObfPos, setMyObfPos,
    isConsentOpen, setIsConsentOpen,
    currentProvince,
    weatherData,
    requestLocation,
  };
}
