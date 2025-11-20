"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { useActivityType } from '../context/ActivityTypeContext';
import { StravaActivity } from '../types/strava';
import ActivityTooltipItem from './ActivityTooltipItem';
import WeekActivitiesTooltip from './WeekActivitiesTooltip';

interface WeekData {
  week: string;
  weekTooltip: string;
  distance: number;
}

interface LongestDistanceChartProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

export default function LongestDistanceChart({ endDate, unit }: LongestDistanceChartProps) {
  const { weekStartDay, weeksToDisplay } = useWeekStart();
  const { disabledActivities, toggleActivity, isActivityDisabled } = useDisabledActivities();
  const { activityType } = useActivityType();
  const weeks = getWeeksBack(weeksToDisplay, endDate);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [lockedWeek, setLockedWeek] = useState<number | null>(null);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleWeek = (index: number) => {
    if (lockedWeek === index) {
      setLockedWeek(null);
    } else {
      setLockedWeek(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (lockedWeek === null) {
      setHoveredWeek(index);
    }
  };

  const handleMouseLeave = () => {
    if (lockedWeek === null) {
      setHoveredWeek(null);
    }
  };

  const isOpen = (index: number) => {
    return lockedWeek === index || (lockedWeek === null && hoveredWeek === index);
  };
  
  const startDate = useMemo(() => {
    const start = new Date(weeks[0]);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weeks]);

  const apiEndDate = useMemo(() => {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [endDate]);

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate);

  const weeklyLongestRuns = useMemo(() => {
    const weekStarts = generateWeekStarts(endDate, weeksToDisplay);
    
    return weekStarts.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= weekStart && activityDate < weekEnd;
      });

      const enabledActivities = weekActivities.filter(
        (activity) => !disabledActivities.has(activity.id)
      );

      const longestRun = enabledActivities.reduce<StravaActivity | null>((longest, activity) => {
        if (!longest || activity.distance > longest.distance) {
          return activity;
        }
        return longest;
      }, null);

      return {
        weekStart,
        allActivities: weekActivities,
        longestRun,
        longestDistance: longestRun ? metersToMiles(longestRun.distance) : 0,
      };
    });
  }, [activities, endDate, disabledActivities, weeksToDisplay]);

  const convertedData = useMemo(() => {
    return weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      weekTooltip: formatWeekTooltip(date, weekStartDay),
      distance: unit === 'kilometers' 
        ? milesToKm(weeklyLongestRuns[index]?.longestDistance || 0)
        : (weeklyLongestRuns[index]?.longestDistance || 0)
    }));
  }, [weeks, weeklyLongestRuns, unit, weekStartDay]);
  
  const maxDistance = Math.max(...convertedData.map(d => d.distance), 1);
  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const unitLabelLong = unit === 'kilometers' ? 'kilometers' : 'miles';
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Longest Run</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Longest Run</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 dark:text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  const totalLongest = convertedData.reduce((sum, d) => sum + d.distance, 0);
  const weeksWithActivities = convertedData.filter(d => d.distance > 0);
  const avgLongest = weeksWithActivities.length > 0 
    ? weeksWithActivities.reduce((sum, d) => sum + d.distance, 0) / weeksWithActivities.length
    : 0;
  const maxLongest = Math.max(...convertedData.map(d => d.distance));
  const activityLabel = activityType === 'running' ? 'Run' : 'Ride';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-1 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Longest {activityLabel}</h2>
        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 italic">Tap bar to view activities</span>
      </div>
      <div className="space-y-2 sm:space-y-3 flex-1" style={{ minHeight: '250px' }}>
          {convertedData.map((data, index) => {
            const open = isOpen(index);
            const weekActivities = weeklyLongestRuns[index]?.allActivities || [];
            
            return (
              <div key={index} className="flex items-center gap-2 sm:gap-3 relative">
                <div className="w-12 sm:w-20 text-[10px] sm:text-sm font-medium text-gray-600 dark:text-gray-300 cursor-help" title={data.weekTooltip}>
                  {data.week}
                </div>
                <div 
                  ref={(el) => { barRefs.current[index] = el; }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 sm:h-8 relative overflow-visible"
                  onClick={() => toggleWeek(index)}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    className="bg-linear-to-r from-blue-500 to-indigo-600 h-full rounded-full flex items-center justify-end pr-2 sm:pr-3 transition-all duration-500 cursor-pointer hover:opacity-90"
                    style={{ width: `${(data.distance / maxDistance) * 100}%` }}
                  >
                    <span className="text-white text-xs sm:text-sm font-semibold">
                      {data.distance.toFixed(1)} {unitLabel}
                    </span>
                  </div>
                
                {open && weekActivities.length > 0 && (
                  <div ref={(el) => { tooltipRefs.current[index] = el; }}>
                    <WeekActivitiesTooltip
                      activities={weekActivities}
                      onClose={() => setLockedWeek(null)}
                      isActivityDisabled={isActivityDisabled}
                      onToggleActivity={toggleActivity}
                      unit={unit}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 min-h-12 sm:min-h-14">
        <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <span>Longest: <strong className="text-gray-800 dark:text-white">{maxLongest.toFixed(1)} {unitLabel}</strong></span>
          <span>Avg Long {activityLabel}: <strong className="text-gray-800 dark:text-white">{avgLongest.toFixed(1)} {unitLabel}</strong></span>
        </div>
      </div>
    </div>
  );
}
