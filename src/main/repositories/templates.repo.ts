import { Database } from "../db";

export interface TemplateRow {
  id: number;
  name: string;
  content: string;
  variables: string;
  tags: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  variables?: string[];
  tags?: string[];
}

export interface UpdateTemplateInput extends CreateTemplateInput {
  id: number;
}

export class TemplatesRepository {
  constructor(private readonly db: Database) {}

  findById(id: number): TemplateRow | undefined {
    return this.db.get<TemplateRow>("SELECT * FROM templates WHERE id = ?", [
      id,
    ]);
  }

  list(): TemplateRow[] {
    return this.db.all<TemplateRow>(
      "SELECT * FROM templates ORDER BY created_at DESC",
    );
  }

  create(input: CreateTemplateInput): void {
    this.db.run(
      "INSERT INTO templates (name, content, variables, tags) VALUES (?, ?, ?, ?)",
      [
        input.name,
        input.content,
        JSON.stringify(input.variables ?? []),
        input.tags ? JSON.stringify(input.tags) : null,
      ],
    );
  }

  update(input: UpdateTemplateInput): void {
    this.db.run(
      "UPDATE templates SET name = ?, content = ?, variables = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        input.name,
        input.content,
        JSON.stringify(input.variables ?? []),
        input.tags ? JSON.stringify(input.tags) : null,
        input.id,
      ],
    );
  }

  delete(id: number): void {
    this.db.run("DELETE FROM templates WHERE id = ?", [id]);
  }
}
