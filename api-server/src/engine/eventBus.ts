import { EventEmitter } from 'events';

export type JarvisEventMap = {
  VOICE_INPUT_RECEIVED: [text: string];
  INTENT_PARSED: [intent: any];
  PLAN_CREATED: [plan: any];
  TASK_STARTED: [taskId: string];
  TASK_STEP_COMPLETE: [taskId: string, step: number];
  TASK_COMPLETED: [taskId: string];
  TASK_FAILED: [taskId: string, error: string];
  ERROR_DETECTED: [error: any];
  FILE_CHANGE_REQUEST: [id: string, path: string, diff: any];
  CONFIRMATION_RECEIVED: [id: string, approved: boolean];
  STATE_CHANGE: [state: string];
  BROADCAST: [msg: any];
};

export class JarvisEventBus extends EventEmitter {
  override emit<K extends keyof JarvisEventMap>(event: K, ...args: JarvisEventMap[K]): boolean {
    return super.emit(event, ...args);
  }

  override on<K extends keyof JarvisEventMap>(event: K, listener: (...args: JarvisEventMap[K]) => void): this {
    return super.on(event, listener as any);
  }
}

export const eventBus = new JarvisEventBus();
eventBus.setMaxListeners(100);
