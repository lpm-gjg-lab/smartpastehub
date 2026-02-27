import crypto from "crypto";
import { ContentType } from "../shared/types";

interface AiGateInput {
  aiEnabled: boolean;
  provider: string;
  hasApiKey: boolean;
  strategyConfidence: number;
  detectedType: ContentType;
  textLength: number;
  aiMode?: "auto" | "fix_grammar" | "summarize" | "formalize" | "rephrase";
}

interface AiBudgetState {
  dayKey: string;
  tokensUsed: number;
  callsUsed: number;
}

const ALWAYS_PLAIN_TYPES = new Set<ContentType>([
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
  "path_text",
  "math_expression",
]);

const DAILY_TOKEN_BUDGET = 12000;
const DAILY_CALL_BUDGET = 80;
const DEFAULT_MAX_CHARS = 2600;

let budgetState: AiBudgetState = {
  dayKey: new Date().toISOString().slice(0, 10),
  tokensUsed: 0,
  callsUsed: 0,
};

const aiResultCache = new Map<string, string>();

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureBudgetDay(): void {
  const now = currentDayKey();
  if (budgetState.dayKey !== now) {
    budgetState = {
      dayKey: now,
      tokensUsed: 0,
      callsUsed: 0,
    };
    aiResultCache.clear();
  }
}

export function estimateTokenUsage(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function trimTextForAi(
  text: string,
  maxChars = DEFAULT_MAX_CHARS,
): { text: string; trimmed: boolean } {
  if (text.length <= maxChars) {
    return { text, trimmed: false };
  }

  const head = Math.floor(maxChars * 0.7);
  const tail = maxChars - head;
  const compact = `${text.slice(0, head)}\n\n...[truncated for budget]...\n\n${text.slice(-tail)}`;
  return { text: compact, trimmed: true };
}

export function shouldUseAiAssist(input: AiGateInput): {
  allowed: boolean;
  reason: string;
} {
  if (!input.aiEnabled || !input.hasApiKey || input.provider === "local") {
    return { allowed: false, reason: "ai-disabled" };
  }

  if (ALWAYS_PLAIN_TYPES.has(input.detectedType)) {
    return { allowed: false, reason: "plain-type" };
  }

  if (input.aiMode && input.aiMode !== "auto") {
    return { allowed: true, reason: "manual-mode" };
  }

  if (input.textLength < 80) {
    return { allowed: false, reason: "too-short" };
  }

  if (input.strategyConfidence < 0.33) {
    return { allowed: true, reason: "low-confidence" };
  }

  if (input.detectedType === "plain_text" && input.textLength > 420) {
    return { allowed: true, reason: "long-plain-text" };
  }

  return { allowed: false, reason: "high-confidence-noncritical" };
}

export function consumeAiBudget(tokens: number): {
  ok: boolean;
  reason?: string;
} {
  ensureBudgetDay();

  if (budgetState.callsUsed + 1 > DAILY_CALL_BUDGET) {
    return { ok: false, reason: "call-budget-exceeded" };
  }

  if (budgetState.tokensUsed + tokens > DAILY_TOKEN_BUDGET) {
    return { ok: false, reason: "token-budget-exceeded" };
  }

  budgetState.callsUsed += 1;
  budgetState.tokensUsed += tokens;
  return { ok: true };
}

export function rollbackAiBudget(tokens: number): void {
  ensureBudgetDay();
  budgetState.callsUsed = Math.max(0, budgetState.callsUsed - 1);
  budgetState.tokensUsed = Math.max(0, budgetState.tokensUsed - tokens);
}

export function getAiBudgetSnapshot(): {
  dayKey: string;
  tokensUsed: number;
  callsUsed: number;
} {
  ensureBudgetDay();
  return { ...budgetState };
}

export function buildAiCacheKey(input: {
  text: string;
  provider: string;
  model?: string;
  mode: string;
  sourceApp?: string;
  targetApp?: string;
  contentType: ContentType;
}): string {
  const raw = [
    input.provider,
    input.model ?? "",
    input.mode,
    input.sourceApp ?? "",
    input.targetApp ?? "",
    input.contentType,
    input.text,
  ].join("||");
  return crypto.createHash("sha1").update(raw).digest("hex");
}

export function getCachedAiResult(cacheKey: string): string | null {
  ensureBudgetDay();
  return aiResultCache.get(cacheKey) ?? null;
}

export function setCachedAiResult(cacheKey: string, value: string): void {
  ensureBudgetDay();
  if (aiResultCache.size > 200) {
    const oldest = aiResultCache.keys().next().value;
    if (oldest) {
      aiResultCache.delete(oldest);
    }
  }
  aiResultCache.set(cacheKey, value);
}

export function resetAiAssistStateForTests(): void {
  budgetState = {
    dayKey: currentDayKey(),
    tokensUsed: 0,
    callsUsed: 0,
  };
  aiResultCache.clear();
}
