import { promises as fs } from 'fs';
import path from 'path';
import { eventBus } from './eventBus';
import { safetyLayer } from './safetyLayer';

const SAFE_ROOT = path.join(process.cwd(), 'jarvis-workspace');

async function ensureSafeRoot() {
  try {
    await fs.mkdir(SAFE_ROOT, { recursive: true });
  } catch (err) {
    // Ignore if exists
  }
}

function resolvePath(p: string) {
  const resolved = path.resolve(SAFE_ROOT, p);
  if (!resolved.startsWith(SAFE_ROOT)) {
    throw new Error('Path traversal attempt detected');
  }
  return resolved;
}

export const fileController = {
  async readFile(p: string): Promise<string> {
    await ensureSafeRoot();
    const fullPath = resolvePath(p);
    return fs.readFile(fullPath, 'utf-8');
  },

  async writeFile(p: string, content: string): Promise<void> {
    await ensureSafeRoot();
    const fullPath = resolvePath(p);
    let oldContent = '';
    try {
      oldContent = await fs.readFile(fullPath, 'utf-8');
    } catch (e) {}

    const diff = this.generateDiff(p, oldContent, content);
    const id = Math.random().toString(36).substring(7);
    
    eventBus.emit('FILE_CHANGE_REQUEST', id, p, diff);
    
    const approved = await safetyLayer.requestConfirmation(
      'WRITE_FILE',
      `Write to ${p}`
    );

    if (approved) {
      await fs.writeFile(fullPath, content);
    } else {
      throw new Error('Write permission denied');
    }
  },

  async createFile(p: string, content: string): Promise<void> {
    await ensureSafeRoot();
    const fullPath = resolvePath(p);
    
    const id = Math.random().toString(36).substring(7);
    const diff = { before: '', after: content };
    
    eventBus.emit('FILE_CHANGE_REQUEST', id, p, diff);

    const approved = await safetyLayer.requestConfirmation(
      'CREATE_FILE',
      `Create file ${p}`
    );

    if (approved) {
      await fs.writeFile(fullPath, content);
    } else {
      throw new Error('Create permission denied');
    }
  },

  generateDiff(p: string, oldContent: string, newContent: string) {
    return {
      before: oldContent,
      after: newContent,
    };
  },

  async listFiles(dir: string = '.'): Promise<string[]> {
    await ensureSafeRoot();
    const fullPath = resolvePath(dir);
    return fs.readdir(fullPath);
  },
};
