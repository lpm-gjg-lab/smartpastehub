import { Database } from "../db";

export interface RegexRuleRow {
  id: number;
  name: string;
  pattern: string;
  replacement: string;
  flags: string;
  enabled: number;
  sort_order: number;
}

export interface CreateRegexRuleInput {
  name: string;
  pattern: string;
  replacement: string;
  flags?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface UpdateRegexRuleInput extends CreateRegexRuleInput {
  id: number;
}

export class RegexRulesRepository {
  constructor(private readonly db: Database) {}

  list(): RegexRuleRow[] {
    return this.db.all<RegexRuleRow>(
      "SELECT * FROM regex_rules ORDER BY sort_order ASC, id ASC",
    );
  }

  create(input: CreateRegexRuleInput): void {
    this.db.run(
      "INSERT INTO regex_rules (name, pattern, replacement, flags, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [
        input.name,
        input.pattern,
        input.replacement,
        input.flags ?? "g",
        input.enabled === false ? 0 : 1,
        input.sortOrder ?? 0,
      ],
    );
  }

  update(input: UpdateRegexRuleInput): void {
    this.db.run(
      "UPDATE regex_rules SET name = ?, pattern = ?, replacement = ?, flags = ?, enabled = ?, sort_order = ? WHERE id = ?",
      [
        input.name,
        input.pattern,
        input.replacement,
        input.flags ?? "g",
        input.enabled === false ? 0 : 1,
        input.sortOrder ?? 0,
        input.id,
      ],
    );
  }

  delete(id: number): void {
    this.db.run("DELETE FROM regex_rules WHERE id = ?", [id]);
  }
}
