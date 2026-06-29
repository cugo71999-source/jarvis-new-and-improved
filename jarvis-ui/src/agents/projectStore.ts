/* ══════════════════════════════════════════════════════════════════════════════
   Project Store — persists JARVIS-built projects in localStorage
══════════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'jarvis-projects';

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export type ProjectStatus = 'building' | 'debugging' | 'complete' | 'failed';

export interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
  status: ProjectStatus;
  taskId?: string;
  debugLog?: string[];
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function saveProject(project: Project): void {
  const projects = loadProjects().filter(p => p.id !== project.id);
  projects.unshift(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function updateProject(id: string, updates: Partial<Project>): void {
  const projects = loadProjects().map(p =>
    p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/* Detect language from file extension */
export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', html: 'html', css: 'css', scss: 'scss',
    json: 'json', md: 'markdown', sql: 'sql', sh: 'bash',
    yaml: 'yaml', yml: 'yaml', env: 'bash', toml: 'toml',
    rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c',
    vue: 'vue', svelte: 'svelte', graphql: 'graphql',
  };
  return map[ext] ?? 'text';
}

/* Parse coding agent output into project files */
export function parseProjectOutput(output: string): {
  name: string;
  description: string;
  files: ProjectFile[];
} {
  const lines = output.split('\n');
  let name = 'Untitled Project';
  let description = '';
  const files: ProjectFile[] = [];

  /* Extract PROJECT and DESCRIPTION headers */
  for (const line of lines) {
    const projMatch = line.match(/^PROJECT:\s*(.+)$/i);
    if (projMatch) { name = projMatch[1].trim(); continue; }
    const descMatch = line.match(/^DESCRIPTION:\s*(.+)$/i);
    if (descMatch) { description = descMatch[1].trim(); continue; }
  }

  /* Extract FILE blocks — supports both ### FILE: and FILE: prefixes */
  const filePattern = /(?:^|\n)(?:#{1,3}\s*)?FILE:\s*([^\n]+)\n```(?:[a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = filePattern.exec(output)) !== null) {
    const path = match[1].trim();
    const content = match[2];
    files.push({ path, content, language: detectLanguage(path) });
  }

  /* Fallback: if no FILE blocks found, extract all code blocks as single file */
  if (files.length === 0) {
    const codePattern = /```([a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
    let ci = 0;
    while ((match = codePattern.exec(output)) !== null) {
      const lang = match[1]?.toLowerCase() ?? 'text';
      const content = match[2];
      const ext = { typescript: 'ts', javascript: 'js', python: 'py', html: 'html', css: 'css', tsx: 'tsx' }[lang] ?? lang;
      files.push({ path: `main.${ext}`, content, language: lang });
      ci++;
    }
  }

  return { name, description, files };
}
