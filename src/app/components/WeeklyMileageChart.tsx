"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts, milesToKilometers, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import { StravaActivity } from '../types/strava';

interface WeekData {
  week: string;
  weekTooltip: string;
  miles: number;
}

interface WeeklyMileageChartProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

const milesToKm = (miles: number) => miles * 1.60934;

export default function WeeklyMileageChart({ endDate, unit }: WeeklyMileageChartProps) {
  const { weekStartDay } = useWeekStart();
  const { disabledActivities, toggleActivity, isActivityDisabled } = useDisabledActivities();
  const weeks = getWeeksBack(8, endDate);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [lockedWeek, setLockedWeek] = useState<number | null>(null);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleWeek = (index: number) => {
    if (lockedWeek === index) {
      setLockedWeek(null);
    } else {
      // Close any open tooltip before opening the new one
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
  
  // Calculate date range for API call
  const startDate = useMemo(() => {
    const start = new Date(weeks[0]);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weeks]);

  const apiEndDate = useMemo(() => {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 7); // Include full week
    end.setHours(23, 59, 59, 999);
    return end;
  }, [endDate]);

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate);

  const weeklyMetrics = useMemo(() => {
    const weekStarts = generateWeekStarts(endDate, 8);
    return aggregateActivitiesByWeek(activities, weekStarts, disabledActivities);
  }, [activities, endDate, disabledActivities]);

  const convertedData = useMemo(() => {
    return weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      weekTooltip: formatWeekTooltip(date, weekStartDay),
      miles: weeklyMetrics[index]?.totalDistance || 0,
      distance: unit === 'kilometers' 
        ? milesToKm(weeklyMetrics[index]?.totalDistance || 0)
        : (weeklyMetrics[index]?.totalDistance || 0)
    }));
  }, [weeks, weeklyMetrics, unit, weekStartDay]);
  
  const maxDistance = Math.max(...convertedData.map(d => d.distance), 1);
  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const unitLabelLong = unit === 'kilometers' ? 'kilometers' : 'miles';
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Total Distance</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Total Distance</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">Error loading activities: {error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white h-8">Total Distance</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Click bar to view activities</span>
      </div>
      <div className="space-y-3 flex-1" style={{ minHeight: '300px' }}>
        {convertedData.map((data, index) => {
          const weekActivities = weeklyMetrics[index]?.activities || [];
          
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
                
                {isOpen(index) && weekActivities.length > 0 && (
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
                      {weekActivities.length} {weekActivities.length === 1 ? 'Activity' : 'Activities'} this week:
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic">
                      Click to keep open, click X to close
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {weekActivities.map((activity) => {
                        const distance = unit === 'kilometers' 
                          ? (metersToMiles(activity.distance) * 1.60934).toFixed(2)
                          : metersToMiles(activity.distance).toFixed(2);
                        const isDisabled = isActivityDisabled(activity.id);
                        return (
                          <div
                            key={activity.id}
                            className={`flex items-center gap-2 py-1 px-2 rounded transition-colors ${
                              isDisabled ? 'opacity-50 bg-gray-100 dark:bg-gray-600' : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleActivity(activity.id);
                              }}
                              className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isDisabled
                                  ? 'border-red-500 bg-red-500 text-white'
                                  : 'border-gray-400 dark:border-gray-500 hover:border-red-500'
                              }`}
                              title={isDisabled ? 'Enable activity' : 'Disable activity'}
                            >
                              {isDisabled && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <a
                              href={`https://www.strava.com/activities/${activity.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex-1 text-xs block ${
                                isDisabled
                                  ? 'text-gray-500 dark:text-gray-400 line-through'
                                  : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline'
                              }`}
                            >
                              <div className="font-medium">{activity.name}</div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {distance} {unitLabel}
                                {activity.average_cadence && ` • ${Math.round(activity.average_cadence * 2)} spm`}
                              </div>
                            </a>
                          </div>
                        );
                      })}
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
          <span>Total: <strong className="text-gray-800 dark:text-white">{convertedData.reduce((sum, d) => sum + d.distance, 0).toFixed(1)} {unitLabelLong}</strong></span>
          <span>Avg: <strong className="text-gray-800 dark:text-white">{(convertedData.reduce((sum, d) => sum + d.distance, 0) / convertedData.length).toFixed(1)} {unitLabelLong}/week</strong></span>
        </div>
      </div>
    </div>
  );
}
