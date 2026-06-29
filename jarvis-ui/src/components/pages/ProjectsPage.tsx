import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadProjects, deleteProject, type Project, type ProjectFile } from '../../agents/projectStore';

/* ── Shared panel style ─────────────────────────────────────────────────── */
const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.16)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 6,
};

const STATUS_COLORS: Record<string, string> = {
  complete: '#22c55e', building: '#f59e0b', debugging: '#3b82f6', failed: '#ef4444',
};

/* ── Build a single preview document from project files ─────────────────── */
function buildPreviewDocument(files: ProjectFile[]): string | null {
  const htmlFile =
    files.find(f => f.path === 'index.html') ||
    files.find(f => f.path.endsWith('/index.html')) ||
    files.find(f => f.language === 'html' || f.path.endsWith('.html'));

  if (!htmlFile) return null;

  let html = htmlFile.content;

  /* Inline all referenced CSS files */
  html = html.replace(
    /<link[^>]+(?:rel=["']stylesheet["'][^>]+href=["']([^"']+)["']|href=["']([^"']+)["'][^>]+rel=["']stylesheet["'])[^>]*\/?>/gi,
    (_m, h1, h2) => {
      const href = h1 || h2;
      if (href.startsWith('http') || href.startsWith('//')) return _m;
      const name = href.split('/').pop() ?? '';
      const f = files.find(cf => cf.path === href || cf.path === name || cf.path.endsWith('/' + name));
      return f ? `<style>\n${f.content}\n</style>` : _m;
    }
  );

  /* Also inline any CSS files not referenced (inject into <head>) */
  const remainingCss = files
    .filter(f => (f.language === 'css' || f.path.endsWith('.css')) && f !== htmlFile)
    .filter(f => !html.includes(f.content.slice(0, 40)))
    .map(f => `<style>/* ${f.path} */\n${f.content}</style>`)
    .join('\n');
  if (remainingCss) {
    if (html.includes('</head>')) html = html.replace('</head>', `${remainingCss}\n</head>`);
    else html = remainingCss + '\n' + html;
  }

  /* Inline referenced <script src=""> tags */
  html = html.replace(
    /<script([^>]+)src=["']([^"']+)["'][^>]*><\/script>/gi,
    (_m, _attrs, src) => {
      if (src.startsWith('http') || src.startsWith('//')) return _m;
      const name = src.split('/').pop() ?? '';
      const f = files.find(cf => cf.path === src || cf.path === name || cf.path.endsWith('/' + name));
      return f ? `<script type="text/javascript">\n${f.content}\n</script>` : _m;
    }
  );

  /* Inject remaining JS files not referenced */
  const remainingJs = files
    .filter(f => (f.language === 'javascript' || f.path.endsWith('.js')) && f !== htmlFile && !f.path.includes('node_modules'))
    .filter(f => !html.includes(f.content.slice(0, 40)))
    .map(f => `<script>/* ${f.path} */\n${f.content}</script>`)
    .join('\n');
  if (remainingJs) {
    if (html.includes('</body>')) html = html.replace('</body>', `${remainingJs}\n</body>`);
    else html += '\n' + remainingJs;
  }

  return html;
}

/* ── Determine if project is previewable in browser ─────────────────────── */
function getPreviewType(files: ProjectFile[]): 'html' | 'backend' | 'none' {
  const hasHtml = files.some(f => f.language === 'html' || f.path.endsWith('.html'));
  if (hasHtml) return 'html';
  const backendLangs = ['python', 'rust', 'go', 'java', 'cpp', 'c'];
  const isBackend = files.some(f => backendLangs.includes(f.language));
  if (isBackend) return 'backend';
  return 'none';
}

/* ── File tree sidebar ───────────────────────────────────────────────────── */
function FileTree({ files, selected, onSelect }: {
  files: ProjectFile[]; selected: ProjectFile | null; onSelect: (f: ProjectFile) => void;
}) {
  const tree: Record<string, ProjectFile[]> = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    if (!tree[folder]) tree[folder] = [];
    tree[folder].push(f);
  });

  const EXT_COLORS: Record<string, string> = {
    html: '#f97316', css: '#38bdf8', js: '#fde047', ts: '#60a5fa',
    tsx: '#818cf8', jsx: '#34d399', json: '#fb923c', md: '#94a3b8',
    py: '#4ade80', sh: '#c084fc',
  };

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
      {Object.entries(tree).map(([folder, folderFiles]) => (
        <div key={folder} style={{ marginBottom: 8 }}>
          {folder !== '(root)' && (
            <div style={{ fontSize: 7.5, letterSpacing: '0.15em', color: 'rgba(0,180,255,0.4)', padding: '2px 0 5px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10 }}>📁</span> {folder}
            </div>
          )}
          {folderFiles.map(f => {
            const filename = f.path.split('/').pop() ?? f.path;
            const ext = filename.split('.').pop()?.toLowerCase() ?? '';
            const extColor = EXT_COLORS[ext] ?? 'rgba(0,180,255,0.5)';
            const isActive = selected?.path === f.path;
            return (
              <button key={f.path} onClick={() => onSelect(f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', textAlign: 'left',
                  padding: '4px 8px 4px 12px', fontSize: 10,
                  background: isActive ? 'rgba(0,180,255,0.10)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,180,255,0.22)' : '1px solid transparent',
                  borderRadius: 3, color: isActive ? '#00d4ff' : 'rgba(180,210,255,0.65)',
                  cursor: 'pointer', fontFamily: 'monospace', marginBottom: 1, transition: 'all 0.10s',
                }}>
                <span style={{ fontSize: 8, color: extColor, flexShrink: 0, fontWeight: 700, letterSpacing: '0.05em' }}>.{ext}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Code viewer with line numbers ──────────────────────────────────────── */
function CodeViewer({ file }: { file: ProjectFile }) {
  const lines = file.content.split('\n');
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, overflowX: 'auto', height: '100%' }}>
      <div style={{
        background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(0,180,255,0.1)',
        padding: '6px 12px', fontSize: 9, letterSpacing: '0.15em',
        color: 'rgba(0,180,255,0.5)', display: 'flex', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span>{file.path}</span>
        <span style={{ color: 'rgba(0,180,255,0.35)' }}>{lines.length} lines · {file.language}</span>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', minHeight: 18 }}>
            <span style={{
              width: 44, flexShrink: 0, paddingRight: 10, textAlign: 'right',
              color: 'rgba(0,180,255,0.18)', fontSize: 10, userSelect: 'none',
              borderRight: '1px solid rgba(0,180,255,0.07)',
            }}>{i + 1}</span>
            <span style={{ paddingLeft: 14, whiteSpace: 'pre', color: 'rgba(200,225,255,0.82)', fontSize: 11 }}>{line || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Live preview pane ───────────────────────────────────────────────────── */
function PreviewPane({ files }: { files: ProjectFile[] }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const previewType = getPreviewType(files);
  const previewDoc  = previewType === 'html' ? buildPreviewDocument(files) : null;

  if (!previewDoc) {
    const hasReadme = files.find(f => f.path.toLowerCase().includes('readme'));
    const readmeText = hasReadme?.content ?? '';
    const runMatch  = readmeText.match(/(?:```[^\n]*\n)(.*?)(?:```)/s);
    const runCmd    = runMatch ? runMatch[1].trim() : null;

    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 18, padding: 32,
        background: 'rgba(0,0,0,0.2)', borderRadius: 4,
      }}>
        <div style={{ fontSize: 38, opacity: 0.4 }}>{previewType === 'backend' ? '🖥' : '📄'}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.28em', color: 'rgba(0,200,255,0.65)', marginBottom: 8 }}>
            {previewType === 'backend' ? 'BACKEND PROJECT' : 'NO HTML ENTRY POINT'}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(180,210,255,0.4)', lineHeight: 1.8, letterSpacing: '0.12em' }}>
            {previewType === 'backend'
              ? 'This project runs as a server. Copy the files\nand run locally to see it in action.'
              : 'No index.html found. This project may need a build step.'}
          </div>
        </div>
        {runCmd && (
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,180,255,0.18)',
            borderRadius: 4, padding: '8px 16px', fontFamily: 'monospace',
            fontSize: 10, color: 'rgba(0,220,255,0.7)', letterSpacing: '0.08em',
          }}>
            $ {runCmd}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
      {/* Preview toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 12px', background: 'rgba(0,10,30,0.8)',
        borderBottom: '1px solid rgba(0,180,255,0.12)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
          <span style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.45)' }}>LIVE PREVIEW</span>
        </div>
        <button onClick={() => setReloadKey(k => k + 1)} style={{
          background: 'rgba(0,60,120,0.3)', border: '1px solid rgba(0,180,255,0.2)',
          color: 'rgba(0,200,255,0.65)', fontSize: 8, letterSpacing: '0.18em',
          padding: '3px 10px', cursor: 'pointer', borderRadius: 3,
        }}>⟳ RELOAD</button>
      </div>
      <iframe
        key={reloadKey}
        ref={iframeRef}
        srcDoc={previewDoc}
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
        style={{
          flex: 1, width: '100%', border: 'none',
          background: '#fff', borderRadius: '0 0 4px 4px',
        }}
        title="Project Preview"
      />
    </div>
  );
}

/* ── Project detail view ─────────────────────────────────────────────────── */
type ContentTab = 'code' | 'preview';

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(project.files[0] ?? null);
  const [activeTab, setActiveTab]       = useState<ContentTab>('code');
  const [copied, setCopied]             = useState(false);
  const statusColor = STATUS_COLORS[project.status] ?? '#fff';
  const canPreview  = getPreviewType(project.files) === 'html';

  const copyFile = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  const copyAll = () => {
    const allCode = project.files.map(f => `// ── FILE: ${f.path} ──\n${f.content}`).join('\n\n');
    navigator.clipboard.writeText(allCode);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{
          background: 'rgba(0,60,120,0.3)', border: '1px solid rgba(0,180,255,0.2)',
          color: 'rgba(0,200,255,0.7)', fontSize: 8, letterSpacing: '0.2em',
          padding: '5px 12px', cursor: 'pointer', borderRadius: 3,
        }}>← BACK</button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 300, letterSpacing: '0.3em', color: '#fff' }}>{project.name.toUpperCase()}</div>
          <div style={{ fontSize: 8.5, color: 'rgba(0,180,255,0.4)', marginTop: 1 }}>{project.description}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['code', 'preview'] as ContentTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              disabled={tab === 'preview' && !canPreview}
              style={{
                padding: '5px 14px', fontSize: 8, letterSpacing: '0.2em',
                background: activeTab === tab ? 'rgba(0,180,255,0.15)' : 'rgba(0,30,80,0.3)',
                border: `1px solid ${activeTab === tab ? 'rgba(0,180,255,0.4)' : 'rgba(0,180,255,0.15)'}`,
                color: activeTab === tab ? '#00d4ff' : 'rgba(0,180,255,0.4)',
                cursor: tab === 'preview' && !canPreview ? 'default' : 'pointer',
                borderRadius: 3, opacity: tab === 'preview' && !canPreview ? 0.4 : 1,
                transition: 'all 0.15s',
              }}>
              {tab === 'code' ? '⌨ CODE' : '▶ PREVIEW'}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          {activeTab === 'code' && (
            <>
              <button onClick={copyFile} style={{
                background: 'rgba(0,60,120,0.3)', border: '1px solid rgba(0,180,255,0.18)',
                color: copied ? '#22c55e' : 'rgba(0,200,255,0.65)', fontSize: 8, letterSpacing: '0.15em',
                padding: '5px 12px', cursor: 'pointer', borderRadius: 3,
              }}>{copied ? '✓ COPIED' : 'COPY FILE'}</button>
              <button onClick={copyAll} style={{
                background: 'rgba(0,60,120,0.3)', border: '1px solid rgba(0,180,255,0.18)',
                color: 'rgba(0,200,255,0.65)', fontSize: 8, letterSpacing: '0.15em',
                padding: '5px 12px', cursor: 'pointer', borderRadius: 3,
              }}>COPY ALL</button>
            </>
          )}
          <span style={{
            fontSize: 7, letterSpacing: '0.2em', padding: '4px 10px',
            color: statusColor, background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`, borderRadius: 2, alignSelf: 'center',
          }}>{project.status.toUpperCase()}</span>
        </div>
      </div>

      {/* Body — file tree + content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, minHeight: 0 }}>

        {/* File tree */}
        <div style={{ ...PANEL, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ fontSize: 7.5, letterSpacing: '0.25em', color: 'rgba(0,180,255,0.38)', marginBottom: 10 }}>
            FILES ({project.files.length})
          </div>
          <FileTree files={project.files} selected={selectedFile} onSelect={f => { setSelectedFile(f); setActiveTab('code'); }} />

          {project.debugLog && project.debugLog.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(0,180,255,0.08)' }}>
              <div style={{ fontSize: 7, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.3)', marginBottom: 6 }}>DEBUG LOG</div>
              {project.debugLog.map((entry, i) => (
                <div key={i} style={{ fontSize: 8, color: 'rgba(180,210,255,0.4)', marginBottom: 3, lineHeight: 1.5 }}>{entry}</div>
              ))}
            </div>
          )}
        </div>

        {/* Code / Preview */}
        <div style={{ ...PANEL, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'code' ? (
              <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {selectedFile
                  ? <CodeViewer file={selectedFile} />
                  : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,180,255,0.3)', fontSize: 9, letterSpacing: '0.25em' }}>SELECT A FILE</div>
                }
              </motion.div>
            ) : (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ flex: 1, overflow: 'hidden' }}>
                <PreviewPane files={project.files} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Project card ────────────────────────────────────────────────────────── */
function ProjectCard({ project, onClick, onDelete }: {
  project: Project; onClick: () => void; onDelete: () => void;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? '#fff';
  const canPreview  = getPreviewType(project.files) === 'html';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: 'rgba(0,200,255,0.28)' }}
      onClick={onClick}
      style={{ ...PANEL, padding: '16px 18px', cursor: 'pointer', position: 'relative' }}>

      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: 'none', color: 'rgba(255,60,60,0.35)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${statusColor}10`, border: `1px solid ${statusColor}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>⌨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#00d4ff', marginBottom: 2 }}>{project.name}</div>
          <div style={{ fontSize: 8, color: 'rgba(180,210,255,0.45)', lineHeight: 1.5 }}>{project.description || 'No description'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: 6.5, letterSpacing: '0.2em', padding: '2px 8px',
            color: statusColor, background: `${statusColor}12`,
            border: `1px solid ${statusColor}25`, borderRadius: 2,
          }}>{project.status.toUpperCase()}</span>
          {canPreview && (
            <span style={{ fontSize: 6.5, letterSpacing: '0.15em', color: '#22c55e', opacity: 0.7 }}>▶ PREVIEWABLE</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(0,180,255,0.07)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {project.files.slice(0, 5).map(f => (
            <span key={f.path} style={{
              fontSize: 7, padding: '1px 5px',
              background: 'rgba(0,60,120,0.25)', border: '1px solid rgba(0,180,255,0.1)',
              color: 'rgba(0,180,255,0.5)', borderRadius: 2,
            }}>{f.path.split('/').pop()}</span>
          ))}
          {project.files.length > 5 && (
            <span style={{ fontSize: 7, color: 'rgba(0,180,255,0.28)', padding: '1px 4px' }}>+{project.files.length - 5}</span>
          )}
        </div>
        <span style={{ fontSize: 7.5, color: 'rgba(0,180,255,0.3)', flexShrink: 0, marginLeft: 8 }}>
          {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);

  useEffect(() => {
    const load = () => setProjects(loadProjects());
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, []);

  const handleDelete = (id: string) => {
    deleteProject(id);
    setProjects(loadProjects());
    if (selected?.id === id) setSelected(null);
  };

  /* Refresh selected project from store */
  const freshSelected = selected ? (projects.find(p => p.id === selected.id) ?? selected) : null;

  if (freshSelected) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, fontFamily: 'monospace', padding: '0 20px 14px', height: '100%' }}>
        <ProjectDetail project={freshSelected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, fontFamily: 'monospace', padding: '0 20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.4em', color: '#fff', marginBottom: 4 }}>PROJECTS</h2>
          <p style={{ fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.4)' }}>BUILT BY JARVIS — CLICK TO VIEW CODE + LIVE PREVIEW</p>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(0,180,255,0.4)', letterSpacing: '0.18em' }}>
          {projects.length} PROJECT{projects.length !== 1 ? 'S' : ''}
        </div>
      </div>

      {projects.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...PANEL, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '60px 40px' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(0,100,180,0.10)', border: '1px solid rgba(0,180,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📁</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, letterSpacing: '0.35em', color: 'rgba(0,200,255,0.65)', marginBottom: 10 }}>NO PROJECTS YET</div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,180,255,0.38)', lineHeight: 1.9 }}>
              Ask JARVIS to build an application and it will<br />appear here with a live preview when complete.
            </div>
          </div>
          <div style={{ padding: '8px 18px', background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.16)', fontSize: 8.5, letterSpacing: '0.18em', color: 'rgba(0,200,255,0.5)', fontStyle: 'italic' }}>
            Try: "Build me a weather dashboard with live data"
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))' }}>
          {projects.map((p, i) => (
            <ProjectCard key={p.id}
              project={p}
              onClick={() => setSelected(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
