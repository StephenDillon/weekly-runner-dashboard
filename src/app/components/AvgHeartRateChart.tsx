"use client";

import React, { useMemo, useState, useRef } from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts, metersToMiles } from '../utils/activityAggregation';
import { useWeekStart } from '../context/WeekStartContext';
import { useDisabledActivities } from '../context/DisabledActivitiesContext';

interface HeartRateData {
  week: string;
  weekTooltip: string;
  heartRate: number | null; // bpm
}

interface AvgHeartRateChartProps {
  endDate: Date;
}

export default function AvgHeartRateChart({ endDate }: AvgHeartRateChartProps) {
  const { weekStartDay } = useWeekStart();
  const { disabledActivities, toggleActivity, isActivityDisabled } = useDisabledActivities();
  const weeks = getWeeksBack(8, endDate);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [lockedWeek, setLockedWeek] = useState<number | null>(null);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pointRefs = useRef<(SVGCircleElement | null)[]>([]);

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
    const weekStarts = generateWeekStarts(endDate, 8);
    return aggregateActivitiesByWeek(activities, weekStarts, disabledActivities);
  }, [activities, endDate, disabledActivities]);

  const chartData: HeartRateData[] = useMemo(() => {
    return weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      weekTooltip: formatWeekTooltip(date, weekStartDay),
      heartRate: weeklyMetrics[index]?.averageHeartRate || null
    }));
  }, [weeks, weeklyMetrics, weekStartDay]);

  const validHeartRates = chartData.filter(d => d.heartRate !== null).map(d => d.heartRate!);
  const maxHR = validHeartRates.length > 0 ? Math.max(...validHeartRates) : 180;
  const minHR = validHeartRates.length > 0 ? Math.min(...validHeartRates) : 120;
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Average Heart Rate</h2>
        <div className="flex items-center justify-center" style={{ height: '280px' }}>
          <div className="text-gray-500 dark:text-gray-400">Loading activities...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Average Heart Rate</h2>
        <div className="flex items-center justify-center" style={{ height: '280px' }}>
          <div className="text-red-500">Error loading activities: {error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Average Heart Rate</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Click point to view activities</span>
      </div>
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4" style={{ height: '280px' }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
          <span>{maxHR + 10}</span>
          <span>{Math.round((maxHR + minHR) / 2)}</span>
          <span>{minHR - 10}</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-8 h-full relative">
          <svg className="w-full h-full" viewBox="0 0 800 250" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="0" x2="800" y2="0" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1" />
            <line x1="0" y1="125" x2="800" y2="125" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1" strokeDasharray="5,5" />
            <line x1="0" y1="250" x2="800" y2="250" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1" />
            
            {/* Line chart */}
            {validHeartRates.length > 0 && (
              <polyline
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartData
                  .map((data, index) => {
                    if (data.heartRate === null) return null;
                    const x = (index / (chartData.length - 1)) * 800;
                    const y = ((maxHR + 10 - data.heartRate) / 30) * 250;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}
            
            {/* Data points */}
            {chartData.map((data, index) => {
              if (data.heartRate === null) return null;
              const x = (index / (chartData.length - 1)) * 800;
              const y = ((maxHR + 10 - data.heartRate) / 30) * 250;
              const weekActivities = weeklyMetrics[index]?.activities.filter(
                a => a.average_heartrate && a.average_heartrate > 0
              ) || [];
              return (
                <g key={index}>
                  <circle
                    ref={(el) => { pointRefs.current[index] = el; }}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="white"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    className="cursor-pointer hover:r-7 transition-all"
                    onClick={() => toggleWeek(index)}
                    onMouseEnter={() => handleMouseEnter(index)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {isOpen(index) && weekActivities.length > 0 && (
                    <foreignObject
                      x={x - 150}
                      y={y < 125 ? y + 15 : y - 200}
                      width="300"
                      height="200"
                      className="overflow-visible"
                    >
                      <div 
                        ref={(el) => { tooltipRefs.current[index] = el; }}
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3"
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
                          {weekActivities.length} {weekActivities.length === 1 ? 'Activity' : 'Activities'} with heart rate:
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic">
                          Click to keep open, click X to close
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {weekActivities.map((activity) => {
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
                                    {metersToMiles(activity.distance).toFixed(2)} mi
                                    {activity.average_heartrate && ` • ${Math.round(activity.average_heartrate)} bpm`}
                                  </div>
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2">
            {chartData.map((data, index) => (
              <span key={index} className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                {data.week}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          {validHeartRates.length > 0 ? (
            <>
              <span>Min: <strong className="text-gray-800 dark:text-white">{Math.round(minHR)} bpm</strong></span>
              <span>Avg: <strong className="text-gray-800 dark:text-white">{Math.round(validHeartRates.reduce((sum, hr) => sum + hr, 0) / validHeartRates.length)} bpm</strong></span>
              <span>Max: <strong className="text-gray-800 dark:text-white">{Math.round(maxHR)} bpm</strong></span>
            </>
          ) : (
            <span className="text-gray-500">No heart rate data available</span>
          )}
        </div>
      </div>
    </div>
  );
}
