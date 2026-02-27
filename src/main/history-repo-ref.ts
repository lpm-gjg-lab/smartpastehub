import { HistoryRepository } from "./repositories/history.repo";

let _historyRepo: HistoryRepository | null = null;

export function setHistoryRepo(repo: HistoryRepository): void {
  _historyRepo = repo;
}

export function getHistoryRepo(): HistoryRepository | null {
  return _historyRepo;
}
