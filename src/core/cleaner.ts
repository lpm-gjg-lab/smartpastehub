import { detectContentType } from "./content-detector";
import { detectSensitiveData } from "../security/sensitive-detector";
import { logger } from "../shared/logger";
import { CleanResult, ClipboardContent } from "../shared/types";
import { createDefaultPipelineRunner } from "./pipeline/default-pipeline";
import {
  applyAfterCleanHooks,
  applyBeforeCleanHooks,
  getPluginTransformMiddlewares,
} from "../plugins/plugin-runtime";

export async function cleanContent(
  content: ClipboardContent,
): Promise<CleanResult> {
  let contentAfterHooks: ClipboardContent = content;

  try {
    contentAfterHooks = applyBeforeCleanHooks(content);
    const detection = detectContentType(
      contentAfterHooks.text,
      contentAfterHooks.html,
    );
    let cleaned = contentAfterHooks.text;
    let appliedTransforms: string[] = [];

    try {
      const pipelineRunner = createDefaultPipelineRunner(
        getPluginTransformMiddlewares(),
      );
      const pipelineResult = await pipelineRunner.run(contentAfterHooks.text, {
        content: contentAfterHooks,
        detectedType: detection.type,
        enableRegexTransforms: false,
        regexRules: [],
        enableAiRewrite: false,
      });
      cleaned = applyAfterCleanHooks(pipelineResult.cleaned);
      appliedTransforms = pipelineResult.appliedTransforms;
    } catch (error) {
      logger.warn("Cleaning failed, using raw text", {
        error,
        type: detection.type,
      });
      cleaned = contentAfterHooks.text;
      appliedTransforms = [];
    }

    try {
      const matches = detectSensitiveData(cleaned);
      if (matches.length > 0) {
        return {
          cleaned,
          securityAlert: { matches, text: cleaned },
          appliedTransforms,
        };
      }
    } catch (error) {
      logger.warn("Security scan failed, skipping", { error });
    }

    return { cleaned, securityAlert: null, appliedTransforms };
  } catch (error) {
    logger.error("Complete cleaning pipeline failed", { error });
    return {
      cleaned: contentAfterHooks.text,
      securityAlert: null,
      appliedTransforms: [],
      error,
    };
  }
}
