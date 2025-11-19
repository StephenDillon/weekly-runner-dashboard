'use client';

import { useState } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto shrink-0">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <a 
              href="https://www.strava.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src="/api_logo_pwrdBy_strava_horiz_orange.png" 
                alt="Powered by Strava"
                className="h-10"
              />
            </a>
            <div className="text-right space-x-4">
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                For informational purposes only.
              </span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                © {currentYear} Weekly Running Dashboard. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
