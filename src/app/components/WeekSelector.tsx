"use client";

import React from 'react';
import { useUnit } from '../context/UnitContext';
import { useWeekStart, DAYS_OF_WEEK } from '../context/WeekStartContext';
import { useActivityType } from '../context/ActivityTypeContext';
import { useConfig } from './ClientLayout';

interface WeekSelectorProps {
  selectedWeek: Date;
  onWeekChange: (date: Date) => void;
}

export default function WeekSelector({ selectedWeek, onWeekChange }: WeekSelectorProps) {
  const { unit, setUnit } = useUnit();
  const {
    weekStartDay,
    setWeekStartDay,
    weeksToDisplay,
    setWeeksToDisplay,
    viewMode,
    setViewMode,
    monthsToDisplay,
    setMonthsToDisplay
  } = useWeekStart();
  const { activityType, setActivityType } = useActivityType();
  const { showConfig } = useConfig();

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatMonthValue = (date: Date) => {
    return date.toISOString().slice(0, 7); // YYYY-MM
  };

  const DAY_TO_NUMBER: Record<string, number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (viewMode === 'monthly') {
      const [year, month] = e.target.value.split('-').map(Number);
      // Set to the last day of the selected month
      // new Date(year, month, 0) gives the last day of the previous month (month is 1-indexed in count)
      // But JS Date month is 0-indexed. 
      // If usage is 2023-11, we want last day of Nov.
      // new Date(2023, 11, 0) -> Dec 0 -> Nov 30. Correct.
      const newDate = new Date(year, month, 0);
      newDate.setHours(0, 0, 0, 0);
      onWeekChange(newDate);
      return;
    }

    const newDate = new Date(e.target.value);
    // Adjust to the start of the selected week
    const dayOfWeek = newDate.getDay();
    const startDayNum = DAY_TO_NUMBER[weekStartDay];

    let daysToStart;
    if (dayOfWeek >= startDayNum) {
      daysToStart = dayOfWeek - startDayNum;
    } else {
      daysToStart = 7 - (startDayNum - dayOfWeek);
    }

    newDate.setDate(newDate.getDate() - daysToStart);
    newDate.setHours(0, 0, 0, 0);
    onWeekChange(newDate);
  };

  if (!showConfig) {
    return null;
  }

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 transition-all">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            View Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('weekly')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${viewMode === 'weekly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${viewMode === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <label htmlFor="date-selector" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {viewMode === 'weekly' ? 'Select Ending Week' : 'Select Ending Month'}
          </label>
          <input
            id="date-selector"
            type={viewMode === 'weekly' ? "date" : "month"}
            value={viewMode === 'weekly' ? formatDate(selectedWeek) : formatMonthValue(selectedWeek)}
            onChange={handleChange}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {viewMode === 'weekly' && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
            <label htmlFor="week-start-selector" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Week Starts On
            </label>
            <select
              id="week-start-selector"
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value as typeof weekStartDay)}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer text-sm"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <label htmlFor="periods-to-display" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {viewMode === 'weekly' ? 'Weeks to Display' : 'Months to Display'}
          </label>
          <input
            id="periods-to-display"
            type="number"
            min="1"
            max={viewMode === 'weekly' ? "52" : "24"}
            value={viewMode === 'weekly' ? weeksToDisplay : monthsToDisplay}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                if (viewMode === 'weekly') {
                  setWeeksToDisplay(value);
                } else {
                  setMonthsToDisplay(value);
                }
              }
            }}
            className="w-full sm:w-20 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activity Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setActivityType('running')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${activityType === 'running'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              Running
            </button>
            <button
              onClick={() => setActivityType('cycling')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${activityType === 'cycling'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              Cycling
            </button>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Distance Unit
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setUnit('miles')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${unit === 'miles'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              Miles
            </button>
            <button
              onClick={() => setUnit('kilometers')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${unit === 'kilometers'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              Kilometers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
