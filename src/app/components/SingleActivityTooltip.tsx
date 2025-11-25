"use client";

import React from 'react';
import { StravaActivity } from '../types/strava';
import ActivityTooltipItem from './ActivityTooltipItem';
import { metersToMiles } from '../utils/activityAggregation';

interface SingleActivityTooltipProps {
  activity: StravaActivity;
  onClose: () => void;
  isActivityDisabled: (id: number) => boolean;
  onToggleActivity: (id: number) => void;
  unit: 'miles' | 'kilometers';
  showCadence?: boolean;
}

export default function SingleActivityTooltip({
  activity,
  onClose,
  isActivityDisabled,
  onToggleActivity,
  unit,
  showCadence = false
}: SingleActivityTooltipProps) {
  const unitLabel = unit === 'kilometers' ? 'km' : 'mi';
  const distance = unit === 'kilometers' 
    ? (metersToMiles(activity.distance) * 1.60934).toFixed(2)
    : metersToMiles(activity.distance).toFixed(2);

  return (
    <div className="absolute left-0 sm:left-0 top-10 z-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-2 sm:p-3 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[300px] max-w-[400px]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <ActivityTooltipItem
        activity={activity}
        isDisabled={isActivityDisabled(activity.id)}
        onToggle={onToggleActivity}
        distance={distance}
        unitLabel={unitLabel}
        showCadence={showCadence}
      />
    </div>
  );
}
