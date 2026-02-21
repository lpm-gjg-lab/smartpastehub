/// <reference types="vite/client" />

declare global {
  interface Window {
    smartpaste: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
      on: (
        channel: string,
        listener: (event: unknown, payload: unknown) => void,
      ) => () => void;
    };
    floatingAPI: {
      send: (channel: string, data?: unknown) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      invoke: (channel: string, data?: unknown) => Promise<unknown>;
    };
  }
}

export {};
