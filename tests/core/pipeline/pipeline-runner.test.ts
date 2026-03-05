import { describe, expect, it, vi } from "vitest";
import { PipelineRunner } from "../../../src/core/pipeline/pipeline-runner";
import { PipelineMiddleware } from "../../../src/core/pipeline/types";

describe("pipeline-runner", () => {
  it("executes middlewares in declaration order", async () => {
    const order: string[] = [];
    const first: PipelineMiddleware = {
      id: "first",
      supports: () => true,
      run: (input) => {
        order.push("first");
        return `${input}-1`;
      },
    };
    const second: PipelineMiddleware = {
      id: "second",
      supports: () => true,
      run: async (input) => {
        order.push("second");
        return `${input}-2`;
      },
    };

    const runner = new PipelineRunner([first, second]);
    const result = await runner.run("start", {
      content: { text: "start" },
      detectedType: "plain_text",
    });

    expect(order).toEqual(["first", "second"]);
    expect(result.cleaned).toBe("start-1-2");
    expect(result.appliedTransforms).toEqual(["first", "second"]);
  });

  it("skips middlewares that do not support current context", async () => {
    const skippedRun = vi.fn((input: string) => `${input}-skip`);
    const supportedRun = vi.fn((input: string) => `${input}-ok`);

    const skipped: PipelineMiddleware = {
      id: "skipped",
      supports: () => false,
      run: skippedRun,
    };
    const supported: PipelineMiddleware = {
      id: "supported",
      supports: (ctx) => ctx.detectedType === "plain_text",
      run: supportedRun,
    };

    const runner = new PipelineRunner([skipped, supported]);
    const result = await runner.run("base", {
      content: { text: "base" },
      detectedType: "plain_text",
    });

    expect(skippedRun).not.toHaveBeenCalled();
    expect(supportedRun).toHaveBeenCalledTimes(1);
    expect(result.cleaned).toBe("base-ok");
    expect(result.appliedTransforms).toEqual(["supported"]);
  });

  it("returns initial content unchanged when all middlewares are unsupported", async () => {
    const runner = new PipelineRunner([
      {
        id: "never-a",
        supports: () => false,
        run: (input) => `${input}-a`,
      },
      {
        id: "never-b",
        supports: () => false,
        run: (input) => `${input}-b`,
      },
    ]);

    const result = await runner.run("raw", {
      content: { text: "raw" },
      detectedType: "unknown",
    });

    expect(result.cleaned).toBe("raw");
    expect(result.appliedTransforms).toEqual([]);
  });
});
