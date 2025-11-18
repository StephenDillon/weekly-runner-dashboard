'use client';

import { useState } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-3">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              For informational purposes only.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © {currentYear} Stephen Running Dashboard. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
