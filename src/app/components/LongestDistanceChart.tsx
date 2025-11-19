"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { StravaActivity } from '../types/strava';

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
        if (disabledActivities.has(activity.id)) return false;
        const activityDate = new Date(activity.start_date);
        return activityDate >= weekStart && activityDate < weekEnd;
      });

      const longestRun = weekActivities.reduce<StravaActivity | null>((longest, activity) => {
        if (!longest || activity.distance > longest.distance) {
          return activity;
        }
        return longest;
      }, null);

      return {
        weekStart,
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
  const avgLongest = totalLongest / convertedData.length;
  const maxLongest = Math.max(...convertedData.map(d => d.distance));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white h-8">Longest Run</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Click bar to view activities</span>
      </div>
      <div className="space-y-3 flex-1" style={{ minHeight: '300px' }}>
          {convertedData.map((data, index) => {
            const open = isOpen(index);
            const longestRun = weeklyLongestRuns[index]?.longestRun;
            
            return (
              <div key={index} className="flex items-center gap-3 relative">
                <div className="w-20 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-help" title={data.weekTooltip}>
                  {data.week}
                </div>
                <div 
                  ref={(el) => { barRefs.current[index] = el; }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-visible"
                  onClick={() => toggleWeek(index)}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    className="bg-linear-to-r from-blue-500 to-indigo-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500 cursor-pointer hover:opacity-90"
                    style={{ width: `${(data.distance / maxDistance) * 100}%` }}
                  >
                    <span className="text-white text-sm font-semibold">
                      {data.distance.toFixed(1)} {unitLabel}
                    </span>
                  </div>
                
                {open && longestRun && (
                  <div 
                    ref={(el) => { tooltipRefs.current[index] = el; }}
                    className="absolute left-0 top-10 z-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-[300px] max-w-[400px]"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLockedWeek(null);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                      title="Close"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Longest run this week:
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic">
                      Click to keep open, click X to close
                    </div>
                    <div className="space-y-1">
                      <div
                        className={`flex items-center gap-2 py-1 px-2 rounded transition-colors ${
                          isActivityDisabled(longestRun.id) ? 'opacity-50 bg-gray-100 dark:bg-gray-600' : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleActivity(longestRun.id);
                          }}
                          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isActivityDisabled(longestRun.id)
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-gray-400 dark:border-gray-500 hover:border-red-500'
                          }`}
                          title={isActivityDisabled(longestRun.id) ? 'Enable activity' : 'Disable activity'}
                        >
                          {isActivityDisabled(longestRun.id) && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 text-xs">
                          <a
                            href={`https://www.strava.com/activities/${longestRun.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block ${
                              isActivityDisabled(longestRun.id)
                                ? 'text-gray-500 dark:text-gray-400'
                                : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline'
                            }`}
                          >
                            View on Strava
                          </a>
                          <div className={`${
                            isActivityDisabled(longestRun.id)
                              ? 'text-gray-500 dark:text-gray-400 line-through'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {longestRun.name}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {data.distance.toFixed(2)} {unitLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 h-14">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Longest: <strong className="text-gray-800 dark:text-white">{maxLongest.toFixed(1)} {unitLabel}</strong></span>
          <span>Avg Long Run: <strong className="text-gray-800 dark:text-white">{avgLongest.toFixed(1)} {unitLabel}</strong></span>
        </div>
      </div>
    </div>
  );
}
