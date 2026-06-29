import { useEffect, useRef, useCallback, useState } from 'react';
import { useJarvisStore } from '../store/jarvisStore';
import { loadLLMConfig } from '../store/llmConfig';
import { processRequest, AGENT_META, type AgentId } from '../agents/agentSystem';

const WAKE_PHRASES = ['hey jarvis', 'jarvis', 'ok jarvis'];
const SILENCE_MS = 1800;
const WATCHDOG_INTERVAL_MS = 5000;
const WATCHDOG_STALE_MS = 10000;

export type MicPermission = 'unknown' | 'granted' | 'denied';

/* ── Audio playback ──────────────────────────────────────────────────────── */
function playBase64Audio(base64: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(() => resolve());
    } catch { resolve(); }
  });
}

/* ── Browser TTS fallback ──────────────────────────────────────────────── */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find(v => v.name === 'Google UK English Male')   ??
    voices.find(v => v.name === 'Google US English')         ??
    voices.find(v => v.name === 'Google UK English Female')  ??
    voices.find(v => v.name.startsWith('Google') && /en/i.test(v.lang)) ??
    voices.find(v => /Microsoft.*Natural/i.test(v.name) && /en/i.test(v.lang)) ??
    voices.find(v => /Guy|David|Mark|James|Daniel/i.test(v.name) && /en/i.test(v.lang)) ??
    voices.find(v => /en[-_](GB|US|AU)/i.test(v.lang)) ??
    voices.find(v => /en/i.test(v.lang)) ??
    null
  );
}

function speakBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) { resolve(); return; }
      synth.cancel();
      const doSpeak = () => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.90; utt.pitch = 0.88; utt.volume = 1;
        const voice = getBestVoice();
        if (voice) utt.voice = voice;
        utt.onend = () => resolve();
        utt.onerror = () => resolve();
        synth.speak(utt);
      };
      if (synth.getVoices().length > 0) { doSpeak(); }
      else { synth.onvoiceschanged = () => doSpeak(); setTimeout(doSpeak, 500); }
    } catch { resolve(); }
  });
}

async function speakGoogleTTS(text: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/voice/tts?text=${encodeURIComponent(text.slice(0, 400))}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const { audio } = await res.json();
    if (!audio) return false;
    await playBase64Audio(audio);
    return true;
  } catch {
    return false;
  }
}

async function speak(text: string): Promise<void> {
  const ok = await speakGoogleTTS(text);
  if (!ok) await speakBrowser(text);
}

