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
  const { weekStartDay, setWeekStartDay, weeksToDisplay, setWeeksToDisplay } = useWeekStart();
  const { activityType, setActivityType } = useActivityType();
  const { showConfig } = useConfig();
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
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
          <label htmlFor="week-selector" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Ending Week
          </label>
          <input
            id="week-selector"
            type="date"
            value={formatDate(selectedWeek)}
            onChange={handleChange}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      
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
      
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
          <label htmlFor="weeks-to-display" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weeks to Display
          </label>
          <input
            id="weeks-to-display"
            type="number"
            min="1"
            max="52"
            value={weeksToDisplay}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                setWeeksToDisplay(value);
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
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activityType === 'running'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Running
            </button>
            <button
              onClick={() => setActivityType('cycling')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activityType === 'cycling'
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
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                unit === 'miles'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Miles
            </button>
            <button
              onClick={() => setUnit('kilometers')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                unit === 'kilometers'
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
