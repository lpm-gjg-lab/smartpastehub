import { app } from "electron";
import * as path from "path";
import * as fs from "fs/promises";

export interface AiUsageEntry {
    ts: string;       // ISO timestamp
    provider: string;
    model: string;
    mode: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface AiUsageSummary {
    totalRequests: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    byProvider: Record<string, { requests: number; tokens: number }>;
    byModel: Record<string, { requests: number; tokens: number }>;
    byMode: Record<string, { requests: number; tokens: number }>;
    recentEntries: AiUsageEntry[];
}

let storePath: string | null = null;

function getStorePath(): string {
    if (!storePath) {
        storePath = path.join(app.getPath("userData"), "ai-usage.json");
    }
    return storePath;
}

async function readEntries(): Promise<AiUsageEntry[]> {
    try {
        const raw = await fs.readFile(getStorePath(), "utf-8");
        return JSON.parse(raw) as AiUsageEntry[];
    } catch {
        return [];
    }
}

async function writeEntries(entries: AiUsageEntry[]): Promise<void> {
    // Keep last 1000 entries max
    const trimmed = entries.slice(-1000);
    await fs.writeFile(getStorePath(), JSON.stringify(trimmed, null, 2), "utf-8");
}

export async function recordAiUsage(entry: Omit<AiUsageEntry, "ts">): Promise<void> {
    try {
        const entries = await readEntries();
        entries.push({ ts: new Date().toISOString(), ...entry });
        await writeEntries(entries);
    } catch {
        // best-effort, don't crash on usage tracking failure
    }
}

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
    const entries = await readEntries();

    const summary: AiUsageSummary = {
        totalRequests: entries.length,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        byProvider: {},
        byModel: {},
        byMode: {},
        recentEntries: entries.slice(-20).reverse(),
    };

    for (const e of entries) {
        summary.totalPromptTokens += e.promptTokens;
        summary.totalCompletionTokens += e.completionTokens;
        summary.totalTokens += e.totalTokens;

        // By provider
        const pKey = e.provider;
        if (!summary.byProvider[pKey]) {
            summary.byProvider[pKey] = { requests: 0, tokens: 0 };
        }
        (summary.byProvider[pKey] as { requests: number; tokens: number }).requests++;
        (summary.byProvider[pKey] as { requests: number; tokens: number }).tokens += e.totalTokens;

        // By model
        const mKey = e.model;
        if (!summary.byModel[mKey]) {
            summary.byModel[mKey] = { requests: 0, tokens: 0 };
        }
        (summary.byModel[mKey] as { requests: number; tokens: number }).requests++;
        (summary.byModel[mKey] as { requests: number; tokens: number }).tokens += e.totalTokens;

        // By mode
        const moKey = e.mode;
        if (!summary.byMode[moKey]) {
            summary.byMode[moKey] = { requests: 0, tokens: 0 };
        }
        (summary.byMode[moKey] as { requests: number; tokens: number }).requests++;
        (summary.byMode[moKey] as { requests: number; tokens: number }).tokens += e.totalTokens;
    }

    return summary;
}

export async function clearAiUsage(): Promise<void> {
    await writeEntries([]);
}
