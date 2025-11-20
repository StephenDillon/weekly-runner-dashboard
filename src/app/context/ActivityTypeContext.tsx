"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type ActivityType = 'running' | 'cycling';

interface ActivityTypeContextType {
  activityType: ActivityType;
  setActivityType: (type: ActivityType) => void;
}

const ActivityTypeContext = createContext<ActivityTypeContextType | undefined>(undefined);

export function ActivityTypeProvider({ children }: { children: ReactNode }) {
  const [activityType, setActivityTypeState] = useState<ActivityType>('running');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activity_type');
    if (stored === 'running' || stored === 'cycling') {
      setActivityTypeState(stored);
    }
  }, []);

  const setActivityType = (type: ActivityType) => {
    setActivityTypeState(type);
    localStorage.setItem('activity_type', type);
  };

  return (
    <ActivityTypeContext.Provider value={{ activityType, setActivityType }}>
      {children}
    </ActivityTypeContext.Provider>
  );
}

export function useActivityType() {
  const context = useContext(ActivityTypeContext);
  if (!context) {
    throw new Error('useActivityType must be used within ActivityTypeProvider');
  }
  return context;
}
