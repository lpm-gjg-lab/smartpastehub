const fs = require('fs');
let content = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8');

const snippetTarget = `  safeHandle(
    "snippet:create",
    async (_, { name, content, tags, category }) => {
      db.run(
        "INSERT INTO snippets (name, content, tags, category) VALUES (?, ?, ?, ?)",
        [name, content, tags ? JSON.stringify(tags) : null, category ?? null],
      );
      return true;
    },
  );`;

const snippetCRUD = snippetTarget + `

  safeHandle("snippet:update", async (_, { id, name, content, tags, category }) => {
    db.run(
      "UPDATE snippets SET name = ?, content = ?, tags = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, content, tags ? JSON.stringify(tags) : null, category ?? null, id]
    );
    return true;
  });

  safeHandle("snippet:delete", async (_, { id }) => {
    db.run("DELETE FROM snippets WHERE id = ?", [id]);
    return true;
  });`;

content = content.replace(snippetTarget, snippetCRUD);

const templateTarget = `  safeHandle("template:fill", async (_, { id, values }) => {
    const template = db.get<Template>("SELECT * FROM templates WHERE id = ?", [
      id,
    ]);
    if (!template) return null;
    return fillTemplate(
      {
        ...template,
        variables: JSON.parse(template.variables as unknown as string),
        tags: template.tags
          ? JSON.parse(template.tags as unknown as string)
          : [],
      } as Template,
      values as Record<string, string>,
    );
  });`;

const templateCRUD = templateTarget + `

  safeHandle("template:list", async () => {
    return db.all("SELECT * FROM templates ORDER BY created_at DESC");
  });

  safeHandle("template:create", async (_, { name, content, variables, tags }) => {
    db.run(
      "INSERT INTO templates (name, content, variables, tags) VALUES (?, ?, ?, ?)",
      [name, content, JSON.stringify(variables || []), tags ? JSON.stringify(tags) : null]
    );
    return true;
  });

  safeHandle("template:update", async (_, { id, name, content, variables, tags }) => {
    db.run(
      "UPDATE templates SET name = ?, content = ?, variables = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, content, JSON.stringify(variables || []), tags ? JSON.stringify(tags) : null, id]
    );
    return true;
  });

  safeHandle("template:delete", async (_, { id }) => {
    db.run("DELETE FROM templates WHERE id = ?", [id]);
    return true;
  });`;

content = content.replace(templateTarget, templateCRUD);

fs.writeFileSync('src/main/ipc-handlers.ts', content);
