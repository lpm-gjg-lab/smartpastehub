export type RewriteMode = 'fix_grammar' | 'rephrase' | 'summarize' | 'formalize';

export interface RewriteOptions {
  mode: RewriteMode;
  language: 'id' | 'en';
  provider: 'local' | 'openai' | 'gemini';
}

export async function rewriteText(text: string, options: RewriteOptions): Promise<string> {
  void options;
  return text;
}
