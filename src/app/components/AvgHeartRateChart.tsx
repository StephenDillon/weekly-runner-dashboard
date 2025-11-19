"use client";

import React, { useMemo } from 'react';
import { getWeeksBack, formatWeekLabel } from '../utils/dateUtils';
import { useStravaActivities } from '../hooks/useStravaActivities';
import { aggregateActivitiesByWeek, generateWeekStarts } from '../utils/activityAggregation';

interface HeartRateData {
  week: string;
  heartRate: number | null; // bpm
}

interface AvgHeartRateChartProps {
  endDate: Date;
}

export default function AvgHeartRateChart({ endDate }: AvgHeartRateChartProps) {
  const weeks = getWeeksBack(8, endDate);
  
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
    return aggregateActivitiesByWeek(activities, weekStarts);
  }, [activities, endDate]);

  const chartData: HeartRateData[] = useMemo(() => {
    return weeks.map((date, index) => ({
      week: formatWeekLabel(date),
      heartRate: weeklyMetrics[index]?.averageHeartRate || null
    }));
  }, [weeks, weeklyMetrics]);

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
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Average Heart Rate</h2>
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
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill="white"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    className="cursor-pointer hover:r-7 transition-all"
                  />
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
