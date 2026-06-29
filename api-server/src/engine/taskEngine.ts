import { eventBus } from './eventBus';

export interface Task {
  id: string;
  name: string;
  steps: string[];
  currentStep: number;
  status: 'queued' | 'running' | 'waiting_confirmation' | 'completed' | 'failed';
}

class TaskEngine {
  private queue: Task[] = [];

  enqueue(taskData: Omit<Task, 'currentStep' | 'status'>): Task {
    const task: Task = {
      ...taskData,
      currentStep: 0,
      status: 'queued',
    };
    this.queue.push(task);
    eventBus.emit('BROADCAST', { type: 'TASK_ADD', task });
    return task;
  }

  async startNext(): Promise<void> {
    const task = this.queue.find((t) => t.status === 'queued');
    if (!task) return;

    task.status = 'running';
    eventBus.emit('TASK_STARTED', task.id);
    eventBus.emit('BROADCAST', { type: 'TASK_UPDATE', taskId: task.id, updates: { status: 'running' } });

    this.runTask(task);
  }

  private async runTask(task: Task) {
    for (let i = 0; i < task.steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.advanceStep(task.id);
    }
    this.completeTask(task.id);
  }

  advanceStep(taskId: string): void {
    const task = this.getTask(taskId);
    if (task && task.status === 'running') {
      task.currentStep++;
      eventBus.emit('TASK_STEP_COMPLETE', taskId, task.currentStep);
      eventBus.emit('BROADCAST', {
        type: 'TASK_UPDATE',
        taskId,
        updates: { currentStep: task.currentStep },
      });
    }
  }

  completeTask(taskId: string): void {
    const task = this.getTask(taskId);
    if (task) {
      task.status = 'completed';
      eventBus.emit('TASK_COMPLETED', taskId);
      eventBus.emit('BROADCAST', { type: 'TASK_UPDATE', taskId, updates: { status: 'completed' } });
      this.startNext();
    }
  }

  failTask(taskId: string, error: string): void {
    const task = this.getTask(taskId);
    if (task) {
      task.status = 'failed';
      eventBus.emit('TASK_FAILED', taskId, error);
      eventBus.emit('BROADCAST', { type: 'TASK_UPDATE', taskId, updates: { status: 'failed' } });
      this.startNext();
    }
  }

  getTasks(): Task[] {
    return this.queue;
  }

  getTask(id: string): Task | undefined {
    return this.queue.find((t) => t.id === id);
  }
}

export const taskEngine = new TaskEngine();
