import { formatData } from "../../json-formatter";
import { PipelineMiddleware } from "../types";

const SUPPORTED_TYPES = new Set(["json_data", "yaml_data", "toml_data"]);

/**
 * json-formatter middleware
 *
 * Pretty-prints minified JSON and performs lightweight indentation cleanup
 * for YAML/TOML inputs.
 */
export const jsonFormatterMiddleware: PipelineMiddleware = {
  id: "json-formatter",
  supports: (ctx) => SUPPORTED_TYPES.has(ctx.detectedType),
  run: (input, ctx) => {
    if (input.includes("\n")) {
      return input;
    }

    if (ctx.detectedType === "json_data") {
      return formatData(input, "json");
    }
    if (ctx.detectedType === "yaml_data") {
      return formatData(input, "yaml");
    }
    return formatData(input, "toml");
  },
};
