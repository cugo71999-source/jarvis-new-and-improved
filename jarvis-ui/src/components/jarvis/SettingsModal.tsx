import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadLLMConfig, saveLLMConfig, LLM_PRESETS, type LLMConfig } from '../../store/llmConfig';

interface Props { open: boolean; onClose: () => void }

type Tab = 'ai' | 'voice' | 'microphone' | 'wakeword' | 'appearance' | 'general';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'ai',         label: 'AI Model',    icon: '🤖' },
  { key: 'microphone', label: 'Microphone',  icon: '🎤' },
  { key: 'voice',      label: 'Voice',       icon: '🔊' },
  { key: 'wakeword',   label: 'Wake Word',   icon: '⚡' },
  { key: 'appearance', label: 'Appearance',  icon: '🎨' },
  { key: 'general',    label: 'General',     icon: '⚙️' },
];

interface JarvisSettings {
  micDeviceId:           string;
  wakeWordEnabled:       boolean;
  wakeWordPhrase:        string;
  wakeWordSensitivity:   number;
  noiseCancellation:     boolean;
  echoCancellation:      boolean;
  autoGainControl:       boolean;
  ttsRate:               number;
  ttsVolume:             number;
  animationsEnabled:     boolean;
  orbSize:               number;
  theme:                 'dark-blue' | 'dark-green' | 'dark-purple';
}

const DEFAULT_JARVIS_SETTINGS: JarvisSettings = {
  micDeviceId:         '',
  wakeWordEnabled:     false,
  wakeWordPhrase:      'hey jarvis',
  wakeWordSensitivity: 0.6,
  noiseCancellation:   true,
  echoCancellation:    true,
  autoGainControl:     true,
  ttsRate:             1.0,
  ttsVolume:           1.0,
  animationsEnabled:   true,
  orbSize:             100,
  theme:               'dark-blue',
};

function loadJarvisSettings(): JarvisSettings {
  try {
    const s = localStorage.getItem('jarvis-settings');
    return s ? { ...DEFAULT_JARVIS_SETTINGS, ...JSON.parse(s) } : DEFAULT_JARVIS_SETTINGS;
  } catch { return DEFAULT_JARVIS_SETTINGS; }
}

function saveJarvisSettings(s: JarvisSettings) {
  localStorage.setItem('jarvis-settings', JSON.stringify(s));
}

const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'rgba(0,40,100,0.3)',
  border: '1px solid rgba(0,180,255,0.22)',
  borderRadius: 5, color: '#fff',
  fontSize: 12, fontFamily: 'monospace',
  outline: 'none', boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  fontSize: 8, letterSpacing: '0.28em',
  color: 'rgba(0,180,255,0.48)', marginBottom: 6,
  display: 'block', fontFamily: 'monospace',
};

function SliderRow({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={LABEL}>{label}</span>
        <span style={{ fontSize: 9, color: '#00d4ff', fontFamily: 'monospace' }}>
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#00d4ff' }} />
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, position: 'relative',
        background: value ? 'rgba(0,180,255,0.4)' : 'rgba(0,40,80,0.4)',
        border: `1px solid ${value ? 'rgba(0,212,255,0.5)' : 'rgba(0,100,180,0.3)'}`,
        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', width: 16, height: 16, borderRadius: 8, top: 2,
        left: value ? 20 : 2,
        background: value ? '#00d4ff' : 'rgba(0,120,200,0.5)',
        transition: 'left 0.2s, background 0.2s',
        boxShadow: value ? '0 0 6px rgba(0,212,255,0.6)' : 'none',
      }} />
    </button>
  );
}

