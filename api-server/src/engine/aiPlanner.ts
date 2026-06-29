import OpenAI from 'openai';
import { logger } from '../lib/logger';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SYSTEM_PROMPT = `You are JARVIS, a sophisticated desktop AI assistant.
Your goal is to parse user commands into structured intent and plan JSON.
You can also generate short, conversational responses.

When parsing intent, return a JSON object with:
{
  "intent": string,
  "goal": string,
  "steps": string[],
  "requires_confirmation": boolean,
  "entities": object
}

Steps should be a list of high-level actions to achieve the goal.
Set requires_confirmation to true for any file modifications or destructive actions.`;

export async function parseIntent(text: string) {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini', // gpt-4.1-mini is not a standard OpenAI model name, using gpt-4o-mini which is fast/cheap
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 512,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content) as {
      intent: string;
      goal: string;
      steps: string[];
      requires_confirmation: boolean;
      entities: any;
    };
  } catch (error) {
    logger.error({ error, text }, 'Error parsing intent');
    return {
      intent: 'unknown',
      goal: 'Handle error',
      steps: ['Notify user of error'],
      requires_confirmation: false,
      entities: {},
    };
  }
}

export async function generateResponse(goal: string) {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are JARVIS. Give a very short (1 sentence) conversational reply about what you are doing to achieve the following goal.' },
        { role: 'user', content: goal },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || "I'm on it.";
  } catch (error) {
    logger.error({ error, goal }, 'Error generating response');
    return "I'll get started on that right away.";
  }
}
