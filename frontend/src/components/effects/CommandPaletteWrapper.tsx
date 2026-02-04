'use client';

import { CommandPaletteProvider } from './CommandPalette';
import { ReactNode } from 'react';

interface CommandPaletteWrapperProps {
  children: ReactNode;
}

export function CommandPaletteWrapper({ children }: CommandPaletteWrapperProps) {
  return (
    <CommandPaletteProvider>
      {children}
    </CommandPaletteProvider>
  );
}
