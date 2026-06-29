import { useReducer, useRef, useEffect, ReactNode } from 'react';
import {
  JarvisContext, jarvisReducer, initialState, buildStoreAPI,
  type Task, type ConfirmationRequest, type FileDiff,
} from './jarvisStore';

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(jarvisReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);

  const api = buildStoreAPI(state, dispatch, wsRef);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 2000;
    // Track the active ws instance so stale callbacks from closed sockets are ignored
    let activeWs: WebSocket | null = null;

    function connect() {
      if (activeWs && (activeWs.readyState === WebSocket.CONNECTING || activeWs.readyState === WebSocket.OPEN)) {
        return; // already have a live socket
      }
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/api/ws`;
      const ws = new WebSocket(url);
      activeWs = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        if (ws !== activeWs) return;
        dispatch({ type: 'SET_CONNECTED', payload: true });
        reconnectDelay = 2000;
      };

      ws.onmessage = (event) => {
        if (ws !== activeWs) return;
        try {
          const data = JSON.parse(event.data as string);
          switch (data.type) {
            case 'STATE_CHANGE':
              dispatch({ type: 'SET_STATE', payload: data.state });
              break;
            case 'TASK_ADD':
              dispatch({ type: 'ADD_TASK', payload: data.task as Task });
              break;
            case 'TASK_UPDATE':
              dispatch({ type: 'UPDATE_TASK', id: data.taskId, updates: data.updates });
              break;
            case 'TRANSCRIPT':
              dispatch({ type: 'SET_TRANSCRIPT', payload: data.text });
              break;
            case 'AI_RESPONSE':
              dispatch({ type: 'SET_AI_RESPONSE', payload: data.text });
              break;
            case 'SYSTEM_METRICS':
              dispatch({ type: 'PUSH_CPU', payload: Number(data.cpu) });
              dispatch({ type: 'PUSH_MEMORY', payload: Number(data.memory) });
              break;
            case 'CONFIRMATION_REQUIRED':
              dispatch({ type: 'SET_CONFIRMATION', payload: { id: data.id, action: data.action, details: data.details } as ConfirmationRequest });
              break;
            case 'FILE_DIFF_PREVIEW':
              dispatch({ type: 'SET_FILE_DIFF', payload: { id: data.id, path: data.path, before: data.before, after: data.after } as FileDiff });
              break;
            default:
              break;
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => {
        if (ws !== activeWs) return;
        ws.close();
      };

      ws.onclose = () => {
        if (ws !== activeWs) return;
        activeWs = null;
        wsRef.current = null;
        dispatch({ type: 'SET_CONNECTED', payload: false });
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
          connect();
        }, reconnectDelay);
      };
    }

    connect();

    return () => {
      // Invalidate the active ws so its callbacks are ignored
      const dying = activeWs;
      activeWs = null;
      wsRef.current = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (dying) dying.close();
    };
  }, []);

  return (
    <JarvisContext.Provider value={api}>
      {children}
    </JarvisContext.Provider>
  );
}
