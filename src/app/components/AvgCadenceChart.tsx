"use client";

import React from 'react';
import { getWeeksBack, formatWeekLabel } from '../utils/dateUtils';

interface CadenceData {
  week: string;
  cadence: number; // steps per minute
}

interface AvgCadenceChartProps {
  endDate: Date;
}

// Sample cadence data for 8 weeks (steps per minute)
const sampleCadences = [168, 170, 172, 171, 174, 173, 176, 175];

export default function AvgCadenceChart({ endDate }: AvgCadenceChartProps) {
  const weeks = getWeeksBack(8, endDate);
  const sampleData: CadenceData[] = weeks.map((date, index) => ({
    week: formatWeekLabel(date),
    cadence: sampleCadences[index]
  }));
  const minCadence = Math.min(...sampleData.map(d => d.cadence));
  const maxCadence = Math.max(...sampleData.map(d => d.cadence));
  const range = maxCadence - minCadence;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Average Cadence per Week</h2>
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 pt-8" style={{ height: '300px' }}>
        <div className="h-full flex items-end justify-around gap-2">
          {sampleData.map((data, index) => {
            const heightPercent = range > 0 
              ? ((data.cadence - minCadence) / range) * 85 + 10
              : 50;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 h-full justify-end">
                <div className="relative flex items-end justify-center w-full" style={{ height: `${heightPercent}%` }}>
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap z-10">
                    {data.cadence}
                  </div>
                  <div
                    className="bg-linear-to-t from-green-500 to-emerald-400 rounded-t-lg w-full transition-all duration-500 hover:opacity-80 h-full"
                  >
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2">
                  {data.week}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Min: <strong className="text-gray-800 dark:text-white">{minCadence} spm</strong></span>
          <span>Avg: <strong className="text-gray-800 dark:text-white">{Math.round(sampleData.reduce((sum, d) => sum + d.cadence, 0) / sampleData.length)} spm</strong></span>
          <span>Max: <strong className="text-gray-800 dark:text-white">{maxCadence} spm</strong></span>
        </div>
      </div>
    </div>
  );
}
