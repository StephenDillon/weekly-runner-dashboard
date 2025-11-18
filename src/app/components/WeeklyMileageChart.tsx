"use client";

import React from 'react';
import { getWeeksBack, formatWeekLabel, formatWeekTooltip } from '../utils/dateUtils';

interface WeekData {
  week: string;
  weekTooltip: string;
  miles: number;
}

interface WeeklyMileageChartProps {
  endDate: Date;
  unit: 'miles' | 'kilometers';
}

// Sample mileage data for 8 weeks (in miles)
const sampleMiles = [12.5, 15.2, 18.7, 14.3, 21.4, 19.8, 23.1, 20.5];

const milesToKm = (miles: number) => miles * 1.60934;

export default function WeeklyMileageChart({ endDate, unit }: WeeklyMileageChartProps) {
  const weeks = getWeeksBack(8, endDate);
  const sampleData: WeekData[] = weeks.map((date, index) => ({
    week: formatWeekLabel(date),
    weekTooltip: formatWeekTooltip(date),
    miles: sampleMiles[index]
  }));
  
  const convertedData = sampleData.map(d => ({
    ...d,
    distance: unit === 'kilometers' ? milesToKm(d.miles) : d.miles
  }));
  
  const maxDistance = Math.max(...convertedData.map(d => d.distance));
  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const unitLabelLong = unit === 'kilometers' ? 'kilometers' : 'miles';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white h-8">Total Distance</h2>
      <div className="space-y-3 flex-1" style={{ minHeight: '300px' }}>
        {convertedData.map((data, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-20 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-help" title={data.weekTooltip}>
              {data.week}
            </div>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-500 to-indigo-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                style={{ width: `${(data.distance / maxDistance) * 100}%` }}
              >
                <span className="text-white text-sm font-semibold">
                  {data.distance.toFixed(1)} {unitLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
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
