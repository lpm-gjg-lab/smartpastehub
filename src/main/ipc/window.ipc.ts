import { IpcDependencies, SafeHandle } from "./contracts";

export function registerWindowIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "createFloatingWindow">,
): void {
  safeHandle("window:open", async (_, payload) => {
    const { route, width, height } = payload as {
      route: string;
      width?: number;
      height?: number;
    };
    deps.createFloatingWindow(route, width, height);
    return true;
  });
}
