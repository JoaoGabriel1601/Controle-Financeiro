import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  items: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, tone = 'info') => {
    const id = Math.random().toString(36).slice(2, 10);
    set((state) => ({ items: [...state.items, { id, message, tone }] }));
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().push(msg, 'success'),
  error: (msg: string) => useToastStore.getState().push(msg, 'error'),
  info: (msg: string) => useToastStore.getState().push(msg, 'info'),
};
