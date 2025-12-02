"use client";

import { useState, useEffect } from 'react';
import { Race } from '../types/race';
import { useStravaAuth } from '../context/StravaAuthContext';

export function useRaces() {
    const [races, setRaces] = useState<Race[]>([]);
    const [loading, setLoading] = useState(true);
    const { athleteId } = useStravaAuth();

    useEffect(() => {
        if (!athleteId) {
            setRaces([]);
            setLoading(false);
            return;
        }

        const fetchRaces = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/v1/races');
                if (response.ok) {
                    const data = await response.json();
                    setRaces(data);
                } else {
                    console.error('Failed to fetch races');
                }
            } catch (error) {
                console.error('Error fetching races:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRaces();
    }, [athleteId]);

    const addRace = async (name: string, date: string) => {
        if (!athleteId) return;

        try {
            const response = await fetch('/api/v1/races', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, date }),
            });

            if (response.ok) {
                const newRace = await response.json();
                setRaces((prev) => [...prev, newRace].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            } else {
                console.error('Failed to add race');
            }
        } catch (error) {
            console.error('Error adding race:', error);
        }
    };

    const removeRace = async (id: string) => {
        try {
            const response = await fetch(`/api/v1/races/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setRaces((prev) => prev.filter((race) => race.id !== id));
            } else {
                console.error('Failed to remove race');
            }
        } catch (error) {
            console.error('Error removing race:', error);
        }
    };

    return { races, addRace, removeRace, loading };
}
