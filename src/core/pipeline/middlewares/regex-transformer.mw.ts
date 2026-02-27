import { PipelineMiddleware } from "../types";

export const regexTransformerMiddleware: PipelineMiddleware = {
  id: "regex-transformer",
  supports: (ctx) =>
    Boolean(ctx.enableRegexTransforms && ctx.regexRules?.length),
  run: (input, ctx) => {
    const rules = ctx.regexRules ?? [];
    let output = input;

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, rule.flags ?? "g");
      output = output.replace(regex, rule.replacement);
    }

    return output;
  },
};
