'use client';

import Link from 'next/link';

interface HeaderProps {
  unit: 'miles' | 'kilometers';
  onUnitChange: (unit: 'miles' | 'kilometers') => void;
}

export default function Header({ unit, onUnitChange }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Running Dashboard 🏃
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Track your running progress and performance metrics
            </p>
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 ml-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Distance Unit
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onUnitChange('miles')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  unit === 'miles'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Miles
              </button>
              <button
                onClick={() => onUnitChange('kilometers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
    </header>
  );
}
