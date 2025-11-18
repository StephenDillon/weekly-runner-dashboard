"use client";

import { useState } from "react";
import Header from "./Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [unit, setUnit] = useState<'miles' | 'kilometers'>('miles');
  
  return (
    <>
      <Header unit={unit} onUnitChange={setUnit} />
      <main className="grow">
        {children}
      </main>
    </>
  );
}
