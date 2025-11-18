"use client";

import React from 'react';

interface PaceData {
  week: string;
  pace: number; // minutes per mile
}

const sampleData: PaceData[] = [
  { week: 'Week 1', pace: 8.5 },
  { week: 'Week 2', pace: 8.2 },
  { week: 'Week 3', pace: 7.9 },
  { week: 'Week 4', pace: 8.1 },
  { week: 'Week 5', pace: 7.6 },
  { week: 'Week 6', pace: 7.8 },
  { week: 'Week 7', pace: 7.4 },
  { week: 'Week 8', pace: 7.5 },
];

export default function AvgPaceChart() {
  const minPace = Math.min(...sampleData.map(d => d.pace));
  const maxPace = Math.max(...sampleData.map(d => d.pace));
  const range = maxPace - minPace;
  
  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Average Pace per Week</h2>
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4" style={{ height: '300px' }}>
        <div className="h-full flex items-end justify-around gap-2 pb-8">
          {sampleData.map((data, index) => {
            const heightPercent = range > 0 
              ? ((maxPace - data.pace) / range) * 70 + 20
              : 50;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 h-full justify-end">
                <div className="relative flex items-end justify-center w-full" style={{ height: `${heightPercent}%` }}>
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap z-10">
                    {formatPace(data.pace)}
                  </div>
                  <div
                    className="bg-linear-to-t from-green-500 to-emerald-400 rounded-t-lg w-full transition-all duration-500 hover:opacity-80 h-full"
                  >
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2">
                  {data.week.replace('Week ', 'W')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Best: <strong className="text-gray-800 dark:text-white">{formatPace(minPace)}/mi</strong></span>
          <span>Avg: <strong className="text-gray-800 dark:text-white">{formatPace(sampleData.reduce((sum, d) => sum + d.pace, 0) / sampleData.length)}/mi</strong></span>
        </div>
      </div>
    </div>
  );
}
