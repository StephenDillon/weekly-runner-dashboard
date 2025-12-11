import React from 'react';

export default function ReleaseNotesTab() {
    const releases = [
        {
            version: 'Latest Updates',
            date: 'December 2025',
            changes: [
                'Support for Monthly display',
                'Added cycling support',
                'Added races to get a dashboard countdown to race day',
                'Added 80/20 dashboard with heart rate ranges and max HR',
                'Updated activities table to have columns dropdown with additional data',
            ]
        }
    ];

    return (
        <div className="space-y-6">
            {releases.map((release, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{release.version}</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{release.date}</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                            {release.changes.map((change, changeIndex) => (
                                <li key={changeIndex}>{change}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
}
