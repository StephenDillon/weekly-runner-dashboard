"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type WeekStartDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export const DAYS_OF_WEEK: WeekStartDay[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeekStartContextType {
  weekStartDay: WeekStartDay;
  setWeekStartDay: (day: WeekStartDay) => void;
  weeksToDisplay: number;
  setWeeksToDisplay: (weeks: number) => void;
}

const WeekStartContext = createContext<WeekStartContextType | undefined>(undefined);

export function WeekStartProvider({ children }: { children: ReactNode }) {
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>('Monday');
  const [weeksToDisplay, setWeeksToDisplayState] = useState<number>(8);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('week_start_day');
    if (stored && DAYS_OF_WEEK.includes(stored as WeekStartDay)) {
      setWeekStartDayState(stored as WeekStartDay);
    }

    const storedWeeks = localStorage.getItem('weeks_to_display');
    if (storedWeeks) {
      const weeks = parseInt(storedWeeks, 10);
      if (!isNaN(weeks) && weeks >= 1 && weeks <= 52) {
        setWeeksToDisplayState(weeks);
      }
    }
  }, []);

  const setWeekStartDay = (day: WeekStartDay) => {
    setWeekStartDayState(day);
    localStorage.setItem('week_start_day', day);
  };

  const setWeeksToDisplay = (weeks: number) => {
    if (weeks >= 1 && weeks <= 52) {
      setWeeksToDisplayState(weeks);
      localStorage.setItem('weeks_to_display', weeks.toString());
    }
  };

  return (
    <WeekStartContext.Provider value={{ weekStartDay, setWeekStartDay, weeksToDisplay, setWeeksToDisplay }}>
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
