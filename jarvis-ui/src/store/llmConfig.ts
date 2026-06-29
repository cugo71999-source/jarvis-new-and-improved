/* LLM configuration — persisted in localStorage */

export interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

const STORAGE_KEY = 'jarvis-llm-config';

export const DEFAULT_CONFIG: LLMConfig = {
  baseUrl: '/api/llm/v1',
  model: 'llama-3.3-70b-versatile',
  apiKey: '',
};

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const saved = JSON.parse(raw) as Partial<LLMConfig>;
    /* If saved config still points to old Ollama default, upgrade to server proxy */
    if (saved.baseUrl === 'http://localhost:11434/v1') {
      return { ...DEFAULT_CONFIG };
    }
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveLLMConfig(cfg: LLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/* Presets for LLM runners — cloud (recommended) and local */
export const LLM_PRESETS = [
  { name: 'Groq (Server)', url: '/api/llm/v1',                      placeholder: 'llama-3.3-70b-versatile', requiresKey: false },
  { name: 'Groq (Direct)', url: 'https://api.groq.com/openai/v1',   placeholder: 'llama-3.3-70b-versatile', requiresKey: true },
  { name: 'OpenAI',        url: 'https://api.openai.com/v1',         placeholder: 'gpt-4o-mini',             requiresKey: true },
  { name: 'Ollama',        url: 'http://localhost:11434/v1',         placeholder: 'llama3.2',                requiresKey: false },
  { name: 'LM Studio',    url: 'http://localhost:1234/v1',          placeholder: 'local-model',             requiresKey: false },
  { name: 'Custom',        url: '',                                   placeholder: 'model-name',              requiresKey: false },
];
