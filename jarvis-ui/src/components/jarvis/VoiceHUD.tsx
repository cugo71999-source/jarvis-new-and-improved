import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useJarvisStore } from '../../store/jarvisStore';
import { useJarvisVoice } from '../../hooks/useJarvisVoice';
import { loadLLMConfig } from '../../store/llmConfig';

const NUM_BARS = 28;

interface Props { onOpenSettings: () => void }

export function VoiceHUD({ onOpenSettings }: Props) {
  const { state } = useJarvisStore();
  const { micPermission, requestPermission, isActive, manualSubmit, cancelListening, llmError } = useJarvisVoice();
  const barsRef    = useRef<HTMLDivElement[]>([]);
  const [text, setText] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  const analyserRef  = useRef<AnalyserNode | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const audioDataRef = useRef<Uint8Array>(new Uint8Array(32));
  const streamRef2   = useRef<MediaStream | null>(null);

  const isLoud       = state === 'listening' || state === 'speaking';
  const isProcessing = state === 'processing' || state === 'executing';
  const cfg = loadLLMConfig();

  /* ── Real AudioContext mic analyzer ──────────────────────────────────── */
  useEffect(() => {
    if (micPermission !== 'granted') return;
    let alive = true;

    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }).then(stream => {
      if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
      const ctx    = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.72;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      streamRef2.current  = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }).catch(() => { /* permission already granted to voice hook — share gracefully */ });

    return () => {
      alive = false;
      audioCtxRef.current?.close();
      streamRef2.current?.getTracks().forEach(t => t.stop());
      analyserRef.current  = null;
      audioCtxRef.current  = null;
      streamRef2.current   = null;
    };
  }, [micPermission]);

  /* ── Waveform animation (real data when available) ───────────────────── */
  useEffect(() => {
    let af: number, t = 0;

    const tick = () => {
      af = requestAnimationFrame(tick);
      t += 0.065;

      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getByteFrequencyData(audioDataRef.current);
        const bins = audioDataRef.current;
        const avg  = bins.reduce((s, v) => s + v, 0) / bins.length;
        setMicLevel(avg / 255);
      }

      const dataLen = audioDataRef.current.length;

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        let h: number;

        if (analyser && micPermission === 'granted') {
          /* Map bar to frequency bin with slight mirroring for visual symmetry */
          const mirrored = i < NUM_BARS / 2 ? i : NUM_BARS - 1 - i;
          const binIdx   = Math.floor((mirrored / (NUM_BARS / 2)) * dataLen * 0.75);
          const raw      = audioDataRef.current[Math.min(binIdx, dataLen - 1)] / 255;
          /* Amplify based on state */
          const boost = isLoud ? 1.0 : isProcessing ? 0.55 : 0.18;
          const fake  = (Math.sin(t * 1.8 + i * 0.4) + 1) * 0.5 * (isProcessing ? 0.5 : 0.12);
          h = Math.max(3, 3 + (raw * boost + fake) * 25);
        } else {
          /* Fallback: animated sine pattern */
          const amp  = isLoud ? 16 : isProcessing ? 8 : 3;
          const base = isLoud ? 8 : isProcessing ? 5 : 4;
          const v    = Math.sin(t * 2.2 + i * 0.35) * amp * 0.5 + (isLoud ? Math.random() * 4 : 0);
          h = Math.max(3, Math.min(28, base + Math.abs(v)));
        }

        bar.style.height  = `${h}px`;
        bar.style.opacity = isLoud ? `${0.6 + Math.min(0.4, h / 28)}` : isProcessing ? '0.55' : '0.3';
      });
    };

    tick();
    return () => cancelAnimationFrame(af);
  }, [isLoud, isProcessing, micPermission]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) { manualSubmit(text); setText(''); }
  };

  const STATE_LABELS: Record<string, string> = {
    idle: 'STANDBY', listening: 'LISTENING', processing: 'THINKING',
    executing: 'EXECUTING', speaking: 'SPEAKING',
  };

  const borderColor = state === 'listening'
    ? 'rgba(0,240,255,0.55)'
    : state === 'processing' || state === 'executing'
    ? 'rgba(255,165,0,0.45)'
    : 'rgba(0,180,255,0.28)';

  const glowColor = state === 'listening'
    ? 'rgba(0,200,255,0.22)'
    : state === 'processing' || state === 'executing'
    ? 'rgba(255,165,0,0.14)'
    : 'rgba(0,150,255,0.07)';

  return (
    <div className="flex flex-col items-center" style={{ padding: '0 20px 10px' }}>

      {/* ── LLM error banner ── */}
      {llmError && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%', maxWidth: 780, marginBottom: 8,
            padding: '8px 16px', fontSize: 9, letterSpacing: '0.15em',
            background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.32)',
            color: '#f87171', fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: 6,
          }}>
          <span>⚠ {llmError}</span>
          <button onClick={onOpenSettings}
            style={{ fontSize: 8, letterSpacing: '0.2em', color: '#00d4ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            CONFIGURE LLM →
          </button>
        </motion.div>
      )}

      {/* ── Command bar ── */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 780, position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'rgba(4,12,36,0.97)',
          border: `1px solid ${borderColor}`,
          borderRadius: 12, padding: '0 8px', height: 62,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: `0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.04)`,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>

          {/* Waveform bars */}
          <div className="flex items-end gap-[2px] px-3" style={{ height: 40, flexShrink: 0 }}>
            {Array.from({ length: NUM_BARS }).map((_, i) => (
              <div key={i} ref={el => { if (el) barsRef.current[i] = el; }}
                style={{
                  width: 2.5, height: 4, borderRadius: 2, flexShrink: 0,
                  background: isLoud
                    ? 'linear-gradient(to top, #00d4ff, rgba(0,170,255,0.5))'
                    : isProcessing
                    ? 'linear-gradient(to top, #ffa500, rgba(255,100,0,0.5))'
                    : 'rgba(0,180,255,0.28)',
                  boxShadow: isLoud ? '0 0 3px rgba(0,212,255,0.6)' : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
            ))}
          </div>

          {/* Mic button */}
          <button type="button"
            onClick={micPermission === 'granted' ? (isActive ? cancelListening : undefined) : () => requestPermission()}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0, position: 'relative',
              background: micPermission === 'granted'
                ? state === 'listening' ? 'rgba(0,212,255,0.20)' : 'rgba(0,180,255,0.10)'
                : 'rgba(0,120,255,0.15)',
              border: `1.5px solid ${micPermission === 'granted' && state === 'listening' ? 'rgba(0,212,255,0.6)' : micPermission === 'granted' ? 'rgba(0,212,255,0.30)' : 'rgba(0,120,255,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00d4ff', cursor: 'pointer', marginRight: 10,
              boxShadow: state === 'listening' ? '0 0 18px rgba(0,212,255,0.45)' : 'none',
              transition: 'all 0.3s',
            }}>

            {/* Listening pulse ring */}
            {state === 'listening' && (
              <motion.div className="absolute" style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '1.5px solid rgba(0,212,255,0.55)',
              }}
                animate={{ scale: [1, 1.75], opacity: [0.65, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }} />
            )}

            {/* Real mic level ring */}
            {micPermission === 'granted' && micLevel > 0.05 && (
              <div style={{
                position: 'absolute', width: 40, height: 40, borderRadius: '50%',
                border: `1.5px solid rgba(0,212,255,${Math.min(0.8, micLevel * 2)})`,
                transform: `scale(${1 + micLevel * 0.5})`,
                transition: 'transform 0.08s ease, opacity 0.08s',
              }} />
            )}

            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x={9} y={2} width={6} height={12} rx={3} />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1={12} y1={19} x2={12} y2={22} />
              <line x1={8} y1={22} x2={16} y2={22} />
            </svg>
          </button>

          {/* Text input */}
          <input type="text" value={text} onChange={e => setText(e.target.value)}
            placeholder={
              state === 'listening'  ? 'Listening...'          :
              state === 'processing' ? 'Processing...'         :
              state === 'executing'  ? 'Executing...'          :
              state === 'speaking'   ? 'JARVIS is speaking...' :
              'Ask me anything...'
            }
            disabled={isProcessing || state === 'speaking'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, color: text ? 'rgba(210,230,255,0.92)' : 'rgba(90,140,200,0.42)',
              fontFamily: "'JetBrains Mono', 'Segoe UI', sans-serif",
              fontWeight: 400, letterSpacing: '0.02em',
            }} />

          {/* Mic level indicator bar */}
          {micPermission === 'granted' && (
            <div style={{
              width: 3, height: 28, background: 'rgba(0,60,120,0.4)',
              borderRadius: 2, overflow: 'hidden', marginRight: 8, flexShrink: 0,
            }}>
              <div style={{
                width: '100%',
                height: `${Math.round(micLevel * 100)}%`,
                background: micLevel > 0.6 ? '#ef4444' : micLevel > 0.3 ? '#ffa500' : '#00d4ff',
                borderRadius: 2,
                marginTop: 'auto',
                alignSelf: 'flex-end',
                transition: 'height 0.06s ease, background 0.15s',
                position: 'absolute',
                bottom: 0,
              }} />
            </div>
          )}

          {/* Settings */}
          <button type="button" onClick={onOpenSettings} title="Settings"
            style={{
              color: 'rgba(0,180,255,0.38)', cursor: 'pointer',
              background: 'none', border: 'none', padding: '4px 6px', marginRight: 4,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.72)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,180,255,0.38)')}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <circle cx={12} cy={12} r={3} />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* Send */}
          <button type="submit" disabled={!text.trim() || isProcessing}
            style={{
              width: 38, height: 38, borderRadius: 9, cursor: text.trim() && !isProcessing ? 'pointer' : 'default',
              background: 'linear-gradient(135deg, rgba(0,100,200,0.65), rgba(0,180,255,0.45))',
              border: '1px solid rgba(0,200,255,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00d4ff', boxShadow: '0 0 14px rgba(0,150,255,0.22)',
              opacity: text.trim() && !isProcessing ? 1 : 0.38,
              transition: 'all 0.2s',
            }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1={22} y1={2} x2={11} y2={13} />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>

      {/* Status bar */}
      <div className="flex items-center gap-4 mt-2" style={{ fontFamily: 'monospace' }}>
        <div className="flex items-center gap-2">
          <motion.div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: state === 'idle' ? '#00d4ff' : state === 'processing' || state === 'executing' ? '#ffa500' : '#00ffcc',
            boxShadow: `0 0 6px ${state === 'idle' ? '#00d4ff' : state === 'processing' ? '#ffa500' : '#00ffcc'}`,
          }}
            animate={{ opacity: [1, 0.28, 1] }}
            transition={{ duration: state === 'listening' ? 0.55 : 2.2, repeat: Infinity }} />
          <span style={{ fontSize: 8, letterSpacing: '0.35em', color: 'rgba(0,180,255,0.38)' }}>
            {STATE_LABELS[state] || 'STANDBY'}
          </span>
        </div>
        <span style={{ fontSize: 7.5, color: 'rgba(0,180,255,0.22)', letterSpacing: '0.15em' }}>•</span>
        <span style={{ fontSize: 7.5, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.26)' }}>
          {cfg.model || 'NO MODEL'} @ {cfg.baseUrl.replace('http://', '').replace('/v1', '') || 'NOT SET'}
        </span>
        {micPermission === 'granted' && (
          <>
            <span style={{ fontSize: 7.5, color: 'rgba(0,180,255,0.22)', letterSpacing: '0.15em' }}>•</span>
            <span style={{ fontSize: 7.5, letterSpacing: '0.2em', color: 'rgba(0,230,100,0.42)' }}>🎤 MIC ACTIVE</span>
          </>
        )}
      </div>
    </div>
  );
}
