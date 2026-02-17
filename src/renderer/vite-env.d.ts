/// <reference types="vite/client" />

declare global {
  interface Window {
    smartpaste: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
      on: (channel: string, listener: (event: unknown, payload: unknown) => void) => void;
    };
  }
}

export {};
