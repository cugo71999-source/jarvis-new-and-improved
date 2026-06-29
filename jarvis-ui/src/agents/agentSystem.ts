/* ══════════════════════════════════════════════════════════════════════════════
   JARVIS Multi-Agent System — Execution Pipeline
   
   Flow: User input → JARVIS Router → Agent execution → Debug loop → Save → Synthesis
══════════════════════════════════════════════════════════════════════════════ */

import { loadLLMConfig } from '../store/llmConfig';
import {
  JARVIS_ROUTER_PROMPT,
  CODING_AGENT_PROMPT,
  DEBUGGING_AGENT_PROMPT,
  DESIGN_AGENT_PROMPT,
  SYSTEM_AGENT_PROMPT,
  REPAIR_AGENT_PROMPT,
  JARVIS_SYNTHESIS_PROMPT,
} from './systemPrompts';
import {
  parseProjectOutput, saveProject, loadProjects,
  type Project, type ProjectFile,
} from './projectStore';

/* ── Agent model assignment ───────────────────────────────────────────────
   qwen/qwen3-32b has only 6K TPM on Groq free tier — too small for coding.
   llama-3.3-70b-versatile has 12K TPM and is excellent at code generation.
────────────────────────────────────────────────────────────────────────── */
const AGENT_MODELS: Record<string, string> = {
  router:    'llama-3.3-70b-versatile',  // Best reasoning for routing decisions
  coding:    'llama-3.3-70b-versatile',  // Strong coder, 12K TPM (free tier safe)
  debugging: 'llama-3.3-70b-versatile',  // Strong code reviewer, 12K TPM
  design:    'llama-3.3-70b-versatile',  // Best creative + structured output
  system:    'llama-3.1-8b-instant',     // Fast responses for system tasks
  repair:    'llama-3.3-70b-versatile',  // Deep analytical reasoning
};

export type AgentId = 'core' | 'coding' | 'debugging' | 'design' | 'system' | 'repair';

export interface Message { role: 'user' | 'assistant'; content: string }

export interface AgentCallbacks {
  onAck:            (text: string) => void;
  onAgentStart:     (agentId: AgentId, taskName: string, taskId: string) => void;
  onAgentProgress:  (taskId: string, step: number, total: number, label?: string) => void;
  onAgentComplete:  (taskId: string, output: string) => void;
  onDirectResponse: (text: string) => void;
}

/* ── Agent metadata ─────────────────────────────────────────────────────────── */
export const AGENT_META: Record<AgentId, { name: string; color: string; icon: string }> = {
  core:      { name: 'JARVIS Core',        color: '#00d4ff', icon: '◈' },
  coding:    { name: 'Coding Agent',        color: '#3b82f6', icon: '⌨' },
  debugging: { name: 'Debugging Agent',     color: '#f59e0b', icon: '🔍' },
  design:    { name: 'Design Agent',        color: '#8b5cf6', icon: '◉' },
  system:    { name: 'System Agent',        color: '#f59e0b', icon: '⚙' },
  repair:    { name: 'Self Repair Agent',   color: '#22c55e', icon: '⚕' },
};

/* ── Low-level LLM call ─────────────────────────────────────────────────────── */
async function callLLM(
  systemPrompt: string,
  history: Message[],
  userMessage: string,
  agentKey: string,
  maxTokens = 1200,
  temperature = 0.7,
): Promise<string> {
  const cfg = loadLLMConfig();
  const baseUrl = cfg.baseUrl.replace(/\/$/, '');

  /* Per-agent model — override config model */
  const model = AGENT_MODELS[agentKey] ?? cfg.model;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM error ${res.status} (${model}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('Empty response from LLM');
  return reply;
}

/* ── Parse JARVIS routing decision ─────────────────────────────────────────── */
type RouteDecision =
  | { type: 'direct'; response: string }
  | { type: 'agent'; agent: AgentId; task: string; ack: string }

function parseRouterResponse(text: string): RouteDecision {
  const tryParse = (s: string): RouteDecision | null => {
    try {
      const parsed = JSON.parse(s.trim());
      if (parsed?.route === 'agent' && parsed?.agent && parsed?.task) {
        return { type: 'agent', agent: parsed.agent as AgentId, task: parsed.task, ack: parsed.ack ?? 'On it.' };
      }
    } catch { /* continue */ }
    return null;
  };

  const direct = tryParse(text);
  if (direct) return direct;

  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeMatch) { const r = tryParse(codeMatch[1]); if (r) return r; }

  const objMatch = text.match(/\{[\s\S]*?\}/);
  if (objMatch) { const r = tryParse(objMatch[0]); if (r) return r; }

  return { type: 'direct', response: text };
}

