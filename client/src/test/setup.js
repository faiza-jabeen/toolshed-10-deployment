import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useCatalogueStore } from '../stores/catalogueStore.js';
import { useSessionStore } from '../stores/sessionStore.js';
import { useToastStore } from '../stores/toastStore.js';

/**
 * Zustand stores are module singletons, so without this every test inherits
 * whatever the previous one left behind — the classic source of tests that
 * pass alone and fail in a suite.
 */
const initial = {
  catalogue: useCatalogueStore.getState(),
  session: useSessionStore.getState(),
  toast: useToastStore.getState(),
};

beforeEach(() => {
  useCatalogueStore.setState(initial.catalogue, true);
  useSessionStore.setState(initial.session, true);
  useToastStore.setState(initial.toast, true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
