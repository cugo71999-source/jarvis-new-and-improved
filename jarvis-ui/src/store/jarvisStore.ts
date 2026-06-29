import { createContext, useContext, type Dispatch } from 'react';
import type { AgentId } from '../agents/agentSystem';

export type JarvisState = 'idle' | 'listening' | 'processing' | 'executing' | 'speaking';

export interface Task {
  id: string;
  name: string;
  steps: number;
  currentStep: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'waiting_confirmation';
  agentId: AgentId;
  description: string;
  output?: string;
  startedAt: number;
}

export interface ConversationMessage {
  role: 'user' | 'jarvis';
  text: string;
  time: string;
  agentId?: AgentId;
  fullOutput?: string;
}

export interface ConfirmationRequest {
  id: string;
  action: string;
  details: string;
}

export interface FileDiff {
  id: string;
  path: string;
  before: string;
  after: string;
}

export interface StoreState {
  state: JarvisState;
  cpuUsage: number[];
  memoryUsage: number[];
  tasks: Task[];
  conversation: ConversationMessage[];
  transcript: string;
  aiResponse: string;
  activeAgent: AgentId | null;
  confirmationRequest: ConfirmationRequest | null;
  fileDiff: FileDiff | null;
  isConnected: boolean;
}

export type StoreAction =
  | { type: 'SET_STATE'; payload: JarvisState }
  | { type: 'SET_CPU'; payload: number[] }
  | { type: 'SET_MEMORY'; payload: number[] }
  | { type: 'PUSH_CPU'; payload: number }
  | { type: 'PUSH_MEMORY'; payload: number }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; id: string; updates: Partial<Task> }
  | { type: 'SET_TRANSCRIPT'; payload: string }
  | { type: 'SET_AI_RESPONSE'; payload: string }
  | { type: 'SET_ACTIVE_AGENT'; payload: AgentId | null }
  | { type: 'ADD_MESSAGE'; payload: ConversationMessage }
  | { type: 'SET_CONFIRMATION'; payload: ConfirmationRequest | null }
  | { type: 'SET_FILE_DIFF'; payload: FileDiff | null }
  | { type: 'SET_CONNECTED'; payload: boolean };

export const initialState: StoreState = {
  state: 'idle',
  cpuUsage: Array(20).fill(10) as number[],
  memoryUsage: Array(20).fill(15) as number[],
  tasks: [],
  conversation: [],
  transcript: '',
  aiResponse: '',
  activeAgent: null,
  confirmationRequest: null,
  fileDiff: null,
  isConnected: false,
};

export function jarvisReducer(s: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'SET_STATE':     return { ...s, state: action.payload };
    case 'SET_CPU':       return { ...s, cpuUsage: action.payload };
    case 'SET_MEMORY':    return { ...s, memoryUsage: action.payload };
    case 'PUSH_CPU':      return { ...s, cpuUsage: [...s.cpuUsage.slice(1), action.payload] };
    case 'PUSH_MEMORY':   return { ...s, memoryUsage: [...s.memoryUsage.slice(1), action.payload] };
    case 'SET_TASKS':     return { ...s, tasks: action.payload };
    case 'ADD_TASK':      return { ...s, tasks: [...s.tasks, action.payload] };
    case 'UPDATE_TASK':   return {
      ...s,
      tasks: s.tasks.map(t => t.id === action.id ? { ...t, ...action.updates } : t),
    };
    case 'SET_TRANSCRIPT':   return { ...s, transcript: action.payload };
    case 'SET_AI_RESPONSE':  return { ...s, aiResponse: action.payload };
    case 'SET_ACTIVE_AGENT': return { ...s, activeAgent: action.payload };
    case 'ADD_MESSAGE':      return { ...s, conversation: [...s.conversation.slice(-19), action.payload] };
    case 'SET_CONFIRMATION': return { ...s, confirmationRequest: action.payload };
    case 'SET_FILE_DIFF':    return { ...s, fileDiff: action.payload };
    case 'SET_CONNECTED':    return { ...s, isConnected: action.payload };
    default: return s;
  }
}

export interface StoreAPI extends StoreState {
  setState: (s: JarvisState) => void;
  setCpuUsage: (usage: number[] | ((prev: number[]) => number[])) => void;
  setMemoryUsage: (usage: number[] | ((prev: number[]) => number[])) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (t: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  setTranscript: (s: string) => void;
  setAiResponse: (s: string) => void;
  setActiveAgent: (id: AgentId | null) => void;
  addMessage: (m: ConversationMessage) => void;
  setConfirmationRequest: (r: ConfirmationRequest | null) => void;
  setFileDiff: (d: FileDiff | null) => void;
  setIsConnected: (b: boolean) => void;
  sendVoiceInput: (text: string) => void;
  sendConfirmation: (id: string, approved: boolean) => void;
}

export const JarvisContext = createContext<StoreAPI | null>(null);

export function useJarvisStore(): StoreAPI {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvisStore must be used within JarvisProvider');
  return ctx;
}

export function buildStoreAPI(
  state: StoreState,
  dispatch: Dispatch<StoreAction>,
  wsRef: React.MutableRefObject<WebSocket | null>
): StoreAPI {
  const setState = (v: JarvisState) => dispatch({ type: 'SET_STATE', payload: v });
  const setCpuUsage = (usage: number[] | ((prev: number[]) => number[])) =>
    dispatch({ type: 'SET_CPU', payload: typeof usage === 'function' ? usage(state.cpuUsage) : usage });
  const setMemoryUsage = (usage: number[] | ((prev: number[]) => number[])) =>
    dispatch({ type: 'SET_MEMORY', payload: typeof usage === 'function' ? usage(state.memoryUsage) : usage });
  const setTasks = (tasks: Task[]) => dispatch({ type: 'SET_TASKS', payload: tasks });
  const addTask = (t: Task) => dispatch({ type: 'ADD_TASK', payload: t });
  const updateTask = (id: string, updates: Partial<Task>) => dispatch({ type: 'UPDATE_TASK', id, updates });
  const setTranscript = (v: string) => dispatch({ type: 'SET_TRANSCRIPT', payload: v });
  const setAiResponse = (v: string) => dispatch({ type: 'SET_AI_RESPONSE', payload: v });
  const setActiveAgent = (id: AgentId | null) => dispatch({ type: 'SET_ACTIVE_AGENT', payload: id });
  const addMessage = (m: ConversationMessage) => dispatch({ type: 'ADD_MESSAGE', payload: m });
  const setConfirmationRequest = (r: ConfirmationRequest | null) => dispatch({ type: 'SET_CONFIRMATION', payload: r });
  const setFileDiff = (d: FileDiff | null) => dispatch({ type: 'SET_FILE_DIFF', payload: d });
  const setIsConnected = (b: boolean) => dispatch({ type: 'SET_CONNECTED', payload: b });
  const sendVoiceInput = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'VOICE_INPUT', text }));
    }
  };
  const sendConfirmation = (id: string, approved: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CONFIRM', id, approved }));
    }
  };
  return {
    ...state,
    setState, setCpuUsage, setMemoryUsage, setTasks, addTask, updateTask,
    setTranscript, setAiResponse, setActiveAgent, addMessage,
    setConfirmationRequest, setFileDiff, setIsConnected,
    sendVoiceInput, sendConfirmation,
  };
}