/* ── Debug agent result ─────────────────────────────────────────────────────── */
interface DebugResult {
  ok: boolean;
  issues?: string[];
}

function parseDebugResult(text: string): DebugResult {
  const tryParse = (s: string): DebugResult | null => {
    try {
      const parsed = JSON.parse(s.trim());
      if (parsed?.status === 'ok') return { ok: true };
      if (parsed?.status === 'errors' && Array.isArray(parsed.issues)) {
        return { ok: false, issues: parsed.issues };
      }
    } catch { /* continue */ }
    return null;
  };

  const direct = tryParse(text);
  if (direct) return direct;

  const objMatch = text.match(/\{[\s\S]*?\}/);
  if (objMatch) { const r = tryParse(objMatch[0]); if (r) return r; }

  /* If we can't parse it, assume ok (better than infinite loops) */
  return { ok: true };
}

/* ── Design agent call (used by coding agent for UI specs) ──────────────────── */
async function callDesignAgent(designTask: string): Promise<string> {
  return callLLM(DESIGN_AGENT_PROMPT, [], designTask, 'design', 2500, 0.75);
}

/* ── Repair agent context builder ───────────────────────────────────────────── */
function buildRepairContext(task: string): string {
  const projects = loadProjects();
  if (projects.length === 0) return task;

  const recent = projects.slice(0, 3);
  const filesummary = recent.map(p =>
    `Project: ${p.name}\nFiles: ${p.files.map(f => f.path).join(', ')}`
  ).join('\n\n');

  return `${task}\n\n---\nAVAILABLE PROJECT FILES IN JARVIS:\n${filesummary}`;
}

