import { useState, useCallback, useEffect, useRef } from 'react';
import { useJarvisStore } from '../store/jarvisStore';

export function useVoiceSpeech(onFinalTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const { setState } = useJarvisStore();
  const pendingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setState('listening');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      if (event.results[0].isFinal) {
        pendingRef.current = true;
        onFinalTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setState('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (pendingRef.current) {
        setState('processing');
        pendingRef.current = false;
      } else {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
  }, [onFinalTranscript, setState]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try { recognitionRef.current.start(); } catch { /* already started */ }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { isListening, startListening, stopListening, isSupported };
}
