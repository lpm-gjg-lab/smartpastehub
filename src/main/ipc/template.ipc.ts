import { fillTemplate, Template } from "../../productivity/template-engine";
import { IpcDependencies, SafeHandle } from "./contracts";
import {
  expectRecord,
  expectString,
  expectNumber,
} from "./validation";

export function registerTemplateIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "templatesRepo">,
): void {
  safeHandle("template:fill", async (_, payload) => {
    const rec = expectRecord(payload, "template:fill payload");
    const id = expectNumber(rec["id"], "id", { integer: true });
    const values = rec["values"] as Record<string, string>;
    if (!values || typeof values !== "object") {
      throw new Error("values must be an object");
    }
    const template = deps.templatesRepo.findById(id) as unknown as
      | Template
      | undefined;
    if (!template) {
      return null;
    }

    return fillTemplate(
      {
        ...template,
        variables: JSON.parse(template.variables as unknown as string),
        tags: template.tags
          ? JSON.parse(template.tags as unknown as string)
          : [],
      } as Template,
      values,
    );
  });

  safeHandle("template:list", async () => deps.templatesRepo.list());

  safeHandle("template:create", async (_, payload) => {
    const rec = expectRecord(payload, "template:create payload");
    const name = expectString(rec["name"], "name");
    const content = expectString(rec["content"], "content");
    const variables = Array.isArray(rec["variables"])
      ? (rec["variables"] as unknown[]).map((v) => String(v))
      : undefined;
    const tags = Array.isArray(rec["tags"])
      ? (rec["tags"] as unknown[]).map((t) => String(t))
      : undefined;
    deps.templatesRepo.create({ name, content, variables, tags });
    return true;
  });

  safeHandle("template:update", async (_, payload) => {
    const rec = expectRecord(payload, "template:update payload");
    const id = expectNumber(rec["id"], "id", { integer: true });
    const name = expectString(rec["name"], "name");
    const content = expectString(rec["content"], "content");
    const variables = Array.isArray(rec["variables"])
      ? (rec["variables"] as unknown[]).map((v) => String(v))
      : undefined;
    const tags = Array.isArray(rec["tags"])
      ? (rec["tags"] as unknown[]).map((t) => String(t))
      : undefined;
    deps.templatesRepo.update({ id, name, content, variables, tags });
    return true;
  });

  safeHandle("template:delete", async (_, payload) => {
    const rec = expectRecord(payload, "template:delete payload");
    const id = expectNumber(rec["id"], "id", { integer: true });
    deps.templatesRepo.delete(id);
    return true;
  });
}