/* ── Main entry point ───────────────────────────────────────────────────────── */
export async function processRequest(
  userInput: string,
  history: Message[],
  callbacks: AgentCallbacks,
): Promise<{ response: string; agentId: AgentId; fullOutput?: string }> {

  /* ── Step 1: JARVIS Core routes the request ── */
  let routerResponse: string;
  try {
    routerResponse = await callLLM(JARVIS_ROUTER_PROMPT, history, userInput, 'router', 400, 0.4);
  } catch (err: any) {
    throw new Error(`Can't connect to ${loadLLMConfig().baseUrl} — make sure your LLM is running. ${err.message}`);
  }

  const decision = parseRouterResponse(routerResponse);

  /* ── Direct response (simple conversation) ── */
  if (decision.type === 'direct') {
    callbacks.onDirectResponse(decision.response);
    return { response: decision.response, agentId: 'core' };
  }

  /* ── Agent task ── */
  const { agent, task, ack } = decision;
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const agentMeta = AGENT_META[agent] ?? AGENT_META.core;

  callbacks.onAck(ack);
  callbacks.onAgentStart(agent, `${agentMeta.name}: ${task.slice(0, 60)}${task.length > 60 ? '…' : ''}`, taskId);

  /* ══════════════════════════════════════════════════════════════
     CODING AGENT — full pipeline with debug loop + project save
  ══════════════════════════════════════════════════════════════ */
  if (agent === 'coding') {
    const TOTAL_STEPS = 8;
    let step = 1;

    /* Step 1: Only call Design Agent for complex, visually-driven UI applications.
       NOT for: APIs, scripts, CLIs, backend services, quick utility tools.
       YES for: websites, dashboards, landing pages, portfolio sites, admin panels. */
    const DESIGN_TRIGGERS = /\b(website|landing page|portfolio|dashboard|admin panel|web app with ui|storefront|saas app|beautiful|modern ui|responsive design|animated ui|glassmorphism|dark theme app)\b/i;
    const BACKEND_SIGNALS  = /\b(api|rest api|graphql|cli|command.?line|script|backend|server|bot|scraper|library|package|algorithm|data pipeline|webhook|cron|worker)\b/i;
    const needsDesign = DESIGN_TRIGGERS.test(task) && !BACKEND_SIGNALS.test(task);
    let designSpec = '';

    if (needsDesign) {
      callbacks.onAgentProgress(taskId, step++, TOTAL_STEPS, 'Design Agent generating UI spec…');
      try {
        designSpec = await callDesignAgent(
          `Design the UI for this application:\n${task}\n\nProvide a complete design specification that the Coding Agent can implement exactly.`
        );
      } catch {
        /* Non-fatal — continue without design spec */
      }
    } else {
      step++;
    }

    /* Step 2: Coding Agent builds the project */
    callbacks.onAgentProgress(taskId, step++, TOTAL_STEPS, 'Coding Agent writing code…');

    const codingPrompt = designSpec
      ? `Build this application:\n${task}\n\n---\nDESIGN SPECIFICATION (implement this exactly):\n${designSpec}`
      : task;

    let codingOutput: string;
    try {
      codingOutput = await callLLM(CODING_AGENT_PROMPT, [], codingPrompt, 'coding', 5500, 0.72);
    } catch (err: any) {
      callbacks.onAgentComplete(taskId, `Coding Agent error: ${err.message}`);
      throw err;
    }

    callbacks.onAgentProgress(taskId, step++, TOTAL_STEPS, 'Parsing project files…');

    /* Parse files from coding output */
    const parsed = parseProjectOutput(codingOutput);

    /* Create initial project record */
    const project: Project = {
      id: `proj_${Date.now()}`,
      name: parsed.name || task.slice(0, 40),
      description: parsed.description || task,
      files: parsed.files,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'debugging',
      taskId,
      debugLog: [],
    };

    if (parsed.files.length > 0) {
      saveProject({ ...project, status: 'debugging' });
    }

    /* ── Debug loop — up to 3 rounds ── */
    const MAX_DEBUG_ROUNDS = 3;
    let currentOutput = codingOutput;
    let currentFiles = parsed.files;

    for (let round = 0; round < MAX_DEBUG_ROUNDS; round++) {
      callbacks.onAgentProgress(taskId, step, TOTAL_STEPS, `Debugging Agent reviewing code (round ${round + 1})…`);

      /* Build review context */
      const filesSummary = currentFiles
        .map(f => `### FILE: ${f.path}\n\`\`\`${f.language}\n${f.content}\`\`\``)
        .join('\n\n');

      const reviewPrompt = `Review this code for project: "${project.name}"\nTask: ${task}\n\n${filesSummary}`;

      let debugResponse: string;
      try {
        debugResponse = await callLLM(DEBUGGING_AGENT_PROMPT, [], reviewPrompt, 'debugging', 1500, 0.2);
      } catch {
        /* If debugger fails, skip remaining rounds */
        break;
      }

      const debugResult = parseDebugResult(debugResponse);
      project.debugLog = project.debugLog ?? [];
      project.debugLog.push(`Round ${round + 1}: ${debugResult.ok ? 'OK' : `${debugResult.issues?.length ?? 0} issues found`}`);

      if (debugResult.ok) {
        /* Code is good — exit loop */
        callbacks.onAgentProgress(taskId, step + 1, TOTAL_STEPS, 'Debugging Agent: code is clean ✓');
        break;
      }

      /* Issues found — send back to coding agent for fixes */
      const issuesList = debugResult.issues?.join('\n- ') ?? 'Unknown issues';
      callbacks.onAgentProgress(taskId, step, TOTAL_STEPS, `Coding Agent fixing ${debugResult.issues?.length ?? '?'} issues…`);

      const fixPrompt = `Fix the following issues in the project "${project.name}":\n\nOriginal task: ${task}\n\nISSUES FOUND BY DEBUGGING AGENT:\n- ${issuesList}\n\nHere is the current code:\n${filesSummary}\n\nOutput the COMPLETE fixed code in the same FILE: format. Fix every issue listed.`;

      try {
        const fixedOutput = await callLLM(CODING_AGENT_PROMPT, [], fixPrompt, 'coding', 5500, 0.65);
        const fixedParsed = parseProjectOutput(fixedOutput);
        if (fixedParsed.files.length > 0) {
          currentOutput = fixedOutput;
          currentFiles = fixedParsed.files;
        }
      } catch {
        /* If fix fails, break */
        break;
      }
    }

    step = Math.min(step + 2, TOTAL_STEPS - 1);

    /* Save final project */
    project.files = currentFiles;
    project.status = 'complete';
    project.updatedAt = Date.now();
    if (project.files.length > 0) {
      saveProject(project);
    }

    callbacks.onAgentProgress(taskId, TOTAL_STEPS, TOTAL_STEPS, 'Project saved to Projects ✓');
    callbacks.onAgentComplete(taskId, currentOutput);

    /* Synthesis */
    let spokenSummary: string;
    try {
      spokenSummary = await callLLM(
        JARVIS_SYNTHESIS_PROMPT, [],
        `Agent: Coding Agent\nTask: ${task}\nFiles built: ${project.files.map(f => f.path).join(', ')}\nDebug rounds: ${project.debugLog?.length ?? 0}`,
        'router', 80, 0.6
      );
    } catch {
      spokenSummary = `The Coding Agent has completed the project "${project.name}" — ${project.files.length} files built and saved to Projects, sir.`;
    }

    return { response: spokenSummary, agentId: 'coding', fullOutput: currentOutput };
  }

  /* ══════════════════════════════════════════════════════════════
     REPAIR AGENT — gets context of all stored project files
  ══════════════════════════════════════════════════════════════ */
  if (agent === 'repair') {
    callbacks.onAgentProgress(taskId, 1, 4, 'Loading project context…');
    const enrichedTask = buildRepairContext(task);

    callbacks.onAgentProgress(taskId, 2, 4, 'Diagnosing issue…');
    let repairOutput: string;
    try {
      repairOutput = await callLLM(REPAIR_AGENT_PROMPT, [], enrichedTask, 'repair', 3000, 0.65);
    } catch (err: any) {
      callbacks.onAgentComplete(taskId, `Repair Agent error: ${err.message}`);
      throw err;
    }

    callbacks.onAgentProgress(taskId, 4, 4, 'Repair complete');
    callbacks.onAgentComplete(taskId, repairOutput);

    let spokenSummary: string;
    try {
      spokenSummary = await callLLM(
        JARVIS_SYNTHESIS_PROMPT, [],
        `Agent: Self Repair Agent\nTask: ${task}\nOutput preview: ${repairOutput.slice(0, 400)}`,
        'router', 80, 0.6
      );
    } catch {
      spokenSummary = `Self Repair Agent has completed the diagnostic and repair procedure, sir.`;
    }

    return { response: spokenSummary, agentId: 'repair', fullOutput: repairOutput };
  }

  /* ══════════════════════════════════════════════════════════════
     DESIGN / SYSTEM agents — standard 4-step flow
  ══════════════════════════════════════════════════════════════ */
  const AGENT_PROMPTS: Record<string, string> = {
    design: DESIGN_AGENT_PROMPT,
    system: SYSTEM_AGENT_PROMPT,
  };

  callbacks.onAgentProgress(taskId, 1, 4, 'Agent starting…');

  let agentOutput: string;
  try {
    callbacks.onAgentProgress(taskId, 2, 4, 'Processing task…');
    agentOutput = await callLLM(
      AGENT_PROMPTS[agent] ?? REPAIR_AGENT_PROMPT,
      [],
      task,
      agent,
      3000,
      0.72,
    );
    callbacks.onAgentProgress(taskId, 3, 4, 'Finalizing output…');
  } catch (err: any) {
    callbacks.onAgentComplete(taskId, `Error: ${err.message}`);
    throw err;
  }

  let spokenSummary: string;
  try {
    spokenSummary = await callLLM(
      JARVIS_SYNTHESIS_PROMPT, [],
      `Agent: ${agentMeta.name}\nTask: ${task}\nOutput preview: ${agentOutput.slice(0, 600)}`,
      'router', 80, 0.6
    );
  } catch {
    spokenSummary = `${agentMeta.name} has completed the task. Full output is in the conversation panel, sir.`;
  }

  callbacks.onAgentProgress(taskId, 4, 4, 'Complete');
  callbacks.onAgentComplete(taskId, agentOutput);

  return { response: spokenSummary, agentId: agent, fullOutput: agentOutput };
}