function ToggleRow({ label, sub, value, onChange }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(200,225,255,0.75)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{label}</div>
        {sub && <div style={{ fontSize: 8, color: 'rgba(0,180,255,0.38)', fontFamily: 'monospace', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

/* ── AI Model Tab ────────────────────────────────────────────────────────── */
function AIModelTab({ cfg, setCfg }: { cfg: LLMConfig; setCfg: React.Dispatch<React.SetStateAction<LLMConfig>> }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const activePreset = LLM_PRESETS.find(p => p.url === cfg.baseUrl);

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const endpoint = cfg.baseUrl.replace(/\/$/, '') + '/models';
      const res = await fetch(endpoint, {
        headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data ?? []).map((m: any) => m.id).join(', ') || 'connected';
        setTestResult(`✓ Connected — ${models}`);
      } else {
        setTestResult(`✗ HTTP ${res.status} — check endpoint`);
      }
    } catch {
      setTestResult(`✗ Could not reach ${cfg.baseUrl}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      {/* Groq status */}
      <div style={{
        marginBottom: 18, padding: '10px 13px', fontSize: 9, lineHeight: 1.7,
        background: 'rgba(0,212,80,0.05)', border: '1px solid rgba(0,212,80,0.22)',
        color: 'rgba(0,210,80,0.75)', borderRadius: 4,
      }}>
        <span style={{ color: '#00e664', fontWeight: 700 }}>✓ GROQ CONFIGURED</span> — API key stored server-side.<br />
        <span style={{ color: 'rgba(0,210,255,0.55)' }}>Select <span style={{ color: '#00d4ff' }}>Groq (Server)</span> preset below — no key needed in browser.</span>
      </div>

      {/* Presets */}
      <div style={{ marginBottom: 16 }}>
        <span style={LABEL}>QUICK PRESETS</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LLM_PRESETS.map(p => {
            const isActive = cfg.baseUrl === p.url;
            return (
              <button key={p.name}
                onClick={() => setCfg(prev => ({ ...prev, baseUrl: p.url, model: p.placeholder }))}
                style={{
                  padding: '4px 12px', fontSize: 9, letterSpacing: '0.15em', borderRadius: 4,
                  background: isActive ? 'rgba(0,180,255,0.18)' : 'rgba(0,60,120,0.2)',
                  border: isActive ? '1px solid rgba(0,212,255,0.5)' : '1px solid rgba(0,180,255,0.15)',
                  color: isActive ? '#00d4ff' : 'rgba(0,180,255,0.55)', cursor: 'pointer',
                }}>
                {p.name}{p.requiresKey ? ' 🔑' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Endpoint */}
      <div style={{ marginBottom: 14 }}>
        <span style={LABEL}>ENDPOINT URL</span>
        <input style={INPUT} value={cfg.baseUrl} onChange={e => setCfg(p => ({ ...p, baseUrl: e.target.value }))} placeholder="http://localhost:11434/v1" />
        <p style={{ fontSize: 7.5, color: 'rgba(0,180,255,0.3)', marginTop: 4, fontFamily: 'monospace' }}>OpenAI-compatible endpoint (Ollama, LM Studio, Jan, Groq…)</p>
      </div>

      {/* Model */}
      <div style={{ marginBottom: 14 }}>
        <span style={LABEL}>MODEL NAME</span>
        <input style={INPUT} value={cfg.model} onChange={e => setCfg(p => ({ ...p, model: e.target.value }))} placeholder="llama3.2" />
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 18 }}>
        <span style={LABEL}>API KEY <span style={{ opacity: 0.5 }}>{activePreset?.requiresKey ? '(REQUIRED)' : '(OPTIONAL)'}</span></span>
        <input style={{
          ...INPUT,
          borderColor: activePreset?.requiresKey && !cfg.apiKey ? 'rgba(255,200,0,0.4)' : 'rgba(0,180,255,0.22)',
        }} type="password" value={cfg.apiKey}
          onChange={e => setCfg(p => ({ ...p, apiKey: e.target.value }))}
          placeholder={activePreset?.requiresKey ? 'Paste API key (gsk_... or sk-...)' : 'sk-... (leave blank for local)'} />
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          marginBottom: 14, padding: '8px 12px', fontSize: 9, borderRadius: 4,
          background: testResult.startsWith('✓') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${testResult.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: testResult.startsWith('✓') ? '#22c55e' : '#ef4444', fontFamily: 'monospace',
        }}>{testResult}</div>
      )}

      <button onClick={handleTest} disabled={testing || !cfg.baseUrl}
        style={{
          width: '100%', padding: '9px 0', fontSize: 9, letterSpacing: '0.25em', borderRadius: 4,
          background: 'rgba(0,60,120,0.25)', border: '1px solid rgba(0,180,255,0.25)',
          color: 'rgba(0,200,255,0.7)', cursor: testing ? 'not-allowed' : 'pointer',
          opacity: testing ? 0.6 : 1, fontFamily: 'monospace',
        }}>
        {testing ? 'TESTING…' : 'TEST CONNECTION'}
      </button>
    </div>
  );
}

/* ── Microphone Tab ──────────────────────────────────────────────────────── */
function MicrophoneTab({ settings, setSettings }: { settings: JarvisSettings; setSettings: React.Dispatch<React.SetStateAction<JarvisSettings>> }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const afRef = useRef<number>(0);

  const loadDevices = async () => {
    setLoading(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs.filter(d => d.kind === 'audioinput'));
    } catch { setDevices([]); }
    setLoading(false);
  };

  useEffect(() => { loadDevices(); }, []);

  const testMic = async () => {
    if (ctxRef.current) {
      ctxRef.current.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(afRef.current);
      analyserRef.current = null;
      ctxRef.current = null;
      setMicLevel(0);
      return;
    }
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: settings.micDeviceId ? { exact: settings.micDeviceId } : undefined,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseCancellation,
          autoGainControl: settings.autoGainControl,
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      ctxRef.current = ctx;
      analyserRef.current = analyser;

      const tick = () => {
        afRef.current = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setMicLevel(avg / 255);
      };
      tick();
    } catch { /* denied */ }
  };

  useEffect(() => () => {
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(afRef.current);
  }, []);

  return (
    <div>
      {/* Device selection */}
      <div style={{ marginBottom: 18 }}>
        <span style={LABEL}>INPUT DEVICE</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={settings.micDeviceId}
            onChange={e => setSettings(p => ({ ...p, micDeviceId: e.target.value }))}
            style={{ ...INPUT, flex: 1 }}>
            <option value="">Default microphone</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0,6)}`}</option>
            ))}
          </select>
          <button onClick={loadDevices} disabled={loading}
            style={{
              padding: '8px 12px', fontSize: 9, background: 'rgba(0,60,120,0.3)',
              border: '1px solid rgba(0,180,255,0.22)', color: 'rgba(0,200,255,0.7)',
              cursor: 'pointer', borderRadius: 4, fontFamily: 'monospace', flexShrink: 0,
            }}>
            {loading ? '…' : '⟳'}
          </button>
        </div>
        {devices.length === 0 && !loading && (
          <p style={{ fontSize: 8, color: 'rgba(255,200,0,0.6)', marginTop: 5, fontFamily: 'monospace' }}>
            ⚠ No devices found — click ⟳ after granting mic permission
          </p>
        )}
      </div>

      {/* Mic level test */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={LABEL}>MIC LEVEL TEST</span>
          <button onClick={testMic}
            style={{
              padding: '4px 12px', fontSize: 8, letterSpacing: '0.2em',
              background: ctxRef.current ? 'rgba(239,68,68,0.15)' : 'rgba(0,60,120,0.3)',
              border: ctxRef.current ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(0,180,255,0.22)',
              color: ctxRef.current ? '#ef4444' : 'rgba(0,200,255,0.7)',
              cursor: 'pointer', borderRadius: 4, fontFamily: 'monospace',
            }}>
            {ctxRef.current ? 'STOP' : 'TEST MIC'}
          </button>
        </div>
        {/* Level bar */}
        <div style={{ height: 14, background: 'rgba(0,40,80,0.4)', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(0,180,255,0.12)' }}>
          <motion.div
            animate={{ width: `${Math.round(micLevel * 100)}%` }}
            transition={{ duration: 0.06 }}
            style={{
              height: '100%', borderRadius: 7,
              background: micLevel > 0.7 ? 'linear-gradient(to right, #22c55e, #ef4444)' : micLevel > 0.4 ? 'linear-gradient(to right, #00d4ff, #22c55e)' : 'linear-gradient(to right, #0044cc, #00d4ff)',
              boxShadow: '0 0 8px rgba(0,212,255,0.4)',
            }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 7, color: 'rgba(0,180,255,0.3)', fontFamily: 'monospace' }}>SILENT</span>
          <span style={{ fontSize: 8, color: micLevel > 0.05 ? '#00d4ff' : 'rgba(0,180,255,0.3)', fontFamily: 'monospace', fontWeight: 700 }}>
            {Math.round(micLevel * 100)}%
          </span>
          <span style={{ fontSize: 7, color: 'rgba(0,180,255,0.3)', fontFamily: 'monospace' }}>LOUD</span>
        </div>
      </div>

      {/* Processing options */}
      <div style={{ padding: '14px 14px', background: 'rgba(0,20,60,0.3)', borderRadius: 6, border: '1px solid rgba(0,100,180,0.15)' }}>
        <span style={{ ...LABEL, marginBottom: 12 }}>AUDIO PROCESSING</span>
        <ToggleRow label="Noise Cancellation" sub="Reduce background noise during listening" value={settings.noiseCancellation} onChange={v => setSettings(p => ({ ...p, noiseCancellation: v }))} />
        <ToggleRow label="Echo Cancellation" sub="Prevent JARVIS voice from being picked up" value={settings.echoCancellation} onChange={v => setSettings(p => ({ ...p, echoCancellation: v }))} />
        <ToggleRow label="Auto Gain Control" sub="Automatically adjust microphone volume" value={settings.autoGainControl} onChange={v => setSettings(p => ({ ...p, autoGainControl: v }))} />
      </div>
    </div>
  );
}

/* ── Voice Tab ───────────────────────────────────────────────────────────── */
function VoiceTab({ settings, setSettings }: { settings: JarvisSettings; setSettings: React.Dispatch<React.SetStateAction<JarvisSettings>> }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  const testVoice = () => {
    const utt = new SpeechSynthesisUtterance('JARVIS online. All systems nominal, sir.');
    utt.rate   = settings.ttsRate;
    utt.volume = settings.ttsVolume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  };

  return (
    <div>
      <SliderRow label="SPEECH RATE" value={settings.ttsRate} min={0.5} max={2.0} step={0.05}
        format={v => `${v.toFixed(2)}x`} onChange={v => setSettings(p => ({ ...p, ttsRate: v }))} />
      <SliderRow label="VOLUME" value={settings.ttsVolume} min={0} max={1} step={0.05}
        format={v => `${Math.round(v * 100)}%`} onChange={v => setSettings(p => ({ ...p, ttsVolume: v }))} />

      {voices.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <span style={LABEL}>VOICE SELECTION</span>
          <select style={INPUT}>
            {voices.filter(v => v.lang.startsWith('en')).map(v => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
      )}

      <button onClick={testVoice}
        style={{
          width: '100%', padding: '9px 0', fontSize: 9, letterSpacing: '0.25em', borderRadius: 4,
          background: 'rgba(0,60,120,0.25)', border: '1px solid rgba(0,180,255,0.25)',
          color: 'rgba(0,200,255,0.7)', cursor: 'pointer', fontFamily: 'monospace',
        }}>
        ▶ TEST VOICE
      </button>
    </div>
  );
}

/* ── Wake Word Tab ───────────────────────────────────────────────────────── */
function WakeWordTab({ settings, setSettings }: { settings: JarvisSettings; setSettings: React.Dispatch<React.SetStateAction<JarvisSettings>> }) {
  return (
    <div>
      <div style={{ marginBottom: 18, padding: '12px 14px', background: 'rgba(0,30,80,0.3)', border: '1px solid rgba(0,100,180,0.18)', borderRadius: 6 }}>
        <div style={{ fontSize: 9, color: 'rgba(0,200,255,0.65)', lineHeight: 1.7, fontFamily: 'monospace' }}>
          When enabled, JARVIS continuously listens for your wake phrase using minimal CPU. Say the phrase and JARVIS automatically begins processing your command.
        </div>
      </div>

      <ToggleRow label="Enable Wake Word" sub="Continuously listen for activation phrase" value={settings.wakeWordEnabled} onChange={v => setSettings(p => ({ ...p, wakeWordEnabled: v }))} />

      <div style={{ marginBottom: 16, opacity: settings.wakeWordEnabled ? 1 : 0.45, transition: 'opacity 0.2s' }}>
        <span style={LABEL}>WAKE PHRASE</span>
        <input style={INPUT} value={settings.wakeWordPhrase} disabled={!settings.wakeWordEnabled}
          onChange={e => setSettings(p => ({ ...p, wakeWordPhrase: e.target.value }))}
          placeholder="hey jarvis" />
        <p style={{ fontSize: 7.5, color: 'rgba(0,180,255,0.3)', marginTop: 4, fontFamily: 'monospace' }}>
          Lowercase, 2-4 words works best. Currently uses Web Speech API recognition.
        </p>
      </div>

      <div style={{ opacity: settings.wakeWordEnabled ? 1 : 0.45, transition: 'opacity 0.2s' }}>
        <SliderRow label="SENSITIVITY" value={settings.wakeWordSensitivity} min={0.1} max={1.0} step={0.05}
          format={v => `${Math.round(v * 100)}%`} onChange={v => setSettings(p => ({ ...p, wakeWordSensitivity: v }))} />
      </div>

      <div style={{ padding: '10px 14px', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: 4 }}>
        <p style={{ fontSize: 8, color: 'rgba(255,200,80,0.7)', fontFamily: 'monospace', lineHeight: 1.7 }}>
          ⚡ Wake word detection requires mic permission. Higher sensitivity may cause false triggers in noisy environments.
        </p>
      </div>
    </div>
  );
}

/* ── Appearance Tab ──────────────────────────────────────────────────────── */
function AppearanceTab({ settings, setSettings }: { settings: JarvisSettings; setSettings: React.Dispatch<React.SetStateAction<JarvisSettings>> }) {
  const themes = [
    { key: 'dark-blue',   name: 'Arc Reactor',   color: '#00d4ff' },
    { key: 'dark-green',  name: 'Matrix',         color: '#00ff88' },
    { key: 'dark-purple', name: 'Nexus',          color: '#a855f7' },
  ] as const;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <span style={LABEL}>COLOR THEME</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {themes.map(t => (
            <button key={t.key} onClick={() => setSettings(p => ({ ...p, theme: t.key }))}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 6, cursor: 'pointer',
                background: settings.theme === t.key ? `${t.color}15` : 'rgba(0,20,60,0.3)',
                border: `1px solid ${settings.theme === t.key ? `${t.color}55` : 'rgba(0,100,180,0.18)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.color, boxShadow: `0 0 10px ${t.color}` }} />
              <span style={{ fontSize: 8, color: settings.theme === t.key ? t.color : 'rgba(180,210,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.15em' }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <SliderRow label="ORB SIZE" value={settings.orbSize} min={60} max={130} step={5}
        format={v => `${v}%`} onChange={v => setSettings(p => ({ ...p, orbSize: v }))} />

      <ToggleRow label="Animations" sub="Enable all UI transitions and orbital animations" value={settings.animationsEnabled} onChange={v => setSettings(p => ({ ...p, animationsEnabled: v }))} />
    </div>
  );
}

/* ── General Tab ─────────────────────────────────────────────────────────── */
function GeneralTab() {
  const version = '2.4.1';
  const clearMemory = () => { if (confirm('Clear all JARVIS memory and conversation history?')) { localStorage.clear(); window.location.reload(); } };

  return (
    <div>
      <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(0,20,60,0.3)', borderRadius: 6, border: '1px solid rgba(0,100,180,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(0,180,255,0.5)', fontFamily: 'monospace' }}>JARVIS VERSION</span>
          <span style={{ fontSize: 9, color: '#00d4ff', fontFamily: 'monospace' }}>v{version}</span>
        </div>
        {[
          ['Runtime',   'Browser (Web App)'],
          ['LLM',       'Groq Cloud (llama-3.3-70b)'],
          ['Voice',     'Web Speech API'],
          ['Storage',   'localStorage'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 8, color: 'rgba(0,180,255,0.35)', fontFamily: 'monospace' }}>{k}</span>
            <span style={{ fontSize: 8, color: 'rgba(200,220,255,0.6)', fontFamily: 'monospace' }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.04)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.15)' }}>
        <div style={{ fontSize: 9, color: 'rgba(200,220,255,0.6)', marginBottom: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>
          Danger zone — these actions cannot be undone.
        </div>
        <button onClick={clearMemory}
          style={{
            padding: '8px 16px', fontSize: 9, letterSpacing: '0.2em',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', cursor: 'pointer', borderRadius: 4, fontFamily: 'monospace',
          }}>
          CLEAR ALL DATA
        </button>
      </div>
    </div>
  );
}

/* ── Main Modal ──────────────────────────────────────────────────────────── */
export function SettingsModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [cfg, setCfg]             = useState<LLMConfig>(() => loadLLMConfig());
  const [settings, setSettings]   = useState<JarvisSettings>(() => loadJarvisSettings());
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    if (open) {
      setCfg(loadLLMConfig());
      setSettings(loadJarvisSettings());
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    saveLLMConfig(cfg);
    saveJarvisSettings(settings);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,5,20,0.80)', backdropFilter: 'blur(8px)', zIndex: 100 }} />

          {/* Panel */}
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 700, maxWidth: '95vw', maxHeight: '88vh',
              zIndex: 101, display: 'flex', flexDirection: 'column',
              background: 'rgba(3,10,28,0.99)',
              border: '1px solid rgba(0,180,255,0.22)',
              borderTop: '2px solid rgba(0,212,255,0.5)',
              boxShadow: '0 0 80px rgba(0,100,255,0.18), 0 0 160px rgba(0,50,150,0.08)',
              fontFamily: 'monospace', borderRadius: 8, overflow: 'hidden',
            }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px 16px',
              borderBottom: '1px solid rgba(0,180,255,0.12)',
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.35em', color: '#fff', marginBottom: 3 }}>SETTINGS</h2>
                <p style={{ fontSize: 7.5, letterSpacing: '0.22em', color: 'rgba(0,180,255,0.38)' }}>JARVIS AI OPERATING SYSTEM — CONFIGURATION</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,180,255,0.4)', fontSize: 22, lineHeight: 1, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,180,255,0.4)')}>×</button>
            </div>

            {/* Body: sidebar + content */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

              {/* Sidebar */}
              <div style={{
                width: 160, flexShrink: 0, padding: '14px 10px',
                borderRight: '1px solid rgba(0,180,255,0.10)',
                background: 'rgba(0,10,30,0.5)',
                overflowY: 'auto',
              }}>
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 10px', marginBottom: 3,
                      background: activeTab === tab.key ? 'rgba(0,180,255,0.12)' : 'transparent',
                      border: activeTab === tab.key ? '1px solid rgba(0,180,255,0.25)' : '1px solid transparent',
                      borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                      color: activeTab === tab.key ? '#00d4ff' : 'rgba(140,180,230,0.5)',
                      fontSize: 9.5, letterSpacing: '0.1em', transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                    {activeTab === 'ai'         && <AIModelTab   cfg={cfg} setCfg={setCfg} />}
                    {activeTab === 'microphone' && <MicrophoneTab settings={settings} setSettings={setSettings} />}
                    {activeTab === 'voice'      && <VoiceTab      settings={settings} setSettings={setSettings} />}
                    {activeTab === 'wakeword'   && <WakeWordTab   settings={settings} setSettings={setSettings} />}
                    {activeTab === 'appearance' && <AppearanceTab settings={settings} setSettings={setSettings} />}
                    {activeTab === 'general'    && <GeneralTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '14px 24px', borderTop: '1px solid rgba(0,180,255,0.10)',
              flexShrink: 0,
            }}>
              <button onClick={onClose}
                style={{
                  padding: '9px 20px', fontSize: 9, letterSpacing: '0.2em',
                  background: 'transparent', border: '1px solid rgba(0,100,180,0.25)',
                  color: 'rgba(0,180,255,0.5)', cursor: 'pointer', borderRadius: 5,
                }}>CANCEL</button>
              <button onClick={handleSave}
                style={{
                  padding: '9px 28px', fontSize: 9, letterSpacing: '0.3em', fontWeight: 700,
                  background: saved ? 'rgba(34,197,94,0.18)' : 'rgba(0,180,255,0.15)',
                  border: `1px solid ${saved ? 'rgba(34,197,94,0.5)' : 'rgba(0,212,255,0.4)'}`,
                  color: saved ? '#22c55e' : '#00d4ff', cursor: 'pointer', borderRadius: 5,
                  transition: 'all 0.2s',
                }}>
                {saved ? '✓ SAVED' : 'SAVE & APPLY'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
