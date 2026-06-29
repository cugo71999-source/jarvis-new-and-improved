import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvisStore } from '../../store/jarvisStore';
import { AGENT_META, type AgentId } from '../../agents/agentSystem';

const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.16)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 6,
};

interface AgentDef {
  id: AgentId;
  desc: string;
  capabilities: string[];
  role: string;
}

const AGENT_DEFS: AgentDef[] = [
  {
    id: 'core',
    desc: 'The master coordinator. Analyzes every request, routes to the best agent, monitors execution, validates results, and returns a unified response to the user.',
    capabilities: ['Intent Analysis', 'Task Routing', 'Multi-Agent Chaining', 'Result Validation'],
    role: 'ORCHESTRATOR',
  },
  {
    id: 'coding',
    desc: 'Elite software engineer. Builds production-quality applications — frontend, backend, APIs, databases. Never mocks, never shortcuts.',
    capabilities: ['React / TypeScript', 'Node.js / Python', 'REST & GraphQL APIs', 'Database Design', 'Debugging & Optimization'],
    role: 'SOFTWARE ENGINEERING',
  },
  {
    id: 'design',
    desc: 'World-class product designer. Creates complete design systems, UI layouts, color palettes, and interaction specs — then hands them to the Coding Agent to build exactly.',
    capabilities: ['UI / UX Design', 'Design Systems', 'Color Theory', 'Animation Design', 'Accessibility'],
    role: 'PRODUCT DESIGN',
  },
  {
    id: 'system',
    desc: 'The bridge between JARVIS and your operating system. Opens apps, manages files, runs terminal commands, installs dependencies, and automates workflows.',
    capabilities: ['File Management', 'Terminal Commands', 'App Automation', 'Environment Setup', 'Process Control'],
    role: 'SYSTEM CONTROL',
  },
  {
    id: 'repair',
    desc: 'The reliability guardian. Continuously monitors all agents, detects failures, diagnoses root causes, and executes automated recovery — before you ever notice a problem.',
    capabilities: ['Error Detection', 'Root Cause Analysis', 'Auto-Recovery', 'Performance Profiling', 'Health Monitoring'],
    role: 'SELF REPAIR',
  },
];

function AgentIcon({ id, color }: { id: AgentId; color: string }) {
  const icons: Record<AgentId, React.ReactNode> = {
    core: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    coding: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    design: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <circle cx={12} cy={12} r={10} /><circle cx={12} cy={12} r={4} />
        <line x1={12} y1={2} x2={12} y2={8} /><line x1={12} y1={16} x2={12} y2={22} />
        <line x1={2} y1={12} x2={8} y2={12} /><line x1={16} y1={12} x2={22} y2={12} />
      </svg>
    ),
    system: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <circle cx={12} cy={12} r={3} />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07" />
      </svg>
    ),
    repair: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    debugging: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} />
      </svg>
    ),
  };
  return <>{icons[id]}</>;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span style={{ fontSize: 7.5, letterSpacing: '0.15em', color: 'rgba(180,210,255,0.4)' }}>{label}</span>
        <span style={{ fontSize: 7.5, color: `${color}99` }}>{value}%</span>
      </div>
      <div style={{ height: 2, background: 'rgba(0,100,180,0.15)', borderRadius: 1 }}>
        <motion.div
          style={{ height: '100%', background: color, borderRadius: 1, boxShadow: `0 0 4px ${color}80` }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

function TaskList({ agentId, tasks }: { agentId: AgentId; tasks: ReturnType<typeof useJarvisStore>['tasks'] }) {
  const agentTasks = tasks.filter(t => t.agentId === agentId).slice(-3);
  if (agentTasks.length === 0) return null;
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,180,255,0.08)', paddingTop: 10 }}>
      <div style={{ fontSize: 7, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.35)', marginBottom: 6 }}>RECENT TASKS</div>
      {agentTasks.map(t => (
        <div key={t.id} className="flex items-center gap-2 mb-1.5">
          <div style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: t.status === 'completed' ? '#22c55e' : t.status === 'failed' ? '#ef4444' : AGENT_META[agentId].color,
          }} />
          <span style={{ fontSize: 7.5, color: 'rgba(180,210,255,0.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.description}
          </span>
          <span style={{ fontSize: 7, color: t.status === 'completed' ? '#22c55e80' : 'rgba(0,180,255,0.3)', letterSpacing: '0.1em', flexShrink: 0 }}>
            {t.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function AgentCard({ def, isActive, tasks }: { def: AgentDef; isActive: boolean; tasks: ReturnType<typeof useJarvisStore>['tasks'] }) {
  const meta = AGENT_META[def.id];
  const agentTasks = tasks.filter(t => t.agentId === def.id);
  const completedCount = agentTasks.filter(t => t.status === 'completed').length;
  const totalCount = agentTasks.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...PANEL,
        padding: '18px 20px',
        borderLeft: `2px solid ${isActive ? meta.color : `${meta.color}50`}`,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.4s',
      }}>

      {/* Active shimmer */}
      <AnimatePresence>
        {isActive && (
          <motion.div key="shimmer"
            style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${meta.color}06, transparent)`, pointerEvents: 'none' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
            background: `${meta.color}15`, border: `1px solid ${meta.color}${isActive ? '60' : '30'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.4s',
            boxShadow: isActive ? `0 0 18px ${meta.color}30` : 'none',
          }}>
            <AgentIcon id={def.id} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, letterSpacing: '0.06em', marginBottom: 3 }}>
              {meta.name}
            </div>
            <div className="flex items-center gap-2">
              <motion.div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isActive ? meta.color : '#22c55e',
                boxShadow: `0 0 6px ${isActive ? meta.color : '#22c55e'}`,
              }}
                animate={{ opacity: isActive ? [1, 0.2, 1] : [1, 0.5, 1] }}
                transition={{ duration: isActive ? 0.6 : 3, repeat: Infinity }} />
              <span style={{ fontSize: 7.5, letterSpacing: '0.2em', color: isActive ? meta.color : '#22c55e80' }}>
                {isActive ? 'WORKING' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <span style={{
          fontSize: 6.5, letterSpacing: '0.18em', padding: '3px 8px',
          background: `${meta.color}10`, border: `1px solid ${meta.color}25`,
          color: `${meta.color}90`,
        }}>
          {def.role}
        </span>
      </div>

      {/* Description */}
      <p style={{ fontSize: 9, lineHeight: 1.75, color: 'rgba(180,210,255,0.62)', marginBottom: 14 }}>
        {def.desc}
      </p>

      {/* Stats */}
      {totalCount > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <StatBar label="TASK SUCCESS RATE" value={totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0} color={meta.color} />
          <StatBar label="UTILIZATION" value={isActive ? 100 : Math.min(85, completedCount * 20)} color={meta.color} />
        </div>
      )}

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5">
        {def.capabilities.map(cap => (
          <span key={cap} style={{
            fontSize: 7.5, letterSpacing: '0.08em', padding: '2px 8px',
            background: `${meta.color}0e`, border: `1px solid ${meta.color}25`,
            color: `${meta.color}c0`,
          }}>{cap}</span>
        ))}
      </div>

      {/* Recent tasks */}
      <TaskList agentId={def.id} tasks={tasks} />
    </motion.div>
  );
}

