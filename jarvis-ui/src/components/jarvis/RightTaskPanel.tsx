import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvisStore, type Task } from '../../store/jarvisStore';

const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.16)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const STATUS_CFG: Record<Task['status'], { label: string; color: string }> = {
  queued:               { label: 'QUEUED',  color: '#5599ff' },
  running:              { label: 'ACTIVE',  color: '#00d4ff' },
  completed:            { label: 'DONE',    color: '#22c55e' },
  failed:               { label: 'FAILED',  color: '#ef4444' },
  waiting_confirmation: { label: 'CONFIRM', color: '#f59e0b' },
};

const AGENT_COLORS: Record<string, string> = {
  core:      '#00d4ff',
  coding:    '#3b82f6',
  debugging: '#f59e0b',
  design:    '#8b5cf6',
  system:    '#f59e0b',
  repair:    '#22c55e',
};

function Spin({ color }: { color: string }) {
  return (
    <motion.div style={{
      width: 15, height: 15, borderRadius: '50%',
      border: `1.5px solid ${color}25`, borderTopColor: color, flexShrink: 0,
    }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
  );
}

function Check({ color }: { color: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <circle cx={7.5} cy={7.5} r={6.5} stroke={color} strokeWidth={1.2} fill={`${color}15`} />
      <path d="M4 7.5l2.5 2.5 4-4.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TaskCard({ task }: { task: Task }) {
  const agentColor = AGENT_COLORS[task.agentId] ?? '#00d4ff';
  const pct = task.steps > 0 ? Math.round((task.currentStep / task.steps) * 100) : 0;
  const isRunning = task.status === 'running';

  return (
    <motion.div layout
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
      className="flex flex-col gap-1.5 relative overflow-hidden"
      style={{ padding: '9px 10px', background: `${agentColor}07`, border: `1px solid ${agentColor}1e`, borderLeft: `2px solid ${agentColor}`, marginBottom: 6 }}>
      {isRunning && (
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${agentColor}08, transparent)` }}
          animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
      )}
      <div className="flex items-start gap-2">
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: `${agentColor}18`, border: `1px solid ${agentColor}35`,
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
        }}>
          {task.agentId === 'coding' ? '⌨' : task.agentId === 'debugging' ? '🔍' : task.agentId === 'design' ? '◉' : task.agentId === 'repair' ? '⚕' : task.agentId === 'system' ? '⚙' : '◈'}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 9, fontWeight: 600, color: agentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.name}
          </div>
          {task.description && task.status === 'running' && (
            <div style={{ fontSize: 7.5, color: 'rgba(180,210,255,0.5)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {task.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div style={{ flex: 1, height: 2.5, background: 'rgba(0,100,180,0.15)', borderRadius: 2 }}>
          <motion.div
            style={{ height: '100%', background: agentColor, borderRadius: 2, boxShadow: `0 0 5px ${agentColor}60` }}
            animate={{ width: `${Math.max(2, pct)}%` }} transition={{ duration: 0.4 }} />
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(200,220,255,0.65)', width: 24, textAlign: 'right' }}>{pct}%</span>
        {task.status === 'completed' ? <Check color={agentColor} /> : <Spin color={agentColor} />}
      </div>
    </motion.div>
  );
}

export function RightTaskPanel() {
  const { tasks } = useJarvisStore();
  const active = tasks.filter(t => t.status === 'running').length;
  const done   = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="flex flex-col gap-2.5" style={{ fontFamily: 'monospace' }}>

      {/* TASK QUEUE */}
      <div style={{ ...PANEL, padding: '12px 14px' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)' }}>TASK QUEUE</span>
          {tasks.length > 0 && (
            <span style={{ fontSize: 8, letterSpacing: '0.15em', color: '#00d4ff', fontWeight: 600 }}>{tasks.length} TASKS</span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3" style={{ opacity: 0.28 }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth={1.2}>
              <rect x={3} y={4} width={18} height={18} rx={2} />
              <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
            </svg>
            <div className="text-center">
              <div style={{ fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.55)' }}>NO ACTIVE TASKS</div>
              <div style={{ fontSize: 7, letterSpacing: '0.18em', color: 'rgba(0,180,255,0.3)', marginTop: 4 }}>Ask JARVIS to build something</div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[
                { l: 'ACTIVE', n: active, c: '#00d4ff' },
                { l: 'DONE',   n: done,   c: '#22c55e' },
                { l: 'TOTAL',  n: tasks.length, c: '#5599ff' },
              ].map(s => (
                <div key={s.l} className="text-center py-1.5" style={{ background: `${s.c}07`, border: `1px solid ${s.c}1a` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.n}</div>
                  <div style={{ fontSize: 6, letterSpacing: '0.18em', color: `${s.c}55` }}>{s.l}</div>
                </div>
              ))}
            </div>
            <AnimatePresence>
              {tasks.slice(0, 6).map(t => <TaskCard key={t.id} task={t} />)}
            </AnimatePresence>
            {tasks.length > 6 && (
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 8, letterSpacing: '0.22em', color: 'rgba(0,180,255,0.35)' }}>
                +{tasks.length - 6} more tasks
              </div>
            )}
          </>
        )}
      </div>

      {/* LIVE FEED */}
      <div style={{ ...PANEL, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 10 }}>LIVE FEED</div>
        {tasks.filter(t => t.status === 'running' || t.status === 'completed').length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 gap-2" style={{ opacity: 0.25 }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth={1.3}>
              <circle cx={12} cy={12} r={10} /><path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontSize: 7.5, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.5)' }}>NO ACTIVITY YET</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.filter(t => t.status === 'running' || t.status === 'completed').slice(-4).map(t => {
              const agentColor = AGENT_COLORS[t.agentId] ?? '#00d4ff';
              const agentName  = t.agentId === 'coding' ? 'Coding Agent' : t.agentId === 'debugging' ? 'Debugging Agent' : t.agentId === 'design' ? 'Design Agent' : t.agentId === 'repair' ? 'Repair Agent' : t.agentId === 'system' ? 'System Agent' : 'JARVIS Core';
              return (
                <div key={t.id} className="flex items-start gap-2.5">
                  <div style={{
                    width: 24, height: 24, borderRadius: 5,
                    background: `${agentColor}18`, border: `1px solid ${agentColor}35`,
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  }}>
                    {t.agentId === 'coding' ? '⌨' : t.agentId === 'debugging' ? '🔍' : t.agentId === 'design' ? '◉' : t.agentId === 'repair' ? '⚕' : '⚙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 9, fontWeight: 600, color: agentColor }}>{agentName}</div>
                    {t.description && (
                      <div style={{ fontSize: 8, color: 'rgba(180,210,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: agentColor, flexShrink: 0, marginTop: 3 }}
                    animate={{ opacity: t.status === 'running' ? [1, 0.2, 1] : 0.5 }}
                    transition={{ duration: 1, repeat: Infinity }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MEMORY SYNTHESIS */}
      <div style={{ ...PANEL, padding: '10px 14px' }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,100,180,0.18)', border: '1px solid rgba(0,180,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth={1.5}>
              <circle cx={12} cy={12} r={3} />
              <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 7.5, letterSpacing: '0.22em', color: 'rgba(0,180,255,0.4)', marginBottom: 2 }}>MEMORY SYNTHESIS</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>128.4 GB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
