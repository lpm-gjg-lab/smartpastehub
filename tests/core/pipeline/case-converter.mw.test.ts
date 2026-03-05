import { describe, expect, it } from "vitest";
import {
  toCamelCase,
  toKebabCase,
  toLowerCase,
  toPascalCase,
  toSentenceCase,
  toSnakeCase,
  toTitleCase,
  toUpperCase,
} from "../../../src/core/case-converter";

describe("case-converter core", () => {
  it("converts to upper case", () => {
    expect(toUpperCase("hello World")).toBe("HELLO WORLD");
  });

  it("converts to lower case", () => {
    expect(toLowerCase("Hello WORLD")).toBe("hello world");
  });

  it("converts to title case", () => {
    expect(toTitleCase("hello-world from_smart pasteHub")).toBe(
      "Hello World From Smart Paste Hub",
    );
  });

  it("converts to camel case", () => {
    expect(toCamelCase("hello world example_text")).toBe(
      "helloWorldExampleText",
    );
  });

  it("converts to snake case", () => {
    expect(toSnakeCase("Hello world-ExampleText")).toBe(
      "hello_world_example_text",
    );
  });

  it("converts to kebab case", () => {
    expect(toKebabCase("Hello world_exampleText")).toBe(
      "hello-world-example-text",
    );
  });

  it("converts to pascal case", () => {
    expect(toPascalCase("hello world_example-text")).toBe(
      "HelloWorldExampleText",
    );
  });

  it("converts to sentence case", () => {
    expect(toSentenceCase("hELLO WORLD from SMARTPASTEHUB")).toBe(
      "Hello world from smartpastehub",
    );
  });
});
