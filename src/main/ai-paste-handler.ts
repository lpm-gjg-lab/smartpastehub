import { showHud } from "./hud-manager";
import { rewriteText, RewriteMode } from "../ai/ai-rewriter";
import {
  buildAiCacheKey,
  consumeAiBudget,
  estimateTokenUsage,
  getCachedAiResult,
  rollbackAiBudget,
  setCachedAiResult,
  shouldUseAiAssist,
  trimTextForAi,
} from "../ai/ai-paste-optimizer";
import { detectContentType } from "../core/content-detector";
import { AppSettings, ContentType } from "../shared/types";

export const AI_MODES = [
  "auto",
  "fix_grammar",
  "formalize",
  "rephrase",
  "summarize",
] as const;

export type AiModeCycle = (typeof AI_MODES)[number];

export function aiModeLabel(mode: string): string {
  const map: Record<string, string> = {
    auto: "Auto",
    fix_grammar: "Fix Grammar",
    formalize: "Formalize",
    rephrase: "Rephrase",
    summarize: "Summarize",
    translate: "Translate",
  };
  return map[mode] ?? mode;
}

let aiKeyErrorNotified = false;

export async function runAiRewrite(args: {
  settings: AppSettings;
  preAiStrategyConfidence: number;
  preAiDetectionType: ContentType;
  contextCleaned: string;
  baselineCleaned: string;
  copySourceApp?: string;
  activeAppName: string;
  diagnosticsMaxEvents: number;
  pushPolicyEvent: (detail: string) => void;
  incrementAiRewriteStat: () => void;
}): Promise<string> {
  const { settings } = args;
  if (
    !settings.ai.enabled ||
    !settings.ai.apiKey ||
    settings.ai.provider === "local"
  ) {
    return args.contextCleaned;
  }

  let finalCleaned = args.contextCleaned;
  let reservedTokens = 0;

  try {
    const configuredMode = settings.ai.aiMode ?? "auto";
    let chosenMode: RewriteMode = "fix_grammar";

    if (configuredMode === "auto") {
      const detected = detectContentType(args.baselineCleaned);
      if (detected.type === "email_text") {
        chosenMode = "formalize";
      } else if (detected.type === "source_code") {
        chosenMode = "fix_grammar";
      } else if (
        detected.type === "plain_text" &&
        args.baselineCleaned.length > 500
      ) {
        chosenMode = "summarize";
      }
    } else if (
      configuredMode === "fix_grammar" ||
      configuredMode === "summarize" ||
      configuredMode === "formalize" ||
      configuredMode === "rephrase"
    ) {
      chosenMode = configuredMode;
    }

    const aiGate = shouldUseAiAssist({
      aiEnabled: settings.ai.enabled,
      provider: settings.ai.provider,
      hasApiKey: Boolean(settings.ai.apiKey),
      strategyConfidence: args.preAiStrategyConfidence,
      detectedType: args.preAiDetectionType,
      textLength: args.contextCleaned.length,
      aiMode: settings.ai.aiMode,
    });

    if (aiGate.allowed) {
      const trimmed = trimTextForAi(args.contextCleaned);
      const cacheKey = buildAiCacheKey({
        text: trimmed.text,
        provider: settings.ai.provider,
        model: settings.ai.model,
        mode: chosenMode,
        sourceApp: args.copySourceApp,
        targetApp: args.activeAppName,
        contentType: args.preAiDetectionType,
      });
      const cached = getCachedAiResult(cacheKey);

      if (cached) {
        finalCleaned = cached;
      } else {
        const estimatedTokens = estimateTokenUsage(trimmed.text);
        const budget = consumeAiBudget(estimatedTokens);

        if (budget.ok) {
          reservedTokens = estimatedTokens;
          showHud(
            {
              cleaned: `⏳ AI: ${aiModeLabel(chosenMode)}…`,
              original: args.contextCleaned,
              type: "ai_processing",
            },
            15000,
          );
          const aiResult = await rewriteText(trimmed.text, {
            mode: chosenMode,
            provider: settings.ai.provider as Parameters<
              typeof rewriteText
            >[1]["provider"],
            apiKey: settings.ai.apiKey,
            baseUrl: settings.ai.baseUrl,
            model: settings.ai.model,
            language: settings.general.language,
          });
          finalCleaned = aiResult.text;
          setCachedAiResult(cacheKey, finalCleaned);
          args.incrementAiRewriteStat();
        } else {
          args.pushPolicyEvent(`AI skipped due to budget: ${budget.reason}`);
        }
      }
    } else {
      args.pushPolicyEvent(`AI skipped by gate: ${aiGate.reason}`);
    }

    if (
      chosenMode === "summarize" &&
      finalCleaned.length < args.baselineCleaned.length * 0.2
    ) {
      finalCleaned = args.contextCleaned;
    }
  } catch (error) {
    if (reservedTokens > 0) {
      rollbackAiBudget(reservedTokens);
    }
    finalCleaned = args.contextCleaned;
    const msg = error instanceof Error ? error.message : String(error);
    const isKeyError =
      msg.includes("API_KEY_INVALID") ||
      msg.includes("API key expired") ||
      msg.includes("401") ||
      (msg.includes("400") && msg.includes("key"));
    const isUrlError =
      msg.includes("non-JSON response") || msg.includes("check your Base URL");
    if (isKeyError) {
      if (!aiKeyErrorNotified) {
        aiKeyErrorNotified = true;
        showHud(
          {
            cleaned:
              "⚠️ AI rewrite skipped: your API key is expired or invalid. Please update it in Settings.",
            original: "",
            type: "system",
          },
          8000,
        );
      }
    } else if (isUrlError) {
      if (!aiKeyErrorNotified) {
        aiKeyErrorNotified = true;
        showHud(
          {
            cleaned:
              "⚠️ AI rewrite skipped: the API endpoint returned an unexpected response. Please check your Base URL in AI Settings.",
            original: "",
            type: "system",
          },
          8000,
        );
      }
    } else {
      console.error("AI Rewrite failed:", error);
    }
  }

  return finalCleaned;
}
