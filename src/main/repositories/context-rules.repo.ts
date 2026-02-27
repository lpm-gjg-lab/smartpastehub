import { Database } from "../db";

export interface ContextRuleRow {
  id: number;
  name: string;
  source_app: string | null;
  target_app: string | null;
  content_type: string | null;
  preset: string;
  transforms: string;
  priority: number;
  enabled: number;
  created_at: string;
}

export interface CreateContextRuleInput {
  name: string;
  sourceApp?: string | null;
  targetApp?: string | null;
  contentType?: string | null;
  preset: string;
  transforms: string[];
  priority?: number;
  enabled?: boolean;
}

export interface UpdateContextRuleInput extends CreateContextRuleInput {
  id: number;
}

export class ContextRulesRepository {
  constructor(private readonly db: Database) {}

  list(): ContextRuleRow[] {
    return this.db.all<ContextRuleRow>(
      "SELECT * FROM context_rules ORDER BY priority DESC, created_at DESC",
    );
  }

  create(input: CreateContextRuleInput): void {
    this.db.run(
      "INSERT INTO context_rules (name, source_app, target_app, content_type, preset, transforms, priority, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.name,
        input.sourceApp ?? null,
        input.targetApp ?? null,
        input.contentType ?? null,
        input.preset,
        JSON.stringify(input.transforms),
        input.priority ?? 0,
        input.enabled === false ? 0 : 1,
      ],
    );
  }

  update(input: UpdateContextRuleInput): void {
    this.db.run(
      "UPDATE context_rules SET name = ?, source_app = ?, target_app = ?, content_type = ?, preset = ?, transforms = ?, priority = ?, enabled = ? WHERE id = ?",
      [
        input.name,
        input.sourceApp ?? null,
        input.targetApp ?? null,
        input.contentType ?? null,
        input.preset,
        JSON.stringify(input.transforms),
        input.priority ?? 0,
        input.enabled === false ? 0 : 1,
        input.id,
      ],
    );
  }

  delete(id: number): void {
    this.db.run("DELETE FROM context_rules WHERE id = ?", [id]);
  }
}
