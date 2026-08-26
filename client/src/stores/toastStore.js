import { create } from 'zustand';

/**
 * Toasts were prop-drilled in task 03: App owned the queue and passed `toast`
 * down to the form, every row and the dialog. Now anything can report an
 * outcome without App knowing it exists.
 */
let seq = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  push: (tone, message) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => get().dismiss(id), tone === 'error' ? 7000 : 4000);
  },
}));

export const toast = {
  ok: (m) => useToastStore.getState().push('ok', m),
  fail: (m) => useToastStore.getState().push('error', m),
};
