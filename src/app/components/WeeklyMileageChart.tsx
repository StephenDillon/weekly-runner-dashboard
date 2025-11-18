"use client";

import React from 'react';
import { getWeeksBack, formatWeekLabel } from '../utils/dateUtils';

interface WeekData {
  week: string;
  miles: number;
}

interface WeeklyMileageChartProps {
  endDate: Date;
}

// Sample mileage data for 8 weeks
const sampleMiles = [12.5, 15.2, 18.7, 14.3, 21.4, 19.8, 23.1, 20.5];

export default function WeeklyMileageChart({ endDate }: WeeklyMileageChartProps) {
  const weeks = getWeeksBack(8, endDate);
  const sampleData: WeekData[] = weeks.map((date, index) => ({
    week: formatWeekLabel(date),
    miles: sampleMiles[index]
  }));
  
  const maxMiles = Math.max(...sampleData.map(d => d.miles));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Weekly Mileage</h2>
      <div className="space-y-3">
        {sampleData.map((data, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-20 text-sm font-medium text-gray-600 dark:text-gray-300">
              {data.week}
            </div>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-500 to-indigo-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                style={{ width: `${(data.miles / maxMiles) * 100}%` }}
              >
                <span className="text-white text-sm font-semibold">
                  {data.miles} mi
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Total: <strong className="text-gray-800 dark:text-white">{sampleData.reduce((sum, d) => sum + d.miles, 0).toFixed(1)} miles</strong></span>
          <span>Avg: <strong className="text-gray-800 dark:text-white">{(sampleData.reduce((sum, d) => sum + d.miles, 0) / sampleData.length).toFixed(1)} miles/week</strong></span>
        </div>
      </div>
    </div>
  );
}
