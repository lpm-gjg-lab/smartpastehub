import { useState, useEffect } from "react";

export function useTemplatePreview(
  rawContent: string,
  userValues: Record<string, string>,
) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!rawContent) {
      setPreview("");
      return;
    }
    const filled = rawContent.replace(
      /\{(\w+)\}/g,
      (_, key: string) => userValues[key] ?? `{${key}}`,
    );
    setPreview(filled);
  }, [rawContent, userValues]);

  return { preview };
}
