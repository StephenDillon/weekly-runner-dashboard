"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';
import ActivityTooltipItem from './ActivityTooltipItem';

interface CadenceData {
  week: string;
  weekTooltip: string;
  cadence: number | null; // steps per minute
}

interface AvgCadenceChartProps {
  endDate: Date;
}

export default function AvgCadenceChart({ endDate }: AvgCadenceChartProps) {
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
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [endDate]);

  const { activities, loading, error } = useStravaActivities(startDate, apiEndDate);

  const weeklyMetrics = useMemo(() => {
    const weekStarts = generateWeekStarts(endDate, weeksToDisplay);
    return aggregateActivitiesByWeek(activities, weekStarts, disabledActivities);
  }, [activities, endDate, disabledActivities, weeksToDisplay]);

  const chartData: CadenceData[] = useMemo(() => {
    return weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      weekTooltip: formatWeekTooltip(date, weekStartDay),
      cadence: weeklyMetrics[index]?.averageCadence || null
    }));
  }, [weeks, weeklyMetrics, weekStartDay]);

  const validCadences = chartData.filter(d => d.cadence !== null).map(d => d.cadence!);
  const minCadence = validCadences.length > 0 ? Math.min(...validCadences) : 0;
  const maxCadence = validCadences.length > 0 ? Math.max(...validCadences) : 200;
  const range = maxCadence - minCadence;
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Average Cadence</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Average Cadence</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">Error loading activities: {error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white h-8">Average Cadence</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Click bar to view activities</span>
      </div>
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 pt-8 flex-1" style={{ minHeight: '300px' }}>
        <div className="h-full flex items-end justify-around gap-2">
          {chartData.map((data, index) => {
            const heightPercent = data.cadence && range > 0
              ? ((data.cadence - minCadence) / range) * 85 + 10
              : 10;
            const weekActivities = weeklyMetrics[index]?.activities.filter(
              a => a.average_cadence && a.average_cadence > 0
            ) || [];
            
            return (
              <div 
                ref={(el) => { barRefs.current[index] = el; }}
                key={index} 
                className="flex flex-col items-center flex-1 h-full justify-end relative"
                onClick={() => toggleWeek(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="relative flex items-end justify-center w-full" style={{ height: `${heightPercent}%` }}>
                  {data.cadence !== null && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap z-10">
                      {Math.round(data.cadence)}
                    </div>
                  )}
                  {data.cadence !== null ? (
                    <div
                      className="bg-linear-to-t from-green-500 to-emerald-400 rounded-t-lg w-full transition-all duration-500 hover:opacity-80 h-full cursor-pointer"
                    >
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500">-</div>
                  )}
                </div>
                
                {isOpen(index) && weekActivities.length > 0 && (
                  <div 
                    ref={(el) => { tooltipRefs.current[index] = el; }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-[280px] max-w-[350px]"
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
                      {weekActivities.length} {weekActivities.length === 1 ? 'Activity' : 'Activities'} with cadence:
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic">
                      Click to keep open, click X to close
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {weekActivities.map((activity) => (
                        <ActivityTooltipItem
                          key={activity.id}
                          activity={activity}
                          isDisabled={isActivityDisabled(activity.id)}
                          onToggle={toggleActivity}
                          distance={metersToMiles(activity.distance).toFixed(2)}
                          unitLabel="mi"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2 cursor-help" title={data.weekTooltip}>
                  {data.week}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 h-14">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          {validCadences.length > 0 ? (
            <>
              <span>Min: <strong className="text-gray-800 dark:text-white">{Math.round(minCadence)} spm</strong></span>
              <span>Avg: <strong className="text-gray-800 dark:text-white">{Math.round(validCadences.reduce((sum, c) => sum + c, 0) / validCadences.length)} spm</strong></span>
              <span>Max: <strong className="text-gray-800 dark:text-white">{Math.round(maxCadence)} spm</strong></span>
            </>
          ) : (
            <span className="text-gray-500">No cadence data available</span>
          )}
        </div>
      </div>
    </div>
  );
}
