"use client";

import { Race } from '../types/race';
import { parseRaceDate } from '../utils/dateUtils';

interface RaceCountdownCardProps {
    race: Race;
}

export default function RaceCountdownCard({ race }: RaceCountdownCardProps) {
    const calculateTimeLeft = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const raceDateLocal = parseRaceDate(race.date);

        const difference = raceDateLocal.getTime() - now.getTime();

        if (difference < 0) {
            return { weeks: 0, days: 0, isPast: true };
        }

        const daysTotal = Math.ceil(difference / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(daysTotal / 7);
        const days = daysTotal % 7;

        return { weeks, days, isPast: false };
    };

    const { weeks, days, isPast } = calculateTimeLeft();

    return (
        <div id="race-countdown-card" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-row justify-between items-center h-full border-l-4 border-blue-500 gap-2">
            <div className="flex flex-col gap-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight truncate pr-1">
                    {race.name}
                </h2>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {parseRaceDate(race.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>

            <div className="flex-shrink-0">
                {isPast ? (
                    <div className="text-sm md:text-xl font-semibold text-gray-500 dark:text-gray-400 text-right">
                        Race Completed
                    </div>
                ) : (
                    <div className="flex items-baseline space-x-1 md:space-x-2">
                        <span className="text-2xl md:text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                            {weeks}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium mr-1 md:mr-4 text-xs md:text-base">
                            wks
                        </span>
                        <span className="text-2xl md:text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                            {days}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium text-xs md:text-base">
                            days
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
