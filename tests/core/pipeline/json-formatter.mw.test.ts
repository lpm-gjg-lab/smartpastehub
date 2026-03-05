import { describe, expect, it } from "vitest";
import {
  formatData,
  formatJson,
  minifyJson,
} from "../../../src/core/json-formatter";
import { jsonFormatterMiddleware } from "../../../src/core/pipeline/middlewares/json-formatter.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("json-formatter middleware", () => {
  it("is active for json/yaml/toml data", () => {
    expect(jsonFormatterMiddleware.supports(ctx("json_data"))).toBe(true);
    expect(jsonFormatterMiddleware.supports(ctx("yaml_data"))).toBe(true);
    expect(jsonFormatterMiddleware.supports(ctx("toml_data"))).toBe(true);
  });

  it("is NOT active for plain text", () => {
    expect(jsonFormatterMiddleware.supports(ctx("plain_text"))).toBe(false);
  });

  it("pretty-prints minified json", async () => {
    const input = '{"a":1,"nested":{"b":2},"arr":[1,2]}';
    const result = await jsonFormatterMiddleware.run(input, ctx("json_data"));

    expect(result).toContain("\n");
    expect(result).toContain('  "a": 1');
    expect(result).toContain('  "nested": {');
    expect(result).toContain('  "arr": [');
  });

  it("leaves already formatted multiline json unchanged", async () => {
    const input = '{\n  "a": 1,\n  "b": 2\n}';
    const result = await jsonFormatterMiddleware.run(input, ctx("json_data"));
    expect(result).toBe(input);
  });
});

describe("json-formatter core", () => {
  it("formats json with indentation", () => {
    expect(formatJson('{"a":1,"b":[1,2]}')).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}',
    );
  });

  it("minifies json", () => {
    const input = '{\n  "a": 1,\n  "b": 2\n}';
    expect(minifyJson(input)).toBe('{"a":1,"b":2}');
  });

  it("returns invalid json as-is", () => {
    const invalid = '{"a": 1, }';
    expect(formatJson(invalid)).toBe(invalid);
    expect(minifyJson(invalid)).toBe(invalid);
  });

  it("runs basic cleanup for yaml and toml", () => {
    const yamlInput = "\troot:\n\t  child: value  ";
    const tomlInput = '\t[section]\n\tkey = "value"';

    expect(formatData(yamlInput, "yaml")).toBe("root:\n  child: value");
    expect(formatData(tomlInput, "toml")).toBe('[section]\nkey = "value"');
  });
});
