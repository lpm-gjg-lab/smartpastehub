import { ClipboardContent, ContentType } from "../../shared/types";

export interface RegexTransformRule {
  pattern: string;
  replacement: string;
  flags?: string;
}

export interface PipelineContext {
  content: ClipboardContent;
  detectedType: ContentType;
  enableRegexTransforms?: boolean;
  regexRules?: RegexTransformRule[];
  enableAiRewrite?: boolean;
  aiRewrite?: (text: string) => Promise<string>;
}

export interface PipelineMiddleware {
  id: string;
  supports: (ctx: PipelineContext) => boolean;
  run: (input: string, ctx: PipelineContext) => Promise<string> | string;
}

export interface PipelineResult {
  cleaned: string;
  appliedTransforms: string[];
}
