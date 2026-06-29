import { eventBus } from './eventBus';

interface PendingConfirmation {
  id: string;
  action: string;
  details: string;
  resolve: (approved: boolean) => void;
}

class SafetyLayer {
  private pending = new Map<string, PendingConfirmation>();

  async requestConfirmation(action: string, details: string): Promise<boolean> {
    const id = Math.random().toString(36).substring(7);
    
    return new Promise((resolve) => {
      this.pending.set(id, { id, action, details, resolve });
      
      eventBus.emit('BROADCAST', {
        type: 'CONFIRMATION_REQUIRED',
        id,
        action,
        details,
      });
    });
  }

  receiveConfirmation(id: string, approved: boolean): void {
    const pending = this.pending.get(id);
    if (pending) {
      pending.resolve(approved);
      this.pending.delete(id);
      eventBus.emit('CONFIRMATION_RECEIVED', id, approved);
    }
  }

  isDestructive(intent: string): boolean {
    const destructiveKeywords = ['delete', 'remove', 'format', 'destroy', 'overwrite'];
    return destructiveKeywords.some((kw) => intent.toLowerCase().includes(kw));
  }
}

export const safetyLayer = new SafetyLayer();
