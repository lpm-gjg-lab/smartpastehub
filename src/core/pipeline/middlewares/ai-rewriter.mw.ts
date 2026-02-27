import { PipelineMiddleware } from "../types";

export const aiRewriterMiddleware: PipelineMiddleware = {
  id: "ai-rewriter",
  supports: (ctx) => Boolean(ctx.enableAiRewrite && ctx.aiRewrite),
  run: async (input, ctx) => {
    if (!ctx.aiRewrite) {
      return input;
    }
    return ctx.aiRewrite(input);
  },
};
