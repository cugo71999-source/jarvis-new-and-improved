import React from 'react';
import { motion } from 'framer-motion';
import { useJarvisStore } from '../../store/jarvisStore';

const PANEL: React.CSSProperties = {
  background: 'rgba(6,16,38,0.88)',
  border: '1px solid rgba(0,160,255,0.16)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 6,
};

export function MemoryPage() {
  const { aiResponse, transcript } = useJarvisStore();
  const hasData = aiResponse || transcript;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ fontFamily: 'monospace', padding: '0 20px 16px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.4em', color: '#fff', marginBottom: 4 }}>MEMORY</h2>
          <p style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(0,180,255,0.45)' }}>JARVIS KNOWLEDGE & CONTEXT STORAGE</p>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>128.4 GB</div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', flex: 1 }}>
        {/* Context */}
        <div style={{ ...PANEL, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 12 }}>ACTIVE CONTEXT</div>
          {!hasData ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ opacity: 0.3 }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth={1.2}>
                <circle cx={12} cy={12} r={3} />
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3" />
              </svg>
              <span style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.5)' }}>NO CONTEXT YET</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {transcript && (
                <div style={{ padding: '8px 10px', background: 'rgba(0,80,200,0.08)', border: '1px solid rgba(0,120,255,0.18)', borderLeft: '2px solid #4488ff' }}>
                  <div style={{ fontSize: 7, letterSpacing: '0.25em', color: 'rgba(100,150,255,0.5)', marginBottom: 4 }}>LAST USER INPUT</div>
                  <div style={{ fontSize: 9, color: 'rgba(180,200,255,0.8)', lineHeight: 1.6 }}>{transcript}</div>
                </div>
              )}
              {aiResponse && (
                <div style={{ padding: '8px 10px', background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.15)', borderLeft: '2px solid #00d4ff' }}>
                  <div style={{ fontSize: 7, letterSpacing: '0.25em', color: 'rgba(0,180,255,0.45)', marginBottom: 4 }}>LAST JARVIS RESPONSE</div>
                  <div style={{ fontSize: 9, color: 'rgba(0,200,255,0.8)', lineHeight: 1.6 }}>{aiResponse}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ ...PANEL, padding: '16px 18px' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,180,255,0.45)', marginBottom: 12 }}>STORAGE METRICS</div>
          {[
            { label: 'TOTAL CAPACITY', value: '512 GB', color: '#00d4ff' },
            { label: 'USED',           value: '128.4 GB', color: '#3b82f6' },
            { label: 'CONVERSATIONS',  value: '0',        color: '#8b5cf6' },
            { label: 'EMBEDDINGS',     value: '0',        color: '#22c55e' },
            { label: 'KNOWLEDGE BASE', value: '24.7 GB',  color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(0,180,255,0.45)' }}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, height: 4, background: 'rgba(0,100,180,0.15)', borderRadius: 2 }}>
            <div style={{ width: '25%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #00d4ff)', borderRadius: 2, boxShadow: '0 0 8px #00d4ff40' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: 7, color: 'rgba(0,180,255,0.35)' }}>128.4 GB used</span>
            <span style={{ fontSize: 7, color: 'rgba(0,180,255,0.35)' }}>383.6 GB free</span>
          </div>
        </div>
      </div>
    </div>
  );
}
