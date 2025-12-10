"use client";

import { useState } from 'react';
import PaceAnalysisChart from './PaceAnalysisChart';
import DistanceAnalysisChart from './DistanceAnalysisChart';
import AvgCadenceChart from './AvgCadenceChart';
import { useActivityType } from '../context/ActivityTypeContext';

interface ChartsTabProps {
    endDate: Date;
    unit: 'miles' | 'kilometers';
}

interface AccordionSectionProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}

function AccordionSection({ title, children, isOpen, onToggle }: AccordionSectionProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-4">
            <button
                onClick={onToggle}
                className="w-full px-6 py-4 flex items-center justify-between focus:outline-none bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
                <svg
                    className={`w-6 h-6 transform transition-transform duration-200 text-gray-500 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
            >
                <div className="p-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function ChartsTab({ endDate, unit }: ChartsTabProps) {
    const { activityType } = useActivityType();
    const [openSections, setOpenSections] = useState({
        pace: false,
        distance: false,
        cadence: false
    });

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div className="space-y-6">
            <AccordionSection
                title="Pace Chart"
                isOpen={openSections.pace}
                onToggle={() => toggleSection('pace')}
            >
                <PaceAnalysisChart endDate={endDate} unit={unit} />
            </AccordionSection>

            <AccordionSection
                title="Distance Chart"
                isOpen={openSections.distance}
                onToggle={() => toggleSection('distance')}
            >
                <DistanceAnalysisChart endDate={endDate} unit={unit} />
            </AccordionSection>

            {activityType === 'running' && (
                <AccordionSection
                    title="Cadence Chart"
                    isOpen={openSections.cadence}
                    onToggle={() => toggleSection('cadence')}
                >
                    <AvgCadenceChart endDate={endDate} unit={unit} />
                </AccordionSection>
            )}
        </div>
    );
}
