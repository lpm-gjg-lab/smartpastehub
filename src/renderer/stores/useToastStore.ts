import { create } from "zustand";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: "success" | "warning" | "error" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
}

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION = 3000;

interface ToastTimerState {
  timeoutId: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
  paused: boolean;
}

const timerStates = new Map<string, ToastTimerState>();

function clearTimer(id: string): void {
  const timer = timerStates.get(id);
  if (!timer) return;
  if (timer.timeoutId) {
    clearTimeout(timer.timeoutId);
  }
  timerStates.delete(id);
}

function removeToastById(
  set: (
    partial: Partial<ToastState> | ((state: ToastState) => Partial<ToastState>),
  ) => void,
  id: string,
): void {
  clearTimer(id);
  set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  }));
}

function startTimer(
  set: (
    partial: Partial<ToastState> | ((state: ToastState) => Partial<ToastState>),
  ) => void,
  id: string,
  durationMs: number,
): void {
  clearTimer(id);
  const startedAt = Date.now();
  const timeoutId = setTimeout(() => {
    removeToastById(set, id);
  }, durationMs);

  timerStates.set(id, {
    timeoutId,
    remainingMs: durationMs,
    startedAt,
    paused: false,
  });
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => {
      const next = [...state.toasts, { ...toast, id }];
      const overflow = Math.max(0, next.length - MAX_VISIBLE_TOASTS);
      if (overflow > 0) {
        const removed = next.slice(0, overflow);
        for (const item of removed) {
          clearTimer(item.id);
        }
      }

      return {
        toasts: next.slice(-MAX_VISIBLE_TOASTS),
      };
    });

    if (toast.duration !== 0) {
      startTimer(set, id, toast.duration ?? DEFAULT_DURATION);
    }
  },
  removeToast: (id) => {
    removeToastById(set, id);
  },
  pauseToast: (id) => {
    const timer = timerStates.get(id);
    if (!timer || timer.paused || !timer.timeoutId) {
      return;
    }

    clearTimeout(timer.timeoutId);
    const elapsed = Date.now() - timer.startedAt;
    timer.remainingMs = Math.max(0, timer.remainingMs - elapsed);
    timer.timeoutId = null;
    timer.paused = true;
  },
  resumeToast: (id) => {
    const timer = timerStates.get(id);
    if (!timer || !timer.paused) {
      return;
    }

    if (timer.remainingMs <= 0) {
      removeToastById(set, id);
      return;
    }

    timer.startedAt = Date.now();
    timer.paused = false;
    timer.timeoutId = setTimeout(() => {
      removeToastById(set, id);
    }, timer.remainingMs);
  },
}));
