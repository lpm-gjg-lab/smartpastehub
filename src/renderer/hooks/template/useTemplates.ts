import { useState, useCallback, useEffect } from "react";
import { invokeIPC } from "../../lib/ipc";

export interface Template {
  id: number;
  name: string;
  content: string;
}

interface TemplateRow {
  id: number;
  name: string;
  content: string;
}

function parseTemplateVariables(content: string): string[] {
  const matches = content.match(/\{(\w+)\}/g) ?? [];
  return Array.from(
    new Set(matches.map((match) => match.replace(/[{}]/g, ""))),
  );
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
      const rows = await invokeIPC<TemplateRow[]>("template:list");
      setTemplates(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          content: row.content,
        })),
      );
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const saveTemplate = async (
    id: number | null,
    name: string,
    content: string,
  ) => {
    if (!name || !content) return;
    try {
      const payload = {
        name,
        content,
        variables: parseTemplateVariables(content),
        tags: [],
      };

      if (id !== null) {
        await invokeIPC("template:update", { id, ...payload });
      } else {
        await invokeIPC("template:create", payload);
      }
      await loadTemplates();
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  return { templates, loadTemplates, saveTemplate };
}
