import React from 'react';
import { useJarvisStore } from '../../store/jarvisStore';
import type { Page } from './AppShell';

function Clock() {
  const [t, setT] = React.useState(() =>
    new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })
  );
  React.useEffect(() => {
    const iv = setInterval(() =>
      setT(new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }))
    , 1000);
    return () => clearInterval(iv);
  }, []);
  return <>{t}</>;
}

function DateStr() {
  const d = new Date();
  return <>{d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</>;
}

interface Props {
  activePage: Page;
  onNavigate: (p: Page) => void;
}

const NAV: { key: Page; label: string }[] = [
  { key: 'home',       label: 'HOME'       },
  { key: 'agents',     label: 'AGENTS'     },
  { key: 'projects',   label: 'PROJECTS'   },
  { key: 'memory',     label: 'MEMORY'     },
  { key: 'automation', label: 'AUTOMATION' },
];

export function HudOverlay({ activePage, onNavigate }: Props) {
  const { cpuUsage, memoryUsage } = useJarvisStore();
  const cpu = Math.round(cpuUsage[cpuUsage.length - 1] || 0);
  const mem = Math.round(memoryUsage[memoryUsage.length - 1] || 0);

  return (
    <div className="flex items-center justify-between px-5"
      style={{
        height: 50, flexShrink: 0,
        background: 'rgba(3,12,30,0.95)',
        borderBottom: '1px solid rgba(0,160,255,0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative', zIndex: 60,
      }}>

      {/* Logo + Nav */}
      <div className="flex items-center gap-7">
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'linear-gradient(135deg, #0044cc, #0088ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(0,136,255,0.5)',
          }}>
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <polygon points="7,2 12,11 2,11" fill="none" stroke="#00d4ff" strokeWidth={1.2} />
              <circle cx={7} cy={7} r={2} fill="#00d4ff" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#ffffff' }}>JARVIS OS</span>
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ opacity: 0.4 }}>
            <path d="M3 1.5l3.5 3.5L3 8.5" stroke="#00aaff" strokeWidth={1.4} strokeLinecap="round"/>
          </svg>
        </div>

        <nav className="flex items-center gap-0.5">
          {NAV.map(item => {
            const active = activePage === item.key;
            return (
              <button key={item.key}
                onClick={() => onNavigate(item.key)}
                style={{
                  padding: '6px 14px', fontSize: 10, letterSpacing: '0.2em',
                  fontFamily: 'monospace', fontWeight: active ? 700 : 500,
                  color: active ? '#00d4ff' : 'rgba(160,200,255,0.42)',
                  background: active ? 'rgba(0,180,255,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(0,212,255,0.28)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.18s ease',
                  position: 'relative',
                }}>
                {item.label}
                {/* Active underline */}
                {active && (
                  <div style={{
                    position: 'absolute', bottom: -1, left: '15%', right: '15%', height: 2,
                    background: 'linear-gradient(to right, transparent, #00d4ff, transparent)',
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: system stats */}
      <div className="flex items-center gap-4" style={{ fontSize: 11, fontFamily: 'monospace' }}>
        <div className="flex flex-col items-end" style={{ lineHeight: 1.3 }}>
          <span style={{ fontSize: 7, letterSpacing: '0.25em', color: 'rgba(0,180,255,0.4)' }}>MODEL</span>
          <span style={{ fontSize: 9.5, letterSpacing: '0.08em', color: 'rgba(0,212,255,0.8)', fontWeight: 600 }}>GPT-4.5 TURBO</span>
        </div>

        <div style={{ width: 1, height: 28, background: 'rgba(0,180,255,0.12)' }} />

        {[
          { label: 'CPU', value: `${cpu}%` },
          { label: 'RAM', value: `${mem}%` },
          { label: 'NET', value: '1.2 TB/s' },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <div className="flex flex-col items-center" style={{ lineHeight: 1.3 }}>
              <span style={{ fontSize: 7, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.4)' }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>{item.value}</span>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 20, background: 'rgba(0,180,255,0.1)' }} />}
          </React.Fragment>
        ))}

        <div style={{ width: 1, height: 28, background: 'rgba(0,180,255,0.12)' }} />

        <div className="flex flex-col items-end" style={{ lineHeight: 1.3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}><Clock /></span>
          <span style={{ fontSize: 7.5, letterSpacing: '0.16em', color: 'rgba(180,210,255,0.38)' }}><DateStr /></span>
        </div>

        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a3a6a, #2a5599)',
          border: '1.5px solid rgba(0,180,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 8px rgba(0,120,255,0.25)', cursor: 'pointer',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,255,0.8)" strokeWidth={1.5}>
            <circle cx={12} cy={8} r={4} />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
