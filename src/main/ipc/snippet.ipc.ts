import { IpcDependencies, SafeHandle } from "./contracts";
import {
  expectRecord,
  expectString,
  expectNumber,
  expectOptionalString,
} from "./validation";

export function registerSnippetIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "snippetsRepo">,
): void {
  safeHandle("snippet:list", async (_, payload) => {
    const rec =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const category =
      typeof rec["category"] === "string" ? rec["category"] : undefined;
    return deps.snippetsRepo.list(category);
  });

  safeHandle("snippet:create", async (_, payload) => {
    const rec = expectRecord(payload, "snippet:create payload");
    const name = expectString(rec["name"], "name");
    const content = expectString(rec["content"], "content");
    const tags = Array.isArray(rec["tags"])
      ? (rec["tags"] as unknown[]).map((t) => String(t))
      : undefined;
    const category =
      expectOptionalString(rec["category"], "category") ?? undefined;
    deps.snippetsRepo.create({ name, content, tags, category });
    return true;
  });

  safeHandle("snippet:update", async (_, payload) => {
    const rec = expectRecord(payload, "snippet:update payload");
    const id = expectNumber(rec["id"], "id", { integer: true });
    const name = expectString(rec["name"], "name");
    const content = expectString(rec["content"], "content");
    const tags = Array.isArray(rec["tags"])
      ? (rec["tags"] as unknown[]).map((t) => String(t))
      : undefined;
    const category =
      expectOptionalString(rec["category"], "category") ?? undefined;
    deps.snippetsRepo.update({ id, name, content, tags, category });
    return true;
  });

  safeHandle("snippet:delete", async (_, payload) => {
    const rec = expectRecord(payload, "snippet:delete payload");
    const id = expectNumber(rec["id"], "id", { integer: true });
    deps.snippetsRepo.delete(id);
    return true;
  });

  safeHandle("snippet:expand", async (_, payload) => {
    const rec =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const raw = String(rec["trigger"] ?? payload ?? "");
    const trigger = raw.replace(/^;;/, "").toLowerCase().trim();
    if (!trigger) return null;
    const all = deps.snippetsRepo.list();
    const match = all.find((s) => {
      const tags: string[] = Array.isArray(s.tags)
        ? (s.tags as unknown as string[])
        : typeof s.tags === "string" && s.tags
          ? (s.tags as string).split(",").map((t: string) => t.trim())
          : [];
      return (
        s.name.toLowerCase().startsWith(trigger) ||
        tags.some((t: string) => t.toLowerCase() === trigger)
      );
    });
    return match ? { content: match.content, name: match.name } : null;
  });
}
