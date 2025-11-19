"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface DisabledActivitiesContextType {
  disabledActivities: Set<number>;
  toggleActivity: (activityId: number) => void;
  isActivityDisabled: (activityId: number) => boolean;
}

const DisabledActivitiesContext = createContext<DisabledActivitiesContextType | undefined>(undefined);

const STORAGE_KEY = 'disabled_activities';

export function DisabledActivitiesProvider({ children }: { children: ReactNode }) {
  const [disabledActivities, setDisabledActivities] = useState<Set<number>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as number[];
        setDisabledActivities(new Set(ids));
      }
    } catch (error) {
      console.error('Failed to load disabled activities:', error);
    }
  }, []);

  const toggleActivity = (activityId: number) => {
    setDisabledActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      
      return newSet;
    });
  };

  const isActivityDisabled = (activityId: number) => {
    return disabledActivities.has(activityId);
  };

  return (
    <DisabledActivitiesContext.Provider value={{ disabledActivities, toggleActivity, isActivityDisabled }}>
      {children}
    </DisabledActivitiesContext.Provider>
  );
}

export function useDisabledActivities() {
  const context = useContext(DisabledActivitiesContext);
  if (!context) {
    throw new Error('useDisabledActivities must be used within DisabledActivitiesProvider');
  }
  return context;
}
