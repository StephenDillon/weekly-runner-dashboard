"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface HeartRateZone {
  zone: number;
  name: string;
  minPercent: number;
  maxPercent: number;
  purpose: string;
}

interface HeartRateZonesContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  maxHeartRate: number;
  setMaxHeartRate: (maxHR: number) => void;
  zones: HeartRateZone[];
  setZones: (zones: HeartRateZone[]) => void;
  getZoneForHeartRate: (hr: number) => number | null;
  isMaxHRUserSet: boolean;
  setIsMaxHRUserSet: (isSet: boolean) => void;
}

const HeartRateZonesContext = createContext<HeartRateZonesContextType | undefined>(undefined);

const DEFAULT_ZONES: HeartRateZone[] = [
  { zone: 1, name: 'Recovery', minPercent: 0, maxPercent: 70, purpose: 'Warm-up, cool-down, and active recovery.' },
  { zone: 2, name: 'Aerobic Base', minPercent: 70, maxPercent: 80, purpose: 'THE "EASY" ZONE. Builds endurance and fat burning.' },
  { zone: 3, name: 'Aerobic Power', minPercent: 80, maxPercent: 87, purpose: '"Gray Zone." Harder than easy, easier than hard. Avoid for now.' },
  { zone: 4, name: 'Threshold', minPercent: 87, maxPercent: 95, purpose: 'THE "HARD" ZONE. 10k/Half Marathon race pace efforts.' },
  { zone: 5, name: 'VO2 Max', minPercent: 95, maxPercent: 100, purpose: 'All-out sprints and short intervals (1-4 mins).' },
];

export function HeartRateZonesProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [maxHeartRate, setMaxHeartRate] = useState(187); // Default from table
  const [zones, setZones] = useState<HeartRateZone[]>(DEFAULT_ZONES);
  const [isMaxHRUserSet, setIsMaxHRUserSet] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedEnabled = localStorage.getItem('hr_zones_enabled');
    const storedMaxHR = localStorage.getItem('hr_zones_max_hr');
    const storedZones = localStorage.getItem('hr_zones_zones');
    const storedUserSet = localStorage.getItem('hr_zones_user_set');

    if (storedEnabled !== null) {
      setEnabled(storedEnabled === 'true');
    }
    if (storedMaxHR !== null) {
      setMaxHeartRate(parseInt(storedMaxHR, 10));
    }
    if (storedZones !== null) {
      try {
        setZones(JSON.parse(storedZones));
      } catch (e) {
        console.error('Failed to parse stored HR zones:', e);
      }
    }
    if (storedUserSet !== null) {
      setIsMaxHRUserSet(storedUserSet === 'true');
    }
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('hr_zones_enabled', enabled.toString());
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem('hr_zones_max_hr', maxHeartRate.toString());
  }, [maxHeartRate]);

  useEffect(() => {
    localStorage.setItem('hr_zones_zones', JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem('hr_zones_user_set', isMaxHRUserSet.toString());
  }, [isMaxHRUserSet]);

  const getZoneForHeartRate = (hr: number): number | null => {
    if (!enabled || hr <= 0) return null;
    
    for (const zone of zones) {
      const minHR = (zone.minPercent / 100) * maxHeartRate;
      const maxHR = (zone.maxPercent / 100) * maxHeartRate;
      if (hr >= minHR && hr <= maxHR) {
        return zone.zone;
      }
    }
    
    // If above all zones, return highest zone
    if (hr > (zones[zones.length - 1].maxPercent / 100) * maxHeartRate) {
      return zones[zones.length - 1].zone;
    }
    
    return null;
  };

  return (
    <HeartRateZonesContext.Provider
      value={{
        enabled,
        setEnabled,
        maxHeartRate,
        setMaxHeartRate,
        zones,
        setZones,
        getZoneForHeartRate,
        isMaxHRUserSet,
        setIsMaxHRUserSet,
      }}
    >
      {children}
    </HeartRateZonesContext.Provider>
  );
}

export function useHeartRateZones() {
  const context = useContext(HeartRateZonesContext);
  if (!context) {
    throw new Error('useHeartRateZones must be used within HeartRateZonesProvider');
  }
  return context;
}
