import { IpcDependencies, SafeHandle } from "./contracts";

export function registerSnippetIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "snippetsRepo">,
): void {
  safeHandle("snippet:list", async (_, payload) => {
    const { category } = (payload ?? {}) as { category?: string };
    return deps.snippetsRepo.list(category);
  });

  safeHandle("snippet:create", async (_, payload) => {
    const { name, content, tags, category } = payload as {
      name: string;
      content: string;
      tags?: string[];
      category?: string;
    };
    deps.snippetsRepo.create({ name, content, tags, category });
    return true;
  });

  safeHandle("snippet:update", async (_, payload) => {
    const { id, name, content, tags, category } = payload as {
      id: number;
      name: string;
      content: string;
      tags?: string[];
      category?: string;
    };
    deps.snippetsRepo.update({ id, name, content, tags, category });
    return true;
  });

  safeHandle("snippet:delete", async (_, payload) => {
    const { id } = payload as { id: number };
    deps.snippetsRepo.delete(id);
    return true;
  });
  safeHandle("snippet:expand", async (_, payload) => {
    const raw = String((payload as { trigger?: string } | null)?.trigger ?? payload ?? "");
    const trigger = raw.replace(/^;;/, "").toLowerCase().trim();
    if (!trigger) return null;
    const all = deps.snippetsRepo.list();
    const match = all.find(
      (s) => {
        const tags: string[] = Array.isArray(s.tags)
          ? (s.tags as unknown as string[])
          : typeof s.tags === "string" && s.tags
          ? (s.tags as string).split(",").map((t: string) => t.trim())
          : [];
        return (
          s.name.toLowerCase().startsWith(trigger) ||
          tags.some((t: string) => t.toLowerCase() === trigger)
        );
      }
    );
    return match ? { content: match.content, name: match.name } : null;
  });
}
