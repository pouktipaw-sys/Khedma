import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom has no canvas / matchMedia / scrollTo / clipboard — stub what the app touches.
HTMLCanvasElement.prototype.getContext = (() => null) as never;
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.scrollTo = vi.fn() as never;
window.scrollTo = vi.fn() as never;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('prefers-reduced-motion'), // tests run in reduced-motion mode
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
(globalThis as unknown as { IntersectionObserver: typeof RO }).IntersectionObserver = RO;
