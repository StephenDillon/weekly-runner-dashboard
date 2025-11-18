"use client";

import WeeklyMileageChart from "./components/WeeklyMileageChart";
import AvgPaceChart from "./components/AvgPaceChart";
import AvgHeartRateChart from "./components/AvgHeartRateChart";

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <WeeklyMileageChart />
          <AvgPaceChart />
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <AvgHeartRateChart />
        </div>
      </div>
    </div>
  );
}
