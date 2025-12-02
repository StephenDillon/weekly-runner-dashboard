"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getClientSideStravaClient } from '../lib/stravaClient';
import { StravaService } from '../lib/stravaService';


interface StravaAuthContextType {
  isAuthenticated: boolean;
  athleteId: string | null;
  setIsAuthenticated: (value: boolean) => void;
  checkAuth: () => void;
}

const StravaAuthContext = createContext<StravaAuthContextType | undefined>(undefined);

export function StravaAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athleteId, setAthleteId] = useState<string | null>(null);



  const checkAuth = async () => {
    // Check if user has tokens in localStorage or session
    // We also check the server status to be sure
    try {
      const response = await fetch('/api/v1/auth/status');
      const data = await response.json();

      if (data.authenticated) {
        setIsAuthenticated(true);

        // Fetch athlete ID if we don't have it
        if (!athleteId) {
          const client = await getClientSideStravaClient();
          if (client) {
            const service = new StravaService(client);
            try {
              const athlete = await service.getAthlete();
              const id = athlete.id.toString();
              setAthleteId(id);
            } catch (e) {
              console.error('Failed to fetch athlete profile:', e);
            }
          }
        }
      } else {
        setIsAuthenticated(false);
        setAthleteId(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setAthleteId(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <StravaAuthContext.Provider value={{ isAuthenticated, athleteId, setIsAuthenticated, checkAuth }}>
      {children}
    </StravaAuthContext.Provider>
  );
}

export function useStravaAuth() {
  const context = useContext(StravaAuthContext);
  if (context === undefined) {
    throw new Error('useStravaAuth must be used within a StravaAuthProvider');
  }
  return context;
}