/* ═══════════════════════════════════════════════════════════════════════════
   useJarvisVoice
═══════════════════════════════════════════════════════════════════════════ */
export function useJarvisVoice() {
  const recognitionRef    = useRef<any>(null);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef        = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const phaseRef          = useRef<'passive' | 'listening' | 'processing' | 'speaking'>('passive');
  const interimRef        = useRef('');
  const streamRef         = useRef<MediaStream | null>(null);
  const permissionRef     = useRef<MicPermission>('unknown');
  const watchdogRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventMsRef    = useRef<number>(0);
  const restartDelayRef   = useRef<number>(200);
  const isRestartingRef   = useRef(false);

  const [speechSupported] = useState(
    () => !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition
  );
  const [micPermission, _setMicPermission] = useState<MicPermission>('unknown');
  const [audioDevices, setAudioDevices]   = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isActive, setIsActive]           = useState(false);
  const [llmError, setLlmError]           = useState<string | null>(null);

  const {
    setState, setTranscript, setAiResponse, setActiveAgent,
    addTask, updateTask, addMessage,
  } = useJarvisStore();

  const setMicPermission = useCallback((p: MicPermission) => {
    permissionRef.current = p;
    _setMicPermission(p);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const now = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  /* ── submitCommand: multi-agent pipeline ──────────────────────────────── */
  const submitCommand = useCallback(async (text: string) => {
    if (!text.trim() || phaseRef.current === 'processing' || phaseRef.current === 'speaking') return;

    phaseRef.current = 'processing';
    setState('processing');
    setTranscript(text);
    setLlmError(null);

    /* Add user message to conversation */
    addMessage({ role: 'user', text: text.trim(), time: now() });

    let spokenResponse = '';
    let respondingAgent: AgentId = 'core';

    try {
      const result = await processRequest(
        text,
        historyRef.current,
        {
          onAck: (ack) => {
            /* Speak acknowledgment immediately while agent works */
            spokenResponse = ack;
            setAiResponse(ack);
            setState('speaking');
            phaseRef.current = 'speaking';
            speak(ack).then(() => {
              setState('executing');
              phaseRef.current = 'processing';
            });
          },

          onAgentStart: (agentId, taskName, taskId) => {
            respondingAgent = agentId;
            setActiveAgent(agentId);
            setState('executing');
            addTask({
              id: taskId,
              name: taskName,
              steps: 8,
              currentStep: 1,
              status: 'running',
              agentId,
              description: 'Starting…',
              startedAt: Date.now(),
            });
          },

          onAgentProgress: (taskId, step, total, label) => {
            updateTask(taskId, {
              currentStep: step,
              steps: total,
              ...(label ? { description: label } : {}),
            });
          },

          onAgentComplete: (taskId, output) => {
            updateTask(taskId, {
              currentStep: 4,
              steps: 4,
              status: 'completed',
              output,
            });
            setActiveAgent(null);
          },

          onDirectResponse: (response) => {
            respondingAgent = 'core';
            spokenResponse = response;
          },
        },
      );

      /* Update history for context */
      historyRef.current = [
        ...historyRef.current.slice(-8),
        { role: 'user', content: text },
        { role: 'assistant', content: result.response },
      ];

      /* Add full agent output to conversation (if agent was used) */
      if (result.fullOutput && result.agentId !== 'core') {
        addMessage({
          role: 'jarvis',
          text: result.fullOutput,
          time: now(),
          agentId: result.agentId,
          fullOutput: result.fullOutput,
        });
      }

      /* Add JARVIS spoken synthesis to conversation */
      addMessage({
        role: 'jarvis',
        text: result.response,
        time: now(),
        agentId: result.agentId,
      });

      setAiResponse(result.response);
      phaseRef.current = 'speaking';
      setState('speaking');

      /* Only speak synthesis if ack was already spoken for agent tasks */
      if (result.agentId === 'core') {
        await speak(result.response);
      } else {
        /* Agent task — speak the synthesis summary */
        await speak(result.response);
      }

    } catch (err: any) {
      console.error('JARVIS error:', err);
      const cfg = loadLLMConfig();
      let errMsg = "Can't reach my AI core right now, sir.";

      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        errMsg = `Can't connect to ${cfg.baseUrl} — make sure your LLM is running.`;
      } else if (err?.message?.includes('LLM error')) {
        errMsg = `LLM returned an error — check your model name (${cfg.model}).`;
      } else if (err?.message?.includes('LLM unreachable')) {
        errMsg = `The AI core is offline. Check that ${cfg.baseUrl} is running.`;
      }

      setLlmError(errMsg);
      setAiResponse(errMsg);
      addMessage({ role: 'jarvis', text: errMsg, time: now(), agentId: 'core' });
      setState('speaking');
      phaseRef.current = 'speaking';
      await speakBrowser(errMsg);
    } finally {
      setActiveAgent(null);
      phaseRef.current = 'passive';
      setState('idle');
      setTranscript('');
      setIsActive(false);
    }
  }, [setState, setTranscript, setAiResponse, setActiveAgent, addTask, updateTask, addMessage]);

  const startActiveListening = useCallback(() => {
    phaseRef.current = 'listening';
    setState('listening');
    setIsActive(true);
    interimRef.current = '';
  }, [setState]);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter(d => d.kind === 'audioinput' && d.deviceId);
      setAudioDevices(inputs);
      if (inputs.length > 0) {
        setSelectedDeviceId(prev => prev || inputs.find(d => d.deviceId === 'default')?.deviceId || inputs[0].deviceId);
      }
    } catch { /* ignore */ }
  }, []);

  const requestPermission = useCallback(async (deviceId?: string) => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setMicPermission('granted');
      await refreshDevices();
    } catch (err) {
      console.warn('Mic permission denied:', err);
      setMicPermission('denied');
    }
  }, [setMicPermission, refreshDevices]);

  const doRestartRecognition = useCallback((rec: any) => {
    if (permissionRef.current !== 'granted') return;
    if (isRestartingRef.current) return;
    isRestartingRef.current = true;
    setTimeout(() => {
      isRestartingRef.current = false;
      if (permissionRef.current !== 'granted') return;
      try {
        rec.start();
        lastEventMsRef.current = Date.now();
        restartDelayRef.current = Math.min(restartDelayRef.current * 1.5, 3000);
      } catch {
        restartDelayRef.current = 200;
        lastEventMsRef.current = Date.now();
      }
    }, restartDelayRef.current);
  }, []);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart     = () => { lastEventMsRef.current = Date.now(); restartDelayRef.current = 200; };
    rec.onspeechstart = () => { lastEventMsRef.current = Date.now(); };

    rec.onresult = (event: any) => {
      lastEventMsRef.current = Date.now();
      let interim = '', finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript.trim() + ' ';
        else interim += r[0].transcript.toLowerCase().trim();
      }
      const combined = (interimRef.current + ' ' + interim + ' ' + finalText).toLowerCase().trim();

      if (phaseRef.current === 'passive') {
        if (WAKE_PHRASES.some(p => combined.includes(p))) { startActiveListening(); interimRef.current = ''; }
        return;
      }

      if (phaseRef.current === 'listening' && finalText) {
        let cmd = finalText.trim();
        for (const p of WAKE_PHRASES) {
          const idx = cmd.toLowerCase().indexOf(p);
          if (idx !== -1) cmd = cmd.slice(idx + p.length).trim();
        }
        interimRef.current = cmd;
        setTranscript(cmd);
        clearSilenceTimer();
        if (cmd) {
          silenceTimerRef.current = setTimeout(() => {
            const c = interimRef.current.trim();
            interimRef.current = '';
            if (c) submitCommand(c);
          }, SILENCE_MS);
        }
      }
    };

    rec.onerror = (event: any) => {
      lastEventMsRef.current = Date.now();
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicPermission('denied'); recognitionRef.current = null; return;
      }
      if (event.error === 'network') restartDelayRef.current = 2000;
    };

    rec.onend = () => {
      lastEventMsRef.current = Date.now();
      if (permissionRef.current !== 'granted') return;
      if (phaseRef.current !== 'processing' && phaseRef.current !== 'speaking') {
        doRestartRecognition(rec);
      } else {
        const check = setInterval(() => {
          if (permissionRef.current !== 'granted') { clearInterval(check); return; }
          if (phaseRef.current === 'passive') { clearInterval(check); doRestartRecognition(rec); }
        }, 300);
      }
    };

    recognitionRef.current = rec;
    lastEventMsRef.current = Date.now();
    try { rec.start(); } catch { /* ignore */ }

    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (permissionRef.current !== 'granted') return;
      if (phaseRef.current === 'processing' || phaseRef.current === 'speaking') return;
      if (!recognitionRef.current) return;
      if (Date.now() - lastEventMsRef.current > WATCHDOG_STALE_MS) {
        lastEventMsRef.current = Date.now();
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      }
    }, WATCHDOG_INTERVAL_MS);
  }, [startActiveListening, submitCommand, setTranscript, clearSilenceTimer, setMicPermission, doRestartRecognition]);

  useEffect(() => {
    if (micPermission === 'granted' && speechSupported) startRecognition();
  }, [micPermission, speechSupported, startRecognition]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [clearSilenceTimer]);

  const manualSubmit = useCallback((text: string) => {
    if (text.trim()) submitCommand(text);
  }, [submitCommand]);

  const cancelListening = useCallback(() => {
    clearSilenceTimer();
    interimRef.current = '';
    phaseRef.current = 'passive';
    setState('idle');
    setIsActive(false);
    setTranscript('');
  }, [setState, setTranscript, clearSilenceTimer]);

  return {
    speechSupported, micPermission, audioDevices, selectedDeviceId, setSelectedDeviceId,
    requestPermission, isActive, manualSubmit, cancelListening, llmError,
  };
}
