import { describe, expect, it, vi } from "vitest";
import { Database } from "../../src/main/db";
import { HistoryRepository } from "../../src/main/repositories/history.repo";
import { SnippetsRepository } from "../../src/main/repositories/snippets.repo";
import { TemplatesRepository } from "../../src/main/repositories/templates.repo";
import { ContextRulesRepository } from "../../src/main/repositories/context-rules.repo";
import { RegexRulesRepository } from "../../src/main/repositories/regex-rules.repo";
import { UsageStatsRepository } from "../../src/main/repositories/usage-stats.repo";

interface MockDb {
  run: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
}

function createMockDb(): MockDb {
  return {
    run: vi.fn(),
    all: vi.fn(),
    get: vi.fn(),
  };
}

function asDatabase(mockDb: MockDb): Database {
  return mockDb as unknown as Database;
}

describe("Main repositories", () => {
  it("HistoryRepository delegates CRUD and summary queries", () => {
    const mockDb = createMockDb();
    const repo = new HistoryRepository(asDatabase(mockDb));

    repo.create({
      originalText: "a",
      cleanedText: "b",
      htmlContent: null,
      contentType: "plain_text",
      presetUsed: "default",
      charCount: 1,
      isSensitive: true,
    });
    expect(mockDb.run).toHaveBeenCalledTimes(1);

    repo.list(2);
    repo.list(1, "needle");
    expect(mockDb.all).toHaveBeenCalledTimes(2);

    repo.pin(10, true);
    repo.delete(10);
    repo.updateCleanedText(10, "rewritten", "rephrase");
    repo.deleteMany([11, 12]);
    repo.clearAll();
    expect(mockDb.run).toHaveBeenCalledTimes(6);

    mockDb.get.mockReturnValue({ total: 5 });
    expect(repo.countAll()).toBe(5);
    repo.getRecent(50);
    expect(mockDb.all).toHaveBeenCalledTimes(3);
  });

  it("SnippetsRepository serializes tags and category", () => {
    const mockDb = createMockDb();
    const repo = new SnippetsRepository(asDatabase(mockDb));

    repo.list();
    repo.list("work");
    expect(mockDb.all).toHaveBeenCalledTimes(2);

    repo.create({ name: "s1", content: "text", tags: ["x"], category: "work" });
    repo.update({
      id: 1,
      name: "s2",
      content: "text2",
      tags: ["y"],
      category: null,
    });
    repo.delete(1);
    expect(mockDb.run).toHaveBeenCalledTimes(3);
  });

  it("TemplatesRepository handles variables and tags payloads", () => {
    const mockDb = createMockDb();
    const repo = new TemplatesRepository(asDatabase(mockDb));

    repo.findById(1);
    repo.list();
    expect(mockDb.get).toHaveBeenCalledTimes(1);
    expect(mockDb.all).toHaveBeenCalledTimes(1);

    repo.create({
      name: "t1",
      content: "Hi {name}",
      variables: ["name"],
      tags: ["demo"],
    });
    repo.update({
      id: 1,
      name: "t2",
      content: "Hello {name}",
      variables: ["name"],
      tags: [],
    });
    repo.delete(1);
    expect(mockDb.run).toHaveBeenCalledTimes(3);
  });

  it("ContextRulesRepository converts booleans and transforms", () => {
    const mockDb = createMockDb();
    const repo = new ContextRulesRepository(asDatabase(mockDb));

    repo.list();
    repo.create({
      name: "r1",
      preset: "default",
      transforms: ["strip-html"],
      enabled: true,
    });
    repo.update({
      id: 1,
      name: "r1",
      preset: "default",
      transforms: ["fix-breaks"],
      enabled: false,
    });
    repo.delete(1);

    expect(mockDb.all).toHaveBeenCalledTimes(1);
    expect(mockDb.run).toHaveBeenCalledTimes(3);
  });

  it("RegexRulesRepository performs list and mutation operations", () => {
    const mockDb = createMockDb();
    const repo = new RegexRulesRepository(asDatabase(mockDb));

    repo.list();
    repo.create({
      name: "url",
      pattern: "https?://\\S+",
      replacement: "",
      enabled: true,
    });
    repo.update({
      id: 1,
      name: "url",
      pattern: "https?://\\S+",
      replacement: "",
      enabled: false,
    });
    repo.delete(1);

    expect(mockDb.all).toHaveBeenCalledTimes(1);
    expect(mockDb.run).toHaveBeenCalledTimes(3);
  });

  it("UsageStatsRepository returns recent clips and total count", () => {
    const mockDb = createMockDb();
    const repo = new UsageStatsRepository(asDatabase(mockDb));
    const recent = [{ id: 1 }];
    mockDb.all.mockReturnValue(recent);
    mockDb.get.mockReturnValue({ total: 42 });

    const summary = repo.getSummary();

    expect(summary.recentClips).toEqual(recent);
    expect(summary.totalPastes).toBe(42);
    expect(mockDb.all).toHaveBeenCalledTimes(1);
    expect(mockDb.get).toHaveBeenCalledTimes(1);
  });
});
