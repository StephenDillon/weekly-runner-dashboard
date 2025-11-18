"use client";

import React from 'react';

interface WeekSelectorProps {
  selectedWeek: Date;
  onWeekChange: (date: Date) => void;
}

export default function WeekSelector({ selectedWeek, onWeekChange }: WeekSelectorProps) {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    // Set to end of selected week (Saturday)
    const dayOfWeek = newDate.getDay();
    const daysToSaturday = 6 - dayOfWeek;
    newDate.setDate(newDate.getDate() + daysToSaturday);
    newDate.setHours(23, 59, 59, 999);
    onWeekChange(newDate);
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-4">
        <label htmlFor="week-selector" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Week Ending:
        </label>
        <input
          id="week-selector"
          type="date"
          value={formatDate(selectedWeek)}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          (Showing 8 weeks ending this date)
        </span>
      </div>
    </div>
  );
}