/* ── Workflow diagram — shows how agents connect ── */
function WorkflowDiagram() {
  return (
    <div style={{ ...PANEL, padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 16 }}>
        AGENT COMMUNICATION ARCHITECTURE
      </div>
      <div className="flex items-center justify-center gap-4" style={{ flexWrap: 'wrap' }}>
        {[
          { label: 'USER', color: '#88aaff' },
          { label: '→' },
          { label: 'JARVIS CORE', color: '#00d4ff', main: true },
          { label: '→' },
          { label: 'SPECIALIST AGENTS', color: '#8b5cf6' },
          { label: '→' },
          { label: 'JARVIS CORE', color: '#00d4ff' },
          { label: '→' },
          { label: 'USER', color: '#88aaff' },
        ].map((n, i) => n.label === '→' ? (
          <span key={i} style={{ color: 'rgba(0,180,255,0.3)', fontSize: 14 }}>→</span>
        ) : (
          <div key={i} style={{
            padding: '5px 12px', background: `${n.color}12`,
            border: `1px solid ${n.color}${n.main ? '50' : '25'}`,
            boxShadow: n.main ? `0 0 12px ${n.color}20` : 'none',
          }}>
            <span style={{ fontSize: 8.5, letterSpacing: '0.15em', color: n.color, fontWeight: n.main ? 700 : 400 }}>
              {n.label}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 8.5, color: 'rgba(180,210,255,0.45)', textAlign: 'center', marginTop: 12, lineHeight: 1.7 }}>
        Every request flows through JARVIS Core for routing. Agents never communicate directly.<br />
        Structured task objects ensure no information loss during hand-offs.
      </p>
    </div>
  );
}

export function AgentsPage() {
  const { activeAgent, tasks } = useJarvisStore();
  const onlineCount = AGENT_DEFS.length;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ fontFamily: 'monospace', padding: '0 20px 16px', overflowY: 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.4em', color: '#fff', marginBottom: 4 }}>AGENTS</h2>
          <p style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.45)' }}>
            JARVIS MULTI-AGENT SYSTEM
          </p>
        </div>
        <div className="flex items-center gap-4">
          {activeAgent && (
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div
                style={{ width: 7, height: 7, borderRadius: '50%', background: AGENT_META[activeAgent].color, boxShadow: `0 0 10px ${AGENT_META[activeAgent].color}` }}
                animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
              <span style={{ fontSize: 9, color: AGENT_META[activeAgent].color, letterSpacing: '0.18em' }}>
                {AGENT_META[activeAgent].name.toUpperCase()} ACTIVE
              </span>
            </motion.div>
          )}
          <div className="flex items-center gap-2">
            <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
              animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
            <span style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.2em' }}>{onlineCount}/{onlineCount} ONLINE</span>
          </div>
        </div>
      </div>

      {/* Architecture diagram */}
      <WorkflowDiagram />

      {/* Agent cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {AGENT_DEFS.map((def, i) => (
          <motion.div key={def.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}>
            <AgentCard def={def} isActive={activeAgent === def.id} tasks={tasks} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
