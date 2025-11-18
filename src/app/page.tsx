"use client";

import { useState } from "react";
import WeekSelector from "./components/WeekSelector";
import WeeklyMileageChart from "./components/WeeklyMileageChart";
import AvgCadenceChart from "./components/AvgCadenceChart";
import AvgHeartRateChart from "./components/AvgHeartRateChart";
import { getLastFullWeek } from "./utils/dateUtils";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastFullWeek());
  
  return (
    <div className="min-h-screen font-sans bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      
      <div className="max-w-7xl mx-auto py-12 px-4">
        <WeekSelector selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <WeeklyMileageChart endDate={selectedWeek} />
          <AvgCadenceChart endDate={selectedWeek} />
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          <AvgHeartRateChart endDate={selectedWeek} />
        </div>
      </div>
    </div>
  );
}
