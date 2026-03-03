'use client';

import { Toaster } from 'sonner';

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
