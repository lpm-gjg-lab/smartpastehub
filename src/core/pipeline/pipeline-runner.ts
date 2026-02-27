import { PipelineContext, PipelineMiddleware, PipelineResult } from "./types";

export class PipelineRunner {
  constructor(private readonly middlewares: PipelineMiddleware[]) {}

  async run(initial: string, ctx: PipelineContext): Promise<PipelineResult> {
    let current = initial;
    const appliedTransforms: string[] = [];

    for (const middleware of this.middlewares) {
      if (!middleware.supports(ctx)) {
        continue;
      }
      current = await middleware.run(current, ctx);
      appliedTransforms.push(middleware.id);
    }

    return {
      cleaned: current,
      appliedTransforms,
    };
  }
}
