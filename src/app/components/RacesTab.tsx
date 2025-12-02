"use client";

import { useState } from 'react';
import { Race } from '../types/race';

interface RacesTabProps {
    races: Race[];
    onAddRace: (name: string, date: string) => void;
    onRemoveRace: (id: string) => void;
}

export default function RacesTab({ races, onAddRace, onRemoveRace }: RacesTabProps) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && date) {
            onAddRace(name, date);
            setName('');
            setDate('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Upcoming Races</h2>

                <form onSubmit={handleSubmit} className="mb-8 space-y-4 sm:flex sm:space-y-0 sm:space-x-4 sm:items-end">
                    <div className="flex-1">
                        <label htmlFor="race-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Race Name
                        </label>
                        <input
                            type="text"
                            id="race-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                            placeholder="e.g. Boston Marathon"
                            required
                        />
                    </div>

                    <div className="flex-1">
                        <label htmlFor="race-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Race Date
                        </label>
                        <input
                            type="date"
                            id="race-date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Add Race
                    </button>
                </form>

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                    Name
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                    Date
                                </th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                            {races.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No upcoming races added yet.
                                    </td>
                                </tr>
                            ) : (
                                races.map((race) => (
                                    <tr key={race.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                            {race.name}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(race.date).toLocaleDateString()}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <button
                                                onClick={() => onRemoveRace(race.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                Delete<span className="sr-only">, {race.name}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
