import { vi } from 'vitest';
import React from 'react';

// Mock next/image to a basic img so tests don't rely on Next.js internals
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, ...rest } = props;
    return React.createElement('img', { src, alt, ...rest });
  },
}));

// Mock next/navigation (if any component pulls it indirectly in future)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

// Provide minimal mediaDevices mock for components using camera APIs
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  // @ts-ignore
  navigator.mediaDevices = {
    enumerateDevices: async () => [],
    getUserMedia: async () => new MediaStream(),
  };
}

// Some files may rely on classic runtime expecting global React (tests showed ReferenceError)
// Ensure React is globally accessible for any transformed JSX needing it.
// @ts-ignore
if (!globalThis.React) globalThis.React = React;
