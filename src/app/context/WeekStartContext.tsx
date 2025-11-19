"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type WeekStartDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export const DAYS_OF_WEEK: WeekStartDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeekStartContextType {
  weekStartDay: WeekStartDay;
  setWeekStartDay: (day: WeekStartDay) => void;
}

const WeekStartContext = createContext<WeekStartContextType | undefined>(undefined);

export function WeekStartProvider({ children }: { children: ReactNode }) {
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>('Sunday');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('week_start_day');
    if (stored && DAYS_OF_WEEK.includes(stored as WeekStartDay)) {
      setWeekStartDayState(stored as WeekStartDay);
    }
  }, []);

  const setWeekStartDay = (day: WeekStartDay) => {
    setWeekStartDayState(day);
    localStorage.setItem('week_start_day', day);
  };

  return (
    <WeekStartContext.Provider value={{ weekStartDay, setWeekStartDay }}>
      {children}
    </WeekStartContext.Provider>
  );
}

export function useWeekStart() {
  const context = useContext(WeekStartContext);
  if (!context) {
    throw new Error('useWeekStart must be used within WeekStartProvider');
  }
  return context;
}
