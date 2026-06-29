import React from 'react';
import { motion } from 'framer-motion';

const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.16)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 6,
};

const TEMPLATES = [
  { name: 'Daily Briefing',     desc: 'Summarize news and emails every morning at 8am', color: '#8b5cf6', icon: '📋', trigger: 'SCHEDULED' },
  { name: 'Code Review Bot',    desc: 'Review and suggest improvements for new code commits', color: '#3b82f6', icon: '🔍', trigger: 'ON COMMIT' },
  { name: 'Performance Monitor',desc: 'Alert when system metrics exceed thresholds', color: '#f59e0b', icon: '📊', trigger: 'CONTINUOUS' },
  { name: 'Research Pipeline',  desc: 'Gather and synthesize data on a topic automatically', color: '#06b6d4', icon: '🔬', trigger: 'ON DEMAND' },
];

export function AutomationPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ fontFamily: 'monospace', padding: '0 20px 16px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.4em', color: '#fff', marginBottom: 4 }}>AUTOMATION</h2>
          <p style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.45)' }}>
            WORKFLOW AUTOMATION & SCHEDULED TASKS
          </p>
        </div>
        <button style={{
          padding: '7px 16px', fontSize: 8, letterSpacing: '0.28em',
          background: 'rgba(0,180,255,0.1)', border: '1px solid rgba(0,180,255,0.3)',
          color: '#00d4ff', cursor: 'pointer',
        }}>
          + NEW WORKFLOW
        </button>
      </div>

      {/* Active workflows - empty */}
      <div style={{ ...PANEL, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 12 }}>
          ACTIVE WORKFLOWS
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3" style={{ opacity: 0.3 }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth={1.2}>
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <path d="M13 2v7h7M9 17l2 2 4-4" />
          </svg>
          <span style={{ fontSize: 8, letterSpacing: '0.22em', color: 'rgba(0,180,255,0.5)' }}>NO ACTIVE WORKFLOWS</span>
          <span style={{ fontSize: 7, letterSpacing: '0.14em', color: 'rgba(0,180,255,0.3)' }}>
            Create a workflow or use a template below
          </span>
        </div>
      </div>

      {/* Templates */}
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 12 }}>
        WORKFLOW TEMPLATES
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
        {TEMPLATES.map((t, i) => (
          <motion.button key={t.name}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ ...PANEL, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', borderLeft: `2px solid ${t.color}`, border: `1px solid rgba(0,160,255,0.16)`, borderLeftWidth: 2, borderLeftColor: t.color, background: 'rgba(6,16,38,0.88)' }}
            whileHover={{ scale: 1.02, borderColor: t.color + '50' }}>
            <div className="flex items-start gap-2.5 mb-2">
              <div style={{ fontSize: 18 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: t.color, marginBottom: 2 }}>{t.name}</div>
                <span style={{ fontSize: 6.5, letterSpacing: '0.2em', color: `${t.color}70`, background: `${t.color}10`, padding: '1px 6px', border: `1px solid ${t.color}25` }}>
                  {t.trigger}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 8.5, color: 'rgba(180,210,255,0.55)', lineHeight: 1.65 }}>{t.desc}</p>
            <div style={{ marginTop: 10, fontSize: 7.5, letterSpacing: '0.2em', color: `${t.color}70` }}>
              USE TEMPLATE →
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
