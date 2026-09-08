export interface AIConfig {
  provider: 'local_cli' | 'openai' | 'groq' | 'anthropic' | 'gemini';
  cliTool?: 'agy' | 'opencode' | 'claude';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function getStoredAIConfig(): AIConfig {
  if (typeof window === 'undefined') {
    return { provider: 'local_cli', cliTool: 'opencode' };
  }
  const provider = (localStorage.getItem('vibe_ai_provider') || 'local_cli') as AIConfig['provider'];
  const cliTool = (localStorage.getItem('vibe_cli_tool') || 'opencode') as AIConfig['cliTool'];
  const apiKey = localStorage.getItem(`vibe_key_${provider}`) || '';
  const baseUrl = localStorage.getItem('vibe_local_url') || 'http://localhost:4242';
  const model = localStorage.getItem('vibe_local_model') || '';

  return { provider, cliTool, apiKey, baseUrl, model };
}

export async function checkCompanionHealth(fallbackUrl = 'http://localhost:4242'): Promise<{
  online: boolean;
  tools: { agy: boolean; opencode: boolean; claude: boolean; ollama: boolean };
}> {
  // Try embedded Vite dev server API first
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return { online: true, tools: data.tools || {} };
    }
  } catch {}

  // Fallback to standalone port 4242 if running separately
  try {
    const res = await fetch(`${fallbackUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return { online: true, tools: data.tools || {} };
    }
  } catch {}

  return { online: false, tools: { agy: false, opencode: false, claude: false, ollama: false } };
}

export async function executeAIPrompt(prompt: string, config?: AIConfig): Promise<string> {
  const cfg = config || getStoredAIConfig();

  if (cfg.provider === 'local_cli') {
    // 1. Try Vite embedded server first (/api/analyze)
    try {
      const embeddedRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: cfg.cliTool || 'opencode',
          prompt,
        }),
      });
      if (embeddedRes.ok) {
        const data = await embeddedRes.json();
        if (data.output) return data.output;
      }
    } catch {}

    // 2. Try standalone port 4242 companion server
    const serverUrl = cfg.baseUrl || 'http://localhost:4242';
    const res = await fetch(`${serverUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: cfg.cliTool || 'opencode',
        prompt,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || `Companion server returned ${res.status}`);
    }
    const data = await res.json();
    return data.output || '';
  }

  if (cfg.provider === 'openai' || cfg.provider === 'groq' || cfg.provider === 'gemini') {
    const endpoint = cfg.provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : cfg.provider === 'gemini'
      ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const defaultModel = cfg.provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : cfg.provider === 'gemini'
      ? 'gemini-2.0-flash'
      : 'gpt-4o-mini';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || defaultModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API request failed with ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (cfg.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.model || 'claude-3-5-sonnet-latest',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic failed with ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  throw new Error(`Provider ${cfg.provider} not supported`);
}

export function extractJsonFromResponse<T>(raw: string): T {
  let cleaned = raw.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    const lastFence = cleaned.lastIndexOf('```');
    if (firstNewline !== -1 && lastFence !== -1 && lastFence > firstNewline) {
      cleaned = cleaned.substring(firstNewline + 1, lastFence).trim();
    }
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt greedy object extraction
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }
    throw new Error('AI output did not contain valid JSON');
  }
}
