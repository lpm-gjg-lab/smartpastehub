const fs = require('fs');

const content = `export type RewriteMode = 'fix_grammar' | 'rephrase' | 'summarize' | 'formalize';

export interface RewriteOptions {
  mode: RewriteMode;
  language: 'id' | 'en';
  provider: 'local' | 'openai' | 'gemini';
  apiKey?: string;
}

export async function rewriteText(text: string, options: RewriteOptions): Promise<string> {
  if (options.provider === 'openai' && options.apiKey) {
    try {
      const systemPrompts = {
        fix_grammar: "Fix any grammar or spelling mistakes in the following text, keeping the original meaning.",
        rephrase: "Rephrase the following text to flow better and sound natural.",
        summarize: "Summarize the following text concisely.",
        formalize: "Rewrite the following text in a professional, formal tone.",
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${options.apiKey}\`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompts[options.mode] + \` Please respond in \${options.language === 'id' ? 'Indonesian' : 'English'}.\` },
            { role: 'user', content: text }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(\`OpenAI API error: \${response.statusText}\`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.error('AI Rewrite failed:', e);
      return text;
    }
  }

  // Fallback for local or no API key
  return text;
}
`;

fs.writeFileSync('src/ai/ai-rewriter.ts', content);
