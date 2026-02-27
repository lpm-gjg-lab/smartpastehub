import { Database } from "../db";

export interface SnippetRow {
  id: number;
  name: string;
  content: string;
  tags: string | null;
  category: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSnippetInput {
  name: string;
  content: string;
  tags?: string[];
  category?: string | null;
}

export interface UpdateSnippetInput extends CreateSnippetInput {
  id: number;
}

export class SnippetsRepository {
  constructor(private readonly db: Database) {}

  list(category?: string): SnippetRow[] {
    if (category) {
      return this.db.all<SnippetRow>(
        "SELECT * FROM snippets WHERE category = ? ORDER BY created_at DESC",
        [category],
      );
    }

    return this.db.all<SnippetRow>(
      "SELECT * FROM snippets ORDER BY created_at DESC",
    );
  }

  create(input: CreateSnippetInput): void {
    this.db.run(
      "INSERT INTO snippets (name, content, tags, category) VALUES (?, ?, ?, ?)",
      [
        input.name,
        input.content,
        input.tags ? JSON.stringify(input.tags) : null,
        input.category ?? null,
      ],
    );
  }

  update(input: UpdateSnippetInput): void {
    this.db.run(
      "UPDATE snippets SET name = ?, content = ?, tags = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [
        input.name,
        input.content,
        input.tags ? JSON.stringify(input.tags) : null,
        input.category ?? null,
        input.id,
      ],
    );
  }

  delete(id: number): void {
    this.db.run("DELETE FROM snippets WHERE id = ?", [id]);
  }
}
