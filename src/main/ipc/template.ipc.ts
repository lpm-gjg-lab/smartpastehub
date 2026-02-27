import { fillTemplate, Template } from "../../productivity/template-engine";
import { IpcDependencies, SafeHandle } from "./contracts";

export function registerTemplateIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "templatesRepo">,
): void {
  safeHandle("template:fill", async (_, payload) => {
    const { id, values } = payload as {
      id: number;
      values: Record<string, string>;
    };
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
    const { name, content, variables, tags } = payload as {
      name: string;
      content: string;
      variables?: string[];
      tags?: string[];
    };
    deps.templatesRepo.create({ name, content, variables, tags });
    return true;
  });

  safeHandle("template:update", async (_, payload) => {
    const { id, name, content, variables, tags } = payload as {
      id: number;
      name: string;
      content: string;
      variables?: string[];
      tags?: string[];
    };
    deps.templatesRepo.update({ id, name, content, variables, tags });
    return true;
  });

  safeHandle("template:delete", async (_, payload) => {
    const { id } = payload as { id: number };
    deps.templatesRepo.delete(id);
    return true;
  });
}
