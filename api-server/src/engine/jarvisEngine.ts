import type { WebSocketServer } from 'ws';
import { eventBus } from './eventBus';
import { parseIntent, generateResponse } from './aiPlanner';
import { taskEngine } from './taskEngine';
import { safetyLayer } from './safetyLayer';
import { logger } from '../lib/logger';

export class JarvisEngine {
  private wss?: WebSocketServer;

  attachWss(wss: WebSocketServer): void {
    this.wss = wss;
  }

  broadcast(msg: any): void {
    eventBus.emit('BROADCAST', msg);
  }

  async processVoiceInput(text: string): Promise<void> {
    try {
      this.broadcast({ type: 'STATE_CHANGE', state: 'processing' });
      this.broadcast({ type: 'TRANSCRIPT', text });

      const intentData = await parseIntent(text);
      const aiResponse = await generateResponse(intentData.goal);
      
      this.broadcast({ type: 'AI_RESPONSE', text: aiResponse });
      this.broadcast({ type: 'PLAN', plan: { goal: intentData.goal, steps: intentData.steps, requires_confirmation: intentData.requires_confirmation } });

      let approved = true;
      if (intentData.requires_confirmation) {
        approved = await safetyLayer.requestConfirmation('PLAN_EXECUTION', `Execute plan: ${intentData.goal}`);
      }

      if (approved) {
        this.broadcast({ type: 'STATE_CHANGE', state: 'executing' });
        
        const task = taskEngine.enqueue({
          id: Math.random().toString(36).substring(7),
          name: intentData.goal,
          steps: intentData.steps,
        });

        taskEngine.startNext();
        
        // In a real system, we'd wait for task completion. 
        // Here, the taskEngine handles its own step-by-step broadcast.
        // We'll just transition back to idle after a while or when the task engine completes.
        
        const onTaskComplete = (taskId: string) => {
          if (taskId === task.id) {
            this.broadcast({ type: 'STATE_CHANGE', state: 'speaking' });
            setTimeout(() => {
              this.broadcast({ type: 'STATE_CHANGE', state: 'idle' });
            }, 3000);
            eventBus.removeListener('TASK_COMPLETED', onTaskComplete);
          }
        };
        eventBus.on('TASK_COMPLETED', onTaskComplete);

      } else {
        this.broadcast({ type: 'STATE_CHANGE', state: 'idle' });
      }
    } catch (error) {
      logger.error({ error }, 'Error in processVoiceInput');
      this.broadcast({ type: 'ERROR', message: 'Something went wrong processing your request.' });
      this.broadcast({ type: 'STATE_CHANGE', state: 'idle' });
    }
  }

  handleConfirmation(id: string, approved: boolean): void {
    safetyLayer.receiveConfirmation(id, approved);
  }

  startMetrics(): void {
    setInterval(() => {
      this.broadcast({
        type: 'SYSTEM_METRICS',
        cpu: Math.floor(Math.random() * 20) + 10,
        memory: Math.floor(Math.random() * 30) + 40,
      });
    }, 2000);
  }
}
