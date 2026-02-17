import { ContentType } from '../shared/types';

export interface AIDetectionResult {
  type: ContentType;
  confidence: number;
  suggestedPreset: string;
  suggestedActions: string[];
}

export async function detectWithAI(text: string): Promise<AIDetectionResult> {
  const sample = text.trim().slice(0, 50);
  return {
    type: sample.startsWith('{') ? 'json_data' : 'plain_text',
    confidence: 0.2,
    suggestedPreset: 'keepStructure',
    suggestedActions: [],
  };
}
