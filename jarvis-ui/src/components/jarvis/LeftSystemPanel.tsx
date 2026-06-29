import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvisStore, type ConversationMessage } from '../../store/jarvisStore';
import { AGENT_META } from '../../agents/agentSystem';

const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.16)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

function CircleGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const R = 26, sw = 4.5, circ = 2 * Math.PI * R;
  const arc = circ * 0.75;
  const filled = (value / 100) * arc;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={62} height={62} viewBox="0 0 62 62">
        <circle cx={31} cy={31} r={R} fill="none" stroke="rgba(0,100,180,0.18)"
          strokeWidth={sw} strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
          style={{ transform: 'rotate(135deg)', transformOrigin: '31px 31px' }} />
        <circle cx={31} cy={31} r={R} fill="none" stroke={color}
          strokeWidth={sw} strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          style={{
            transform: 'rotate(135deg)', transformOrigin: '31px 31px',
            filter: `drop-shadow(0 0 4px ${color})`,
            transition: 'stroke-dasharray 0.8s ease',
          }} />
        <text x={31} y={35} textAnchor="middle" fill="#fff" fontSize={12} fontFamily="monospace" fontWeight="700">
          {Math.round(value)}%
        </text>
      </svg>
      <span style={{ fontSize: 7.5, letterSpacing: '0.25em', color: 'rgba(0,180,255,0.45)', fontFamily: 'monospace' }}>{label}</span>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (data.length < 2) return;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * c.width;
      const y = c.height - (v / 100) * c.height * 0.85 - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = color;
    ctx.stroke();
  });
  return <canvas ref={ref} width={200} height={36} style={{ width: '100%', height: 36, display: 'block' }} />;
}

function AgentBadge({ agentId }: { agentId: string }) {
  const meta = AGENT_META[agentId as keyof typeof AGENT_META];
  if (!meta) return null;
  return (
    <span style={{
      fontSize: 6.5, letterSpacing: '0.12em', padding: '1px 5px',
      background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
      color: meta.color, borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      <span>{meta.icon}</span> {meta.name.toUpperCase()}
    </span>
  );
}

function MessageBubble({ m }: { m: ConversationMessage }) {
  const isUser = m.role === 'user';
  const meta = m.agentId ? AGENT_META[m.agentId] : AGENT_META.core;
  const isLong = m.text.length > 300;
  const [expanded, setExpanded] = React.useState(false);
  const displayText = isLong && !expanded ? m.text.slice(0, 280) + '…' : m.text;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 items-start">
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'rgba(0,80,200,0.5)' : `${meta?.color ?? '#00d4ff'}18`,
        border: `1.5px solid ${isUser ? 'rgba(0,120,255,0.4)' : `${meta?.color ?? '#00d4ff'}35`}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 9,
          color: isUser ? '#88aaff' : (meta?.color ?? '#00d4ff'),
          fontWeight: 700,
        }}>
          {isUser ? 'U' : (meta?.icon ?? 'J')}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-1.5">
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: isUser ? 'rgba(180,200,255,0.8)' : (meta?.color ?? '#00d4ff'),
              letterSpacing: '0.08em',
            }}>
              {isUser ? 'You' : (meta?.name ?? 'JARVIS')}
            </span>
            {!isUser && m.agentId && m.agentId !== 'core' && <AgentBadge agentId={m.agentId} />}
          </div>
          <span style={{ fontSize: 7, color: 'rgba(0,180,255,0.3)', flexShrink: 0 }}>{m.time}</span>
        </div>

        {/* Message body */}
        <p style={{
          fontSize: 8.5, lineHeight: 1.65, color: 'rgba(180,210,255,0.78)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {displayText}
        </p>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)}
            style={{
              fontSize: 7.5, color: meta?.color ?? '#00d4ff', background: 'none',
              border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2, letterSpacing: '0.1em',
            }}>
            {expanded ? '▲ SHOW LESS' : '▼ SHOW MORE'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function LeftSystemPanel() {
  const { cpuUsage, memoryUsage, conversation, activeAgent } = useJarvisStore();
  const cpu = Math.round(cpuUsage[cpuUsage.length - 1] || 0);
  const mem = Math.round(memoryUsage[memoryUsage.length - 1] || 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll to latest message */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const msgs = conversation.slice(-8);

  return (
    <div className="flex flex-col gap-2.5" style={{ fontFamily: 'monospace' }}>

      {/* ── CONVERSATION ── */}
      <div style={{ ...PANEL, padding: '12px 14px' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)' }}>CONVERSATION</span>
          {activeAgent && (
            <motion.div className="flex items-center gap-1.5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div
                style={{ width: 5, height: 5, borderRadius: '50%', background: AGENT_META[activeAgent]?.color ?? '#00d4ff' }}
                animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
              <span style={{ fontSize: 7, color: AGENT_META[activeAgent]?.color ?? '#00d4ff', letterSpacing: '0.15em' }}>
                {AGENT_META[activeAgent]?.name?.toUpperCase()} WORKING
              </span>
            </motion.div>
          )}
        </div>

        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2" style={{ opacity: 0.28 }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth={1.2}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(0,180,255,0.5)' }}>NO MESSAGES YET</span>
            <span style={{ fontSize: 7, letterSpacing: '0.15em', color: 'rgba(0,180,255,0.3)', textAlign: 'center' }}>
              Use the command bar below<br />to talk to JARVIS
            </span>
          </div>
        ) : (
          <div ref={scrollRef} className="flex flex-col gap-3" style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 2 }}>
            <AnimatePresence>
              {msgs.map((m, i) => <MessageBubble key={i} m={m} />)}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── SYSTEM STATUS ── */}
      <div style={{ ...PANEL, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 10 }}>
          SYSTEM STATUS
        </div>

        <div className="flex justify-around mb-4">
          <CircleGauge value={cpu} label="CPU"    color="#00d4ff" />
          <CircleGauge value={mem} label="MEMORY" color="#00d4ff" />
          <CircleGauge value={81}  label="GPU"    color="#f59e0b" />
        </div>

        <div className="mb-3">
          <div className="flex justify-between mb-1.5">
            <span style={{ fontSize: 7.5, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.4)' }}>SYSTEM TEMPERATURE</span>
            <span style={{ fontSize: 7.5, color: 'rgba(0,212,255,0.7)' }}>42°C</span>
          </div>
          <div style={{ height: 3, background: 'rgba(0,100,180,0.15)', borderRadius: 2 }}>
            <div style={{ width: '42%', height: '100%', background: 'linear-gradient(90deg, #0066cc, #00aaff)', borderRadius: 2, boxShadow: '0 0 6px #00aaff60' }} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 7.5, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.4)', marginBottom: 4 }}>NETWORK ACTIVITY</div>
          <div style={{ background: 'rgba(0,60,120,0.1)', border: '1px solid rgba(0,180,255,0.08)', borderRadius: 2 }}>
            <Sparkline data={cpuUsage} color="#00d4ff" />
          </div>
        </div>
      </div>
    </div>
  );
}
