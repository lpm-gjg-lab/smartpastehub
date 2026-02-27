import { IpcDependencies, SafeHandle } from "./contracts";

export function registerUsageIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "usageStatsRepo">,
): void {
  safeHandle("usage:summary", async () => {
    return deps.usageStatsRepo.getSummary();
  });
}
